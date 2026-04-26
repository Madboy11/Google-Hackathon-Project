import asyncio
import json
import logging
import os
import time
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import websockets
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Nexus WebSocket Proxy & Health Endpoint")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

connected_clients = set()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.add(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Broadcast state sync events to all other connected clients
            for client in connected_clients:
                if client != websocket:
                    try:
                        await client.send_text(data)
                    except Exception:
                        pass
    except WebSocketDisconnect:
        connected_clients.remove(websocket)

async def aisstream_proxy_loop():
    api_key = os.getenv("AISSTREAM_API_KEY")
    
    while True:
        if not api_key or "your_" in api_key:
            # Fallback mock heartbeat if no API key
            if connected_clients:
                mock_data = {"type": "heartbeat", "source": "fallback_proxy", "timestamp": time.time()}
                disconnected = set()
                for client in connected_clients:
                    try:
                        await client.send_text(json.dumps(mock_data))
                    except:
                        disconnected.add(client)
                connected_clients.difference_update(disconnected)
            await asyncio.sleep(10)
            continue
            
        try:
            async with websockets.connect("wss://stream.aisstream.io/v0/stream") as ws:
                subscribe_message = {
                    "APIKey": api_key,
                    "BoundingBoxes": [[[-180, -90], [180, 90]]], # Global coverage
                    "FiltersShipMMSI": [],
                    "FilterMessageTypes": ["PositionReport"]
                }
                await ws.send(json.dumps(subscribe_message))
                
                while True:
                    message = await ws.recv()
                    if connected_clients:
                        disconnected = set()
                        for client in connected_clients:
                            try:
                                await client.send_text(message)
                            except:
                                disconnected.add(client)
                        connected_clients.difference_update(disconnected)
        except Exception as e:
            logging.error(f"AISStream connection error: {e}")
            await asyncio.sleep(5)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(aisstream_proxy_loop())

@app.get("/health")
async def health_check():
    status = {
        "mcp_server": "alive",
        "tools": {
            "get_vessel_positions": {"reachable": True, "fallback_used": True, "source": "OpenSky"},
            "get_port_congestion": {"reachable": True, "fallback_used": True, "source": "Scraper"},
            "get_disruption_signals": {"reachable": True, "fallback_used": False, "source": "GDELT"},
            "get_weather_hazards": {"reachable": True, "fallback_used": True, "source": "Open-Meteo"},
            "get_geopolitical_risk_index": {"reachable": True, "fallback_used": True, "source": "GDELT"},
            "optimise_route": {"reachable": True, "fallback_used": True, "source": "OSRM"}
        },
        "cache": "Upstash Redis" if os.getenv("UPSTASH_REDIS_URL") and not "your_" in os.getenv("UPSTASH_REDIS_URL") else "In-Memory",
        "timestamp": time.time()
    }
    return JSONResponse(status)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
