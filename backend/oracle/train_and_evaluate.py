"""
NEXUS-SC Oracle: Advanced Training + Scenario Evaluation + Performance Analysis
Features: [0:Wind, 1:Waves, 2:Rain, 3:Congestion, 4:Geopolitics, 5:Fuel, 6:Conflict, 7:Carrier, 8:Tariff, 9:Sentiment]
"""
import os, sys, json, time
import torch
import torch.nn as nn
import numpy as np
from torch.utils.data import DataLoader, TensorDataset
from sklearn.metrics import (mean_squared_error, mean_absolute_error,
                             precision_score, recall_score, f1_score,
                             confusion_matrix, roc_auc_score)

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
from backend.oracle.models.lstm_model import DemandLSTM

FEATURE_NAMES = ["Wind Speed", "Wave Height", "Rain Volume", "Port Congestion",
                 "Geopolitical Risk", "Fuel Price Index", "Piracy/Conflict",
                 "Carrier Reliability", "Tariff Pressure", "Market Sentiment"]

# --- Realistic Synthetic Data Generator ---
def generate_realistic_data(num_samples=20000, seq_length=24, seed=42):
    torch.manual_seed(seed)
    np.random.seed(seed)
    X = torch.zeros(num_samples, seq_length, 10)

    for i in range(num_samples):
        # Base profiles with temporal correlation (random walk)
        for f in range(10):
            base = np.random.uniform(0.1, 0.5)
            vals = [base]
            for t in range(1, seq_length):
                vals.append(np.clip(vals[-1] + np.random.normal(0, 0.05), 0, 1))
            X[i, :, f] = torch.tensor(vals, dtype=torch.float32)

        # Inject correlated patterns
        scenario = np.random.choice(['calm', 'storm', 'crisis', 'congested', 'mixed'], p=[0.3, 0.15, 0.15, 0.2, 0.2])
        if scenario == 'storm':
            X[i, :, 0] = torch.clamp(X[i, :, 0] + 0.4, 0, 1)  # high wind
            X[i, :, 1] = torch.clamp(X[i, :, 1] + 0.5, 0, 1)  # high waves
            X[i, :, 2] = torch.clamp(X[i, :, 2] + 0.3, 0, 1)  # rain
        elif scenario == 'crisis':
            X[i, :, 4] = torch.clamp(X[i, :, 4] + 0.5, 0, 1)  # geopolitical
            X[i, :, 6] = torch.clamp(X[i, :, 6] + 0.4, 0, 1)  # conflict
            X[i, :, 9] = torch.clamp(X[i, :, 9] - 0.3, 0, 1)  # sentiment drops
        elif scenario == 'congested':
            X[i, :, 3] = torch.clamp(X[i, :, 3] + 0.4, 0, 1)  # congestion
            X[i, :, 8] = torch.clamp(X[i, :, 8] + 0.2, 0, 1)  # tariff
        elif scenario == 'mixed':
            X[i, :, 3] = torch.clamp(X[i, :, 3] + 0.3, 0, 1)
            X[i, :, 4] = torch.clamp(X[i, :, 4] + 0.3, 0, 1)
            X[i, :, 0] = torch.clamp(X[i, :, 0] + 0.2, 0, 1)

    # Multi-factor risk label
    w = X[:, :, 0].mean(dim=1)   # wind
    wv = X[:, :, 1].mean(dim=1)  # waves
    c = X[:, :, 3].mean(dim=1)   # congestion
    g = X[:, :, 4].mean(dim=1)   # geopolitics
    cf = X[:, :, 6].mean(dim=1)  # conflict
    s = X[:, :, 9].mean(dim=1)   # sentiment (inverse)

    risk = 0.15*w + 0.10*wv + 0.25*c + 0.25*g + 0.15*cf + 0.10*(1-s)
    y = torch.sigmoid((risk - 0.4) * 8).unsqueeze(1)  # sharper decision boundary
    return X, y


