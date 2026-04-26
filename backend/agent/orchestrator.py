import os
import json
import asyncio
import logging
import time
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from mcp.client.sse import sse_client
from mcp.client.session import ClientSession
from contextlib import AsyncExitStack

# Set up logging
logging.basicConfig(level=logging.INFO)

from agent.reasoning_core import get_model

app = FastAPI(title="NEXUS A2A Orchestrator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

mcp_session = None
mcp_exit_stack = AsyncExitStack()
chat_session = None
tool_call_log = []

# --- GEMINI TOOL DEFINITIONS ---

async def get_vessel_positions(bbox: str) -> dict:
    """Fetch live AIS vessel positions within a bounding box. Format: minLon,minLat,maxLon,maxLat"""
    start = time.time()
    try:
        res = await mcp_session.call_tool("get_vessel_positions", arguments={"bbox": bbox})
        result = json.loads(res.content[0].text)
    except Exception as e:
        result = {"error": str(e)}
    tool_call_log.append({"tool_name": "get_vessel_positions", "parameters": {"bbox": bbox}, "response_time_ms": int((time.time() - start) * 1000)})
    return result

async def get_port_congestion(port_codes: list[str]) -> dict:
    """Fetch port congestion metrics for given UN/LOCODE port codes."""
    start = time.time()
    try:
        res = await mcp_session.call_tool("get_port_congestion", arguments={"port_codes": port_codes})
        result = json.loads(res.content[0].text)
    except Exception as e:
        result = {"error": str(e)}
    tool_call_log.append({"tool_name": "get_port_congestion", "parameters": {"port_codes": port_codes}, "response_time_ms": int((time.time() - start) * 1000)})
    return result

async def get_disruption_signals(region: str, hours_back: int = 24) -> dict:
    """Fetch supply-chain-relevant disruption news and events."""
    start = time.time()
    try:
        res = await mcp_session.call_tool("get_disruption_signals", arguments={"region": region, "hours_back": hours_back})
        result = json.loads(res.content[0].text)
    except Exception as e:
        result = {"error": str(e)}
    tool_call_log.append({"tool_name": "get_disruption_signals", "parameters": {"region": region, "hours_back": hours_back}, "response_time_ms": int((time.time() - start) * 1000)})
    return result

async def get_weather_hazards(lat: float, lon: float, radius_km: int) -> dict:
    """Fetch active weather hazards along shipping corridors."""
    start = time.time()
    try:
        res = await mcp_session.call_tool("get_weather_hazards", arguments={"lat": lat, "lon": lon, "radius_km": radius_km})
        result = json.loads(res.content[0].text)
    except Exception as e:
        result = {"error": str(e)}
    tool_call_log.append({"tool_name": "get_weather_hazards", "parameters": {"lat": lat, "lon": lon, "radius_km": radius_km}, "response_time_ms": int((time.time() - start) * 1000)})
    return result

async def get_geopolitical_risk_index(country_codes: list[str]) -> dict:
    """Fetch real-time geopolitical risk scores per country."""
    start = time.time()
    try:
        res = await mcp_session.call_tool("get_geopolitical_risk_index", arguments={"country_codes": country_codes})
        result = json.loads(res.content[0].text)
    except Exception as e:
        result = {"error": str(e)}
    tool_call_log.append({"tool_name": "get_geopolitical_risk_index", "parameters": {"country_codes": country_codes}, "response_time_ms": int((time.time() - start) * 1000)})
    return result

async def optimise_route(origin_port: str, destination_port: str, cargo_type: str, departure_date: str) -> dict:
    """Call routing API to compute optimal route."""
    start = time.time()
    try:
        res = await mcp_session.call_tool("optimise_route", arguments={"origin_port": origin_port, "destination_port": destination_port, "cargo_type": cargo_type, "departure_date": departure_date})
        result = json.loads(res.content[0].text)
    except Exception as e:
        result = {"error": str(e)}
    tool_call_log.append({"tool_name": "optimise_route", "parameters": {"origin_port": origin_port, "destination_port": destination_port, "cargo_type": cargo_type, "departure_date": departure_date}, "response_time_ms": int((time.time() - start) * 1000)})
    return result

gemini_tools = [
    get_vessel_positions, get_port_congestion, get_disruption_signals,
    get_weather_hazards, get_geopolitical_risk_index, optimise_route
]

async def connect_to_mcp_server():
    global mcp_session, mcp_exit_stack, chat_session
    server_url = "http://127.0.0.1:8000/sse"
    
    # Wait for MCP server to start
    import httpx
    for _ in range(15):
        try:
            async with httpx.AsyncClient() as client:
                await client.get(server_url)
                break
        except Exception:
            await asyncio.sleep(2)

    try:
        sse_ctx = sse_client(server_url)
        streams = await mcp_exit_stack.enter_async_context(sse_ctx)
        mcp_session = await mcp_exit_stack.enter_async_context(ClientSession(*streams))
        await mcp_session.initialize()
        
        nexus_model = get_model(tools_list=gemini_tools)
        chat_session = nexus_model.start_chat(enable_automatic_function_calling=True)
        logging.info("Connected to FastMCP and initialized NEXUS reasoning core.")
    except Exception as e:
        logging.error(f"Failed to connect to MCP: {e}")

async def run_autonomous_scan():
    while True:
        await asyncio.sleep(300) # Every 5 minutes
        if chat_session:
            prompt = "Run an autonomous scan of major shipping corridors for disruptions and re-optimise if needed. Only output if severity > 0.85."
            try:
                # Run the background scan asynchronously
                await chat_session.send_message_async(prompt)
                # Output is generated but we might push it via SSE if it's high severity.
            except Exception as e:
                logging.error(f"Scan failed: {e}")

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(connect_to_mcp_server())
    asyncio.create_task(run_autonomous_scan())

@app.on_event("shutdown")
async def shutdown_event():
    await mcp_exit_stack.aclose()

@app.get("/agent/stream")
async def stream_reasoning_to_frontend(query: str = "What is the current risk in the Red Sea?"):
    async def event_generator():
        if not chat_session:
            yield f"data: {json.dumps({'error': 'Agent not initialized yet'})}\n\n"
            return
            
        try:
            response_stream = await chat_session.send_message_async(query, stream=True)
            async for chunk in response_stream:
                if chunk.text:
                    yield f"data: {json.dumps({'text': chunk.text})}\n\n"
            yield f"data: {json.dumps({'status': 'done'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/agent/tool-log")
async def get_tool_log():
    return tool_call_log

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8002)
