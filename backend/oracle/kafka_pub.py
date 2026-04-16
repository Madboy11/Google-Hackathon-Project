import json
import logging

logger = logging.getLogger(__name__)

class OracleKafkaPublisher:
    def __init__(self, bootstrap_servers='localhost:9092'):
        try:
            from kafka import KafkaProducer
            self.producer = KafkaProducer(
                bootstrap_servers=bootstrap_servers,
                value_serializer=lambda v: json.dumps(v).encode('utf-8')
            )
            self.connected = True
        except ImportError:
            logger.warning("kafka-python not installed, mocking KafkaProducer")
            self.connected = False
        except Exception as e:
            logger.warning(f"Failed to connect to Kafka at {bootstrap_servers}: {e}")
            self.connected = False

    def publish_risk_score(self, node_id: str, score: float, time_horizon: str = "72h"):
        payload = {
            "node_id": node_id,
            "risk_score": score,
            "risk_type": "calculated_ensemble",
            "time_horizon": time_horizon
        }
        
        if not self.connected:
            logger.info(f"[MOCK] Publish topic 'nexus.risk.scores': {payload}")
            return
            
        self.producer.send("nexus.risk.scores", value=payload)
        self.producer.flush()

oracle_publisher = OracleKafkaPublisher()
