import random
import logging
import json

logger = logging.getLogger(__name__)

import os
import pandas as pd
from oracle.engine import oracle_engine

class NavigatorEngine:
    def __init__(self):
        self.simulation_mode = False
        self.active_routes = self._init_dynamic_routes()
        self.rerouted_routes = self._init_rerouted_routes()
        self.bootstrap_kafka()

    def set_simulation(self, active: bool):
        self.simulation_mode = active
        # Reset the rerouted origin states to repeat the animation 
        self.rerouted_routes = self._init_rerouted_routes()

    def _init_rerouted_routes(self):
        return [
            {"origin": [32.3, 30.0], "destination": [39.5, -6.1], "risk_score": 0.3, "route_id": "sim-suez-dar", "originLabel": "Suez Redirect", "destLabel": "Dar es Salaam", "vessel_id": "sim-1", "current_action": "reroute", "status": "diverted"},
            {"origin": [39.5, -6.1], "destination": [18.4, -33.9], "risk_score": 0.2, "route_id": "sim-dar-cape", "originLabel": "Dar es Salaam", "destLabel": "Cape Town", "vessel_id": "sim-2", "current_action": "reroute", "status": "diverted"},
            {"origin": [18.4, -33.9], "destination": [103.8, 1.35], "risk_score": 0.1, "route_id": "sim-cape-sgp", "originLabel": "Cape Town", "destLabel": "Singapore", "vessel_id": "sim-3", "current_action": "reroute", "status": "diverted"},
        ]

    def _init_dynamic_routes(self):
        try:
            # Load snippet into memory once
            file_path = os.path.join(os.path.dirname(__file__), '../../data/extracted/processed_AIS_dataset.csv')
            df = pd.read_csv(file_path, nrows=25000)
            
            # Select 5 unique active vessels going decently far
            active_df = df[df['Status_enc'] == 0].drop_duplicates(subset=['MMSI']).head(8)
            
            routes = []
            for _, row in active_df.iterrows():
                mmsi = str(row['MMSI'])
                risk = oracle_engine.score(mmsi)
                routes.append({
                    "origin": [float(row['LON']), float(row['LAT'])],
                    "destination": [float(row['dest_lon']), float(row['dest_lat'])],
                    "risk_score": risk,
                    "route_id": mmsi,
                    "originLabel": str(row['VesselName']),
                    "destLabel": f"Cluster {int(row['dest_cluster'])}",
                    "vessel_id": mmsi,
                    "current_action": "maintain" if risk < 0.7 else "slow_down",
                    "status": "on_time"
                })
            return routes
        except Exception as e:
            logger.error(f"Fallback! Could not map real routes: {e}")
            return [
                {"vessel_id": "IMO-100200", "origin": [32.3, 30.0], "destination": [43.1, 12.5]},
            ]

    def get_active_routes(self):
        target_routes = self.rerouted_routes if self.simulation_mode else self.active_routes
        # SIMULATE REAL-TIME MOVEMENT FOR LIVE DATA POLLING
        for route in target_routes:
            cur_lon, cur_lat = route["origin"]
            dst_lon, dst_lat = route["destination"]
            
            # Step size factor (moves 0.5% towards destination)
            route["origin"] = [
                cur_lon + (dst_lon - cur_lon) * 0.05,
                cur_lat + (dst_lat - cur_lat) * 0.05
            ]
        return target_routes

    def bootstrap_kafka(self):
        try:
            from kafka import KafkaProducer # type: ignore
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
