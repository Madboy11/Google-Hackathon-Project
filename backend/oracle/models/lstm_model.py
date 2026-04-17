import torch
import torch.nn as nn

class DemandLSTM(nn.Module):
    """
    An LSTM model that ingests sequential telemetry arrays of shape:
    (Batch_Size, Sequence_Length, Input_Features)
    
    Default Input Features (10):
    [0: Wind Speed, 1: Wave Height, 2: Rain Vol, 3: Port Congestion, 4: GDELT Sentiment, ...]
    """
    def __init__(self, input_size=10, hidden_size=128, num_layers=2, output_size=1, dropout=0.2):
        super(DemandLSTM, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        # Batch_first=True expects shape (batch, seq, feature)
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True, dropout=dropout if num_layers > 1 else 0)
        self.dropout = nn.Dropout(dropout)
        self.fc = nn.Linear(hidden_size, output_size)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        # x is expected to be [batch_size, sequence_length, input_size]
        out, _ = self.lstm(x)
        # Take the output from the last time step
        last_out = out[:, -1, :]
        last_out = self.dropout(last_out)
        out = self.fc(last_out)
        
        # Risk score is outputted between 0 and 1
        return self.sigmoid(out)

if __name__ == "__main__":
    # Smoke test dimensions locally
    model = DemandLSTM()
    dummy_input = torch.randn(32, 24, 10)  # 32 batch, 24 timestamps, 10 features
    out = model(dummy_input)
    print(f"Output shape: {out.shape}")  # Expected: [32, 1]
