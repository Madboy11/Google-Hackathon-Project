import random
import os
import logging
from .kafka_pub import oracle_publisher

logger = logging.getLogger(__name__)

class OracleEngine:
    def __init__(self):
        self.device = None
        self.model = None
        self.model_loaded = False
        
        # In a real environment, we would also initialize a Kafka Consumer here 
        # to subscribe to 'nexus.telemetry.raw' and build sliding sequence windows.
        
        self.attempt_load_model()

    def attempt_load_model(self):
        try:
            import torch
            from .models.lstm_model import DemandLSTM
            
            self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
            model_path = os.path.join(os.path.dirname(__file__), 'models/weights/lstm.pth')
            
            if os.path.exists(model_path):
                self.model = DemandLSTM(input_size=10, hidden_size=128, num_layers=2).to(self.device)
                self.model.load_state_dict(torch.load(model_path, map_location=self.device))
                self.model.eval()
                self.model_loaded = True
                logger.info(f"ORACLE: Successfully loaded LSTM weights from {model_path} onto {self.device}!")
            else:
                logger.warning("ORACLE: Weights not found. Running in heuristic simulation mode.")
        except ImportError:
            logger.warning("ORACLE: PyTorch not installed. Running in heuristic simulation mode.")
            self.model_loaded = False

    def score(self, node_id: str, time_horizon: str = "72h") -> float:
        """
        Calculates a risk score for a given node.
        If PyTorch weights exist, relies on the GPU inference. Else, heuristic fallback.
        """
        if self.model_loaded:
            import torch
            # Build a mock sequenced input array simulating the last 24 hours of telemetry for this node
            # Shape: (Batch=1, Seq=24, Features=10)
            mock_tensor = torch.randn(1, 24, 10).to(self.device)
            
            # Scenario injection to affect inference
            if "red_sea" in node_id.lower() or "suez" in node_id.lower():
                # Spike the geopolitical and congestion features in the sequence
                mock_tensor[:, :, 3] = 0.95
                mock_tensor[:, :, 4] = 0.99
                
            with torch.no_grad():
                final_score = self.model(mock_tensor).item()
                
            logger.info(f"ORACLE Inference [{self.device}] generated score: {final_score:.3f}")
        else:
            # Fallback heuristic calculation
            base_risk = random.uniform(0.1, 0.4)
            if "red_sea" in node_id.lower() or "suez" in node_id.lower():
                final_score = min(1.0, random.uniform(0.85, 0.99))
            else:
                final_score = min(1.0, base_risk)
            
        # Emit to Kafka
        oracle_publisher.publish_risk_score(node_id, final_score, time_horizon)
        
        return final_score

oracle_engine = OracleEngine()
