import random
import time

def get_system_diagnostics():
    # In a fully deployed system, this would aggregate real Kafka broker latency,
    # buffer memory usage, and oracle model convergence states.
    # For the hackathon demo, we generate realistic simulated metrics
    
    health_score = 98.4
    disruptions_count = 2
    # Latency varies slightly between 12ms and 18ms
    latency_ms = random.randint(12, 18)
    
    return {
        "health": f"{health_score}%",
        "disruptions": f"{disruptions_count:02}",
        "latency": f"{latency_ms}MS",
        "oracle_status": "ONLINE",
        "navigator_status": "ONLINE",
        "buffer_status": "ONLINE",
        "ledger_status": "SYNCED",
        "fortress_status": "SECURE"
    }
