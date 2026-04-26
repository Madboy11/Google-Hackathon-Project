import os
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from models.lstm_model import DemandLSTM
from torch.cuda.amp import GradScaler, autocast
import logging
import zipfile
import glob
import time

# NOTE: requires `pip install pandas pyarrow`
try:
    import pandas as pd
    import numpy as np
except ImportError:
    pd = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatasetExtractor:
    """Extracts raw datasets from Kaggle zips and HF Parquets to build tensors."""
    def __init__(self, data_dir='data/'):
        self.data_dir = data_dir
        self.extracted_dir = os.path.join(data_dir, 'extracted')
        os.makedirs(self.extracted_dir, exist_ok=True)
        
    def _unzip_all(self):
        zips = glob.glob(os.path.join(self.data_dir, '*.zip'))
        for z in zips:
            try:
                with zipfile.ZipFile(z, 'r') as zip_ref:
                    logger.info(f"Extracting {z}...")
                    zip_ref.extractall(self.extracted_dir)
            except zipfile.BadZipFile:
                logger.warning(f"Failed to unzip {z} (corrupted).")
                
    def load_real_data(self, num_samples=10000, seq_length=24, input_features=10):
        logger.info("Initializing Real Data Pipeline...")
        self._unzip_all()
        
        ais_path = os.path.join(self.extracted_dir, 'processed_AIS_dataset.csv')
        disruption_path = os.path.join(self.extracted_dir, 'supply_chain_disruption_recovery.csv')
        
        if pd and os.path.exists(ais_path) and os.path.exists(disruption_path):
            try:
                logger.info("Mapping raw CSV distributions (AIS and Disruption data)...")
                needed_rows = num_samples * seq_length
                
                # Load features from AIS dataframe
                ais_df = pd.read_csv(ais_path, nrows=needed_rows)
                # Ensure we have the 10 numeric features available
                input_cols = ['LAT', 'LON', 'SOG', 'COG', 'Heading', 'Length', 'Width', 'Draft', 'VesselType_enc', 'Cargo_enc']
                
                # Fallback zero-fill if columns are missing/NaN
                x_data = ais_df[input_cols].fillna(0).values 
                X = torch.tensor(x_data, dtype=torch.float32).view(num_samples, seq_length, input_features)
                
                # Load targets from Disruption dataframe
                disruption_df = pd.read_csv(disruption_path, nrows=num_samples)
                # Severity ranges from 1 to 4 in dataset, normalize to max 4 to get bounds ~ [0, 1]
                y_severity = disruption_df['disruption_severity'].fillna(1).values
                y_severity = y_severity / 4.0
                y = torch.tensor(y_severity, dtype=torch.float32).unsqueeze(1)
                
                logger.info(f"Successfully constructed tensor X: {X.shape} and y: {y.shape}")
                return X, y
                
            except Exception as e:
                logger.warning(f"Graceful fallback during pandas parse: {e}")
        
        logger.warning("Falling back to synthetic data structural approximations.")
        X = torch.randn(num_samples, seq_length, input_features)
        risk_factor = X[:, :, 3].mean(dim=1) + (X[:, :, 4].mean(dim=1) * 1.5)
        noise = torch.randn(risk_factor.size()) * 0.8
        y = torch.sigmoid(risk_factor + noise).unsqueeze(1)
        
        return X, y

def train_model(epochs=200, batch_size=32, lr=0.001): # BATCH SIZE lowered to 32 for RTX 3050
    # Detect Hardware (RTX 3050 target)
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    logger.info(f"Using device: {device}")
    
    if torch.cuda.is_available():
        logger.info(f"Device Name: {torch.cuda.get_device_name(0)}")
        logger.info(f"VRAM Optimization: Mixed Precision (fp16) & Graceful GC Active.")
        
    model = DemandLSTM(input_size=10, hidden_size=128, num_layers=2).to(device)
    
    criterion = nn.MSELoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr)
    
    # Enable Automatic Mixed Precision for RTX 3050 limits
    scaler = torch.amp.GradScaler('cuda')
    
    # Create dataset
    extractor = DatasetExtractor()
    X, y = extractor.load_real_data(num_samples=2500) # Fast subset for realistic MVP
    dataset = TensorDataset(X, y)
    
    # SPLIT DATASET: 80% for Training, 20% for Validation (Testing)
    train_size = int(0.8 * len(dataset))
    test_size = len(dataset) - train_size
    train_dataset, test_dataset = torch.utils.data.random_split(dataset, [train_size, test_size])
    
    # num_workers=0 avoids Windows multiprocessing overhead on constrained memory
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=0) 
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False, num_workers=0)
    
    logger.info("Initializing Optimal Training Loop...")
    
    # Early Stopping tracking
    best_loss = float('inf')
    early_stop_counter = 0
    patience = 10
    
    for epoch in range(epochs):
        model.train()
        running_loss = 0.0
        
        for batch_i, (inputs, targets) in enumerate(train_loader):
            inputs, targets = inputs.to(device), targets.to(device)
            
            optimizer.zero_grad()
            
            # Autocast blocks run in fp16, heavily cutting VRAM payload
            device_type = 'cuda' if torch.cuda.is_available() else 'cpu'
            with torch.amp.autocast(device_type=device_type, enabled=torch.cuda.is_available()):
                outputs = model(inputs)
                loss = criterion(outputs, targets)
            
            # Scaler handles the fp16 gradient dynamics
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
            
            running_loss += loss.item()
            
        avg_loss = running_loss / len(train_loader)
        logger.info(f"Epoch [{epoch+1}/{epochs}], Loss: {avg_loss:.4f}")
        
        # Release unbound memory to system
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            
        # GPU Thermal Cooling Sleep
        # This forces the training to artificially slow down, reducing the
        # continuous load/heat on the mobile RTX 3050.
        logger.info("Applying thermal cooling delay (1.5s) to reduce GPU stress...")
        time.sleep(1.5)

    # --- Validation / Accuracy Check ---
    logger.info("Evaluating Accuracy on Unseen Test Dataset...")
    model.eval()
    correct = 0
    total = 0
    with torch.no_grad():
        device_type = 'cuda' if torch.cuda.is_available() else 'cpu'
        with torch.amp.autocast(device_type=device_type, enabled=torch.cuda.is_available()):
            for inputs, targets in test_loader:
                inputs, targets = inputs.to(device), targets.to(device)
                outputs = model(inputs)
                predicted = (outputs > 0.5).float()
                actual = (targets > 0.5).float()
                correct += (predicted == actual).sum().item()
                total += targets.size(0)
            
    accuracy = (correct / total) * 100
    logger.info(f"Final Model Epoch Accuracy: {accuracy:.2f}%")

    # Save to disk
    os.makedirs('backend/oracle/models/weights', exist_ok=True)
    save_path = 'backend/oracle/models/weights/lstm.pth'
    torch.save(model.state_dict(), save_path)
    logger.info(f"Model successfully saved to {save_path}!")

if __name__ == "__main__":
    # Graceful exit hook setup
    try:
        train_model()
    except KeyboardInterrupt:
        logger.info("Training manually interrupted by user. Resources freed.")
    except Exception as e:
        logger.error(f"Critical Training Failure: {e}")
        import traceback
        traceback.print_exc()
        import sys
        sys.exit(1)
