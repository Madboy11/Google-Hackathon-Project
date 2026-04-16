import random
import logging
import json

logger = logging.getLogger(__name__)

class NavigatorEngine:
    def __init__(self):
        self.active_routes = [
            {"vessel_id": "IMO-100200", "status": "on_time", "current_action": "maintain"},
            {"vessel_id": "IMO-300400", "status": "delayed", "current_action": "slow_down"},
        ]
        self.bootstrap_kafka()

    def bootstrap_kafka(self):
        try:
            from kafka import KafkaProducer
            self.producer = KafkaProducer(
                bootstrap_servers='localhost:9092',
                value_serializer=lambda v: json.dumps(v).encode('utf-8')
            )
            self.connected = True
        except ImportError:
            logger.warning("kafka-python not installed, mocking KafkaProducer for Navigator")
            self.connected = False
        except Exception as e:
            logger.warning(f"Failed to connect to Kafka at localhost:9092 for Navigator: {e}")
            self.connected = False

    def get_active_routes(self):
        return self.active_routes

    def apply_override(self, vessel_id: str, action: str):
        for route in self.active_routes:
            if route["vessel_id"] == vessel_id:
                route["current_action"] = action
                return {"status": "success", "UpdatedRoute": route}
        
        new_route = {"vessel_id": vessel_id, "status": "overridden", "current_action": action}
        self.active_routes.append(new_route)
        return {"status": "success", "NewRoute": new_route}

    def process_risk_score(self, node_id: str, risk_score: float):
        """
        Triggered when a new risk score arrives. If > 0.7, reroutes.
        """
        if risk_score > 0.7:
            logger.info(f"High risk ({risk_score}) detected at {node_id}. Triggering RL Re-evaluation.")
            # Trigger PPO agent (mocked)
            action = "divert_port_A" if random.random() > 0.5 else "divert_port_B"
            
            payload = {
              "vessel_id": f"IMO-{random.randint(1000000, 9999999)}",
              "action": action,
              "cost_delta_usd": round(random.uniform(5000, 20000), 2),
              "delay_delta_hours": round(random.uniform(12, 48), 1),
              "carbon_delta_tonnes": round(random.uniform(-5.0, 5.0), 2),
              "confidence": round(random.uniform(0.75, 0.99), 2)
            }
            
            if self.connected:
                self.producer.send("nexus.routing.orders", value=payload)
                self.producer.flush()
            else:
                logger.info(f"[MOCK] Publish topic 'nexus.routing.orders': {payload}")

navigator_engine = NavigatorEngine()
