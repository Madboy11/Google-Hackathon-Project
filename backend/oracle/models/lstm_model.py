try:
    import torch
    import torch.nn as nn
    BaseModule = nn.Module
except ImportError:
    class BaseModule:
        def __init__(self): pass

class DemandLSTM(BaseModule):
    def __init__(self, input_size=10, hidden_size=64, num_layers=2, output_size=1):
        super().__init__()
        try:
            self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
            self.fc = nn.Linear(hidden_size, output_size)
        except NameError:
            pass


    def forward(self, x):
        out, _ = self.lstm(x)
        return self.fc(out[:, -1, :])
