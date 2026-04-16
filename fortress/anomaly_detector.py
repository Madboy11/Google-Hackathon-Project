import numpy as np
from sklearn.ensemble import IsolationForest

class AnomalyDetector:
    def __init__(self):
        # Isolation forest designed to flag top 5% most anomalous API requests
        self.detector = IsolationForest(contamination=0.05, random_state=42)
        self.is_trained = False

    def train(self, baseline_data):
        """
        baseline_data: numpy array of shape (n_samples, n_features)
        Features could be [request_frequency_per_sec, payload_size_bytes]
        """
        self.detector.fit(baseline_data)
        self.is_trained = True

    def predict(self, new_requests):
        """
        Returns array of 1 (normal) and -1 (anomaly)
        """
        if not self.is_trained:
            raise ValueError("Detector must be trained prior to prediction.")
        predictions = self.detector.predict(new_requests)
        # Log to nexus.security.alerts for -1
        anomalies = np.where(predictions == -1)[0]
        if len(anomalies) > 0:
            print(f"Alert! Found {len(anomalies)} anomalous requests.")
        return predictions