# --- Scenario Builder ---
def build_scenarios(seq_length=24):
    scenarios = {}

    def make(name, overrides):
        x = torch.rand(1, seq_length, 10) * 0.3 + 0.1  # calm baseline
        for feat_idx, val in overrides.items():
            x[0, :, feat_idx] = val
        scenarios[name] = x

    make("Calm Seas - Normal Operations",       {0:0.1, 1:0.1, 2:0.0, 3:0.15, 4:0.1, 6:0.05, 9:0.8})
    make("Moderate Weather",                    {0:0.4, 1:0.35, 2:0.3, 3:0.2, 4:0.1, 6:0.05, 9:0.6})
    make("Severe Tropical Storm",               {0:0.9, 1:0.85, 2:0.8, 3:0.5, 4:0.1, 6:0.1, 9:0.3})
    make("Red Sea Crisis (Houthi Attacks)",      {0:0.3, 1:0.3, 2:0.1, 3:0.7, 4:0.95, 6:0.9, 9:0.1})
    make("Suez Canal Blockage",                  {0:0.2, 1:0.2, 2:0.0, 3:0.98, 4:0.7, 6:0.3, 9:0.15})
    make("Port Congestion (Shanghai)",           {0:0.15, 1:0.1, 2:0.1, 3:0.9, 4:0.2, 6:0.05, 8:0.6, 9:0.4})
    make("Geopolitical Sanctions (Russia)",      {0:0.2, 1:0.15, 2:0.1, 3:0.4, 4:0.85, 6:0.6, 8:0.8, 9:0.2})
    make("Piracy Risk (Gulf of Aden)",           {0:0.3, 1:0.25, 2:0.05, 3:0.3, 4:0.6, 6:0.85, 9:0.25})
    make("Fuel Crisis + Tariff Spike",           {0:0.2, 1:0.15, 2:0.1, 3:0.4, 5:0.9, 8:0.9, 9:0.3})
    make("Multi-Factor Catastrophe",             {0:0.8, 1:0.7, 2:0.6, 3:0.9, 4:0.9, 6:0.8, 5:0.85, 8:0.7, 9:0.05})
    make("COVID-era Supply Chain Shock",         {0:0.15, 1:0.1, 2:0.1, 3:0.85, 4:0.5, 6:0.2, 7:0.3, 8:0.5, 9:0.2})
    make("Optimal Conditions (Best Case)",       {0:0.05, 1:0.05, 2:0.0, 3:0.05, 4:0.05, 6:0.02, 5:0.2, 7:0.9, 8:0.1, 9:0.95})
    return scenarios


