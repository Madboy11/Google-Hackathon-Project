from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging

from oracle.engine import oracle_engine
from oracle.diagnostics import get_system_diagnostics
from oracle.threat_intel import get_active_threats
from navigator.engine import navigator_engine
from buffer.engine import buffer_engine

logging.basicConfig(level=logging.INFO)
app = FastAPI(title="NEXUS-SC", description="Dev A Backend AI/ML APIs", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RiskScoreRequest(BaseModel):
    node_id: str
    time_horizon: str = "72h"

class OverrideRequest(BaseModel):
    vessel_id: str
    action: str

class TriggerPORequest(BaseModel):
    sku_id: str
    quantity: int

@app.get("/health")
async def health_check():
    return {"status": "OK", "service": "NEXUS-SC Dev A Backend", "version": "1.0.0"}

@app.get("/diagnostics/system")
async def system_diagnostics():
    return get_system_diagnostics()

@app.post("/risk-score")
async def get_risk_score(req: RiskScoreRequest):
    score = oracle_engine.score(req.node_id, req.time_horizon)
    return {"node_id": req.node_id, "risk_score": score, "time_horizon": req.time_horizon}

@app.get("/routing/current")
async def get_current_routing():
    return navigator_engine.get_active_routes()

@app.post("/routing/override")
async def override_routing(req: OverrideRequest):
    return navigator_engine.apply_override(req.vessel_id, req.action)

@app.get("/inventory/safety-stock")
async def get_safety_stock(sku_id: str):
    return buffer_engine.get_safety_stock(sku_id)

@app.post("/inventory/trigger-po")
async def trigger_po(req: TriggerPORequest):
    return buffer_engine.manual_trigger(req.sku_id, req.quantity)

@app.get("/threats/active")
async def active_threats(force_refresh: bool = False):
    threats = get_active_threats(force_refresh=force_refresh)
    return {"threats": threats}

import searoute as sr

@app.get("/routing/searoute")
async def get_searoute(origin_lon: float, origin_lat: float, dest_lon: float, dest_lat: float):
    try:
        origin = [origin_lon, origin_lat]
        dest = [dest_lon, dest_lat]
        
        # calculate route
        # include_ports=True makes sure it starts/ends near land properly
        route = sr.searoute(origin, dest, include_ports=True)
        return {"route": route}
    except Exception as e:
        logging.error(f"Searoute calculation failed: {e}")
        return {"error": str(e), "route": None}

import os

@app.get("/config/weather-key")
async def get_weather_key():
    return {"key": os.getenv("OPENWEATHERMAP_API_KEY", "")}
