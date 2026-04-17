import os
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from models.lstm_model import DemandLSTM
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def generate_synthetic_data(num_samples=10000, seq_length=24, input_features=10):
    """
    Generates dummy (X, Y) data resembling shipping telemetry.
    In production, this would be loaded from a pandas dataframe of historical data.
    """
    logger.info(f"Generating synthetic dataset: {num_samples} samples...")
    X = torch.randn(num_samples, seq_length, input_features)
    
    # Let's create a fake labeling rule. If the mean of feature 3 (congestion) and 
    # feature 4 (geopolitical risk) is high, risk = 1, else 0.
    risk_factor = X[:, :, 3].mean(dim=1) + (X[:, :, 4].mean(dim=1) * 1.5)
    
    # Normalize and apply sigmoid-like squish to keep target 0-1
    y = torch.sigmoid(risk_factor).unsqueeze(1)
    return X, y

def train_model(epochs=200, batch_size=128, lr=0.001):
    # Detect Hardware (NVIDIA A2000 target)
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    logger.info(f"Using device: {device}")
    
    if torch.cuda.is_available():
        logger.info(f"Device Name: {torch.cuda.get_device_name(0)}")
        
    model = DemandLSTM(input_size=10, hidden_size=128, num_layers=2).to(device)
    
    criterion = nn.MSELoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr)
    
    # Create dataset
    X, y = generate_synthetic_data()
    dataset = TensorDataset(X, y)
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
    
    logger.info("Initializing Training Loop...")
    for epoch in range(epochs):
        model.train()
        running_loss = 0.0
        
        for batch_i, (inputs, targets) in enumerate(dataloader):
            inputs, targets = inputs.to(device), targets.to(device)
            
            # Forward
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            
            # Backward
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item()
            
        avg_loss = running_loss / len(dataloader)
        logger.info(f"Epoch [{epoch+1}/{epochs}], Loss: {avg_loss:.4f}")

    # --- Validation / Accuracy Check ---
    logger.info("Evaluating Accuracy...")
    model.eval()
    correct = 0
    total = 0
    with torch.no_grad():
        for inputs, targets in dataloader:
            inputs, targets = inputs.to(device), targets.to(device)
            outputs = model(inputs)
            # Threshold at 0.5 for binary accuracy calculation
            predicted = (outputs > 0.5).float()
            actual = (targets > 0.5).float()
            correct += (predicted == actual).sum().item()
            total += targets.size(0)
            
    accuracy = (correct / total) * 100
    logger.info(f"Final Model Accuracy: {accuracy:.2f}% (Target: > 80.00%)")

    # Save to disk
    os.makedirs('backend/oracle/models/weights', exist_ok=True)
    save_path = 'backend/oracle/models/weights/lstm.pth'
    torch.save(model.state_dict(), save_path)
    logger.info(f"Model successfully saved to {save_path}!")

if __name__ == "__main__":
    train_model()
