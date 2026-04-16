try:
    import torch
    import torch.nn as nn
    BaseModule = nn.Module
except ImportError:
    class BaseModule:
        def __init__(self): pass

class SafetyStockNet(BaseModule):
    def __init__(self):
        super().__init__()
        try:
            self.net = nn.Sequential(
                nn.Linear(8, 64), 
                nn.ReLU(),
                nn.Linear(64, 32), 
                nn.ReLU(),
                nn.Linear(32, 1)   # Output: recommended safety stock units
            )
        except NameError:
            self.net = None
    
    def forward(self, x):
        return self.net(x)

    def predict(self, sku_id: str, risk_score: float) -> int:
        """
        Mock predict functionality for inference.
        """
        # A mocked behavior: high risk -> higher safety stock (multiplier)
        base_stock = 100
        multiplier = 1.0 + (risk_score * 0.5)
        return int(base_stock * multiplier)

# Global instance for quick access
ss_net = SafetyStockNet()