# --- Main ---
def main():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print("=" * 70)
    print("       NEXUS-SC ORACLE: ADVANCED TRAINING & EVALUATION")
    print("=" * 70)
    print(f"  Device : {device}" + (f" ({torch.cuda.get_device_name(0)})" if torch.cuda.is_available() else ""))

    # --- Phase 1: Generate Data ---
    print("\n[PHASE 1] Generating realistic training data...")
    X_all, y_all = generate_realistic_data(num_samples=20000)
    split = int(0.8 * len(X_all))
    X_train, y_train = X_all[:split], y_all[:split]
    X_test, y_test = X_all[split:], y_all[split:]
    print(f"  Train: {len(X_train)} samples | Test: {len(X_test)} samples")
    print(f"  Label distribution — High-risk (>0.5): {(y_all > 0.5).float().mean()*100:.1f}%")

    train_loader = DataLoader(TensorDataset(X_train, y_train), batch_size=128, shuffle=True)
    test_loader = DataLoader(TensorDataset(X_test, y_test), batch_size=256)

    # --- Phase 2: Train ---
    print(f"\n[PHASE 2] Training LSTM (200 epochs, lr=0.001, AdamW + ReduceLROnPlateau)...")
    model = DemandLSTM(input_size=10, hidden_size=128, num_layers=2).to(device)
    criterion = nn.MSELoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=0.001, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=3, factor=0.5)

    train_losses, test_losses = [], []
    start_time = time.time()

    for epoch in range(200):
        model.train()
        running = 0.0
        for inputs, targets in train_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            running += loss.item()
        train_loss = running / len(train_loader)
        train_losses.append(train_loss)

        # Validation
        model.eval()
        val_running = 0.0
        with torch.no_grad():
            for inputs, targets in test_loader:
                inputs, targets = inputs.to(device), targets.to(device)
                val_running += criterion(model(inputs), targets).item()
        val_loss = val_running / len(test_loader)
        test_losses.append(val_loss)
        scheduler.step(val_loss)

        lr = optimizer.param_groups[0]['lr']
        print(f"  Epoch [{epoch+1:3d}/200]  Train Loss: {train_loss:.6f}  Val Loss: {val_loss:.6f}  LR: {lr:.6f}")

    elapsed = time.time() - start_time
    print(f"\n  Training completed in {elapsed:.1f}s")

    # Save model
    os.makedirs('backend/oracle/models/weights', exist_ok=True)
    save_path = 'backend/oracle/models/weights/lstm.pth'
    torch.save(model.state_dict(), save_path)
    print(f"  Model saved to {save_path}")

    # --- Phase 3: Test Set Metrics ---
    print(f"\n[PHASE 3] Test Set Performance Metrics")
    print("-" * 70)
    model.eval()
    all_preds, all_targets = [], []
    with torch.no_grad():
        for inputs, targets in test_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            preds = model(inputs)
            all_preds.append(preds.cpu())
            all_targets.append(targets.cpu())

    all_preds = torch.cat(all_preds).numpy().flatten()
    all_targets = torch.cat(all_targets).numpy().flatten()
    pred_binary = (all_preds > 0.5).astype(int)
    true_binary = (all_targets > 0.5).astype(int)

    mse = mean_squared_error(all_targets, all_preds)
    mae = mean_absolute_error(all_targets, all_preds)
    rmse = np.sqrt(mse)
    acc = (pred_binary == true_binary).mean() * 100
    prec = precision_score(true_binary, pred_binary, zero_division=0) * 100
    rec = recall_score(true_binary, pred_binary, zero_division=0) * 100
    f1 = f1_score(true_binary, pred_binary, zero_division=0) * 100
    auc = roc_auc_score(true_binary, all_preds) * 100 if len(np.unique(true_binary)) > 1 else 0

    print(f"  MSE:        {mse:.6f}")
    print(f"  RMSE:       {rmse:.6f}")
    print(f"  MAE:        {mae:.6f}")
    print(f"  Accuracy:   {acc:.2f}%")
    print(f"  Precision:  {prec:.2f}%")
    print(f"  Recall:     {rec:.2f}%")
    print(f"  F1 Score:   {f1:.2f}%")
    print(f"  ROC AUC:    {auc:.2f}%")

    cm = confusion_matrix(true_binary, pred_binary)
    print(f"\n  Confusion Matrix:")
    print(f"                  Predicted LOW   Predicted HIGH")
    print(f"  Actual LOW       {cm[0][0]:>8d}       {cm[0][1]:>8d}")
    print(f"  Actual HIGH      {cm[1][0]:>8d}       {cm[1][1]:>8d}")

    # --- Phase 4: Scenario Testing ---
    print(f"\n[PHASE 4] Real-World Scenario Inference")
    print("=" * 70)
    scenarios = build_scenarios()

    results = {}
    for name, tensor in scenarios.items():
        tensor_dev = tensor.to(device)
        with torch.no_grad():
            score = model(tensor_dev).item()
        risk_level = "CRITICAL" if score > 0.8 else "HIGH" if score > 0.6 else "MEDIUM" if score > 0.4 else "LOW"
        bar = "#" * int(score * 30) + "-" * (30 - int(score * 30))
        print(f"\n  SCENARIO: {name}")
        print(f"     Risk Score: {score:.4f}  [{bar}]  {risk_level}")

        # Show dominant features
        means = tensor[0].mean(dim=0).numpy()
        top3 = np.argsort(means)[-3:][::-1]
        drivers = ", ".join([f"{FEATURE_NAMES[i]}={means[i]:.2f}" for i in top3])
        print(f"     Top Drivers: {drivers}")
        results[name] = {"score": score, "level": risk_level, "drivers": {FEATURE_NAMES[i]: float(means[i]) for i in top3}}

    # --- Phase 5: Summary ---
    print(f"\n{'=' * 70}")
    print("  PERFORMANCE SUMMARY")
    print(f"{'=' * 70}")
    print(f"  Model Accuracy:  {acc:.2f}%   |  F1: {f1:.2f}%   |  AUC: {auc:.2f}%")
    print(f"  Train Loss:      {train_losses[-1]:.6f}  (started at {train_losses[0]:.6f})")
    print(f"  Val Loss:        {test_losses[-1]:.6f}  (started at {test_losses[0]:.6f})")

    sorted_scenarios = sorted(results.items(), key=lambda x: x[1]['score'], reverse=True)
    print(f"\n  Risk Ranking (High -> Low):")
    for i, (name, r) in enumerate(sorted_scenarios, 1):
        print(f"    {i:2d}. [{r['level']:>8s}] {r['score']:.4f}  {name}")

    status = "EXCELLENT" if acc > 95 else "GOOD" if acc > 85 else "ACCEPTABLE" if acc > 75 else "NEEDS IMPROVEMENT"
    print(f"\n  Overall Verdict: {status}")
    print(f"{'=' * 70}")

    # Save results JSON
    report = {
        "metrics": {
            "mse": float(mse), "rmse": float(rmse), "mae": float(mae), 
            "accuracy": float(acc), "precision": float(prec), 
            "recall": float(rec), "f1": float(f1), "auc": float(auc)
        },
        "training": {
            "epochs": 200, 
            "final_train_loss": float(train_losses[-1]), 
            "final_val_loss": float(test_losses[-1]), 
            "time_seconds": float(elapsed)
        },
        "scenarios": results, 
        "verdict": status
    }
    report_path = "backend/oracle/models/weights/evaluation_report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"  Report saved to {report_path}")

if __name__ == "__main__":
    main()
