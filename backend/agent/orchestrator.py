"""
orchestrator.py — NEXUS-SC A2A Orchestrator
============================================
Calls MCP tools via direct HTTP POST to /tools/call on port 8000.
No MCP SDK session required — works reliably without SSE handshake issues.
Streams AI responses (free OpenRouter models) via SSE to the React frontend.
"""

import os
import json
import asyncio
import logging
import time
import threading
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import httpx

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
logging.basicConfig(level=logging.INFO)

from agent.reasoning_core import stream_reasoning, complete_reasoning, get_model_status

# ── FastAPI app ────────────────────────────────────────────────────────────────
app = FastAPI(title="NEXUS A2A Orchestrator")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global state ───────────────────────────────────────────────────────────────
tool_call_log = []
MCP_BASE = "http://127.0.0.1:8003"


# ── HTTP tool caller ───────────────────────────────────────────────────────────

async def call_tool(tool_name: str, args: dict) -> dict:
    """Call a NEXUS MCP tool via direct HTTP POST."""
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{MCP_BASE}/tools/call",
                json={"tool": tool_name, "args": args},
            )
            result = resp.json()
    except Exception as e:
        result = {"error": str(e), "tool": tool_name}
    elapsed = int((time.time() - start) * 1000)
    tool_call_log.append({"tool_name": tool_name, "parameters": args, "response_time_ms": elapsed})
    logging.info("🔧 Tool %s → %dms", tool_name, elapsed)
    return result


async def mcp_available() -> bool:
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            r = await client.get(f"{MCP_BASE}/tools/health")
            return r.status_code == 200
    except Exception:
        return False


# ── Autonomous background scan ─────────────────────────────────────────────────

async def run_autonomous_scan():
    """Every 5 minutes pull live data and run AI analysis."""
    while True:
        await asyncio.sleep(300)
        if not await mcp_available():
            logging.warning("Skipping autonomous scan — MCP tools unavailable")
            continue
        try:
            logging.info("🔍 Running autonomous global scan...")
            disruptions, geo_risk, weather, ports, vessels = await asyncio.gather(
                call_tool("get_disruption_signals", {"region": "global", "hours_back": 6}),
                call_tool("get_geopolitical_risk_index", {"country_codes": ["CN", "SA", "EG", "IR", "RU", "UA", "TW"]}),
                call_tool("get_weather_hazards", {"lat": 12.5, "lon": 43.5, "radius_km": 800}),
                call_tool("get_port_congestion", {"port_codes": ["SGSIN", "CNSHA", "AEDXB", "EGPSE"]}),
                call_tool("get_vessel_positions", {"bbox": "-180,-90,180,90"}),
                return_exceptions=True,
            )
            context = {
                "scan_time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "disruptions": disruptions if not isinstance(disruptions, Exception) else {},
                "geopolitical_risk": geo_risk if not isinstance(geo_risk, Exception) else {},
                "weather_hazards": weather if not isinstance(weather, Exception) else {},
                "port_congestion": ports if not isinstance(ports, Exception) else {},
                "vessel_activity": vessels if not isinstance(vessels, Exception) else {},
            }
            messages = [{
                "role": "user",
                "content": (
                    "AUTONOMOUS GLOBAL SCAN — analyze this live intel and produce a concise "
                    "threat assessment. Only highlight corridors with severity > 0.75. "
                    "Format: region → risk → recommended action.\n\n"
                    f"```json\n{json.dumps(context, indent=2)}\n```"
                ),
            }]
            result = await asyncio.to_thread(complete_reasoning, messages, None)
            if result:
                logging.info("📡 Scan result:\n%s", result[:500])
        except Exception as e:
            logging.error("Autonomous scan error: %s", e)


# ── Lifecycle ──────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(run_autonomous_scan())


@app.on_event("shutdown")
async def shutdown_event():
    pass


# ── SSE streaming endpoint ─────────────────────────────────────────────────────

@app.get("/agent/stream")
async def stream_agent_response(query: str = "What is the current risk in the Red Sea?"):
    """
    Pipeline:
    1. Fetch live data from all 5 MCP tools in parallel via HTTP
    2. Inject data as context into the prompt
    3. Stream AI response using a free OpenRouter model
    """

    async def event_generator():
        try:
            # ── Step 1: Check MCP and fetch data ──────────────────────────
            mcp_up = await mcp_available()
            mcp_context = {}

            if mcp_up:
                msg_start = json.dumps({"text": "[🔧 Fetching live intel from all sensors...]\n\n"})
                yield f"data: {msg_start}\n\n"

                results = await asyncio.gather(
                    call_tool("get_disruption_signals", {"region": "global", "hours_back": 12}),
                    call_tool("get_geopolitical_risk_index", {"country_codes": ["CN", "SA", "EG", "IR", "RU", "TW", "UA"]}),
                    call_tool("get_weather_hazards", {"lat": 12.5, "lon": 43.5, "radius_km": 800}),
                    call_tool("get_port_congestion", {"port_codes": ["SGSIN", "CNSHA", "AEDXB", "EGPSE", "NLRTM"]}),
                    call_tool("get_vessel_positions", {"bbox": "32,10,45,30"}),
                    return_exceptions=True,
                )
                labels = ["disruptions", "geopolitical_risk", "weather_hazards", "port_congestion", "vessel_positions"]
                for label, result in zip(labels, results):
                    mcp_context[label] = {"error": str(result)} if isinstance(result, Exception) else result

                msg_ready = json.dumps({"text": "[✅ Live data acquired — reasoning now...]\n\n"})
                yield f"data: {msg_ready}\n\n"
            else:
                msg_offline = json.dumps({"text": "[⚠️ Tools offline — reasoning from model knowledge]\n\n"})
                yield f"data: {msg_offline}\n\n"

            # ── Step 2: Build prompt with injected context ─────────────────
            context_block = ""
            if mcp_context:
                context_block = (
                    "\n\n---\n**LIVE NEXUS INTELLIGENCE FEED** (fetched just now):\n"
                    "```json\n" + json.dumps(mcp_context, indent=2) + "\n```\n---\n\n"
                )

            messages = [{"role": "user", "content": query + context_block}]

            # ── Step 3: Stream AI response ─────────────────────────────────
            loop = asyncio.get_event_loop()
            queue: asyncio.Queue = asyncio.Queue()
            SENTINEL = object()

            def producer():
                try:
                    for chunk in stream_reasoning(messages, tool_executor=None):
                        asyncio.run_coroutine_threadsafe(queue.put(chunk), loop).result()
                except Exception as exc:
                    asyncio.run_coroutine_threadsafe(
                        queue.put({"__error__": str(exc)}), loop
                    ).result()
                finally:
                    asyncio.run_coroutine_threadsafe(queue.put(SENTINEL), loop).result()

            t = threading.Thread(target=producer, daemon=True)
            t.start()

            while True:
                item = await queue.get()
                if item is SENTINEL:
                    break
                if isinstance(item, dict) and "__error__" in item:
                    yield f"data: {json.dumps({'error': item['__error__']})}\n\n"
                    break
                yield f"data: {json.dumps({'text': item})}\n\n"

            yield f"data: {json.dumps({'status': 'done'})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ── Utility endpoints ──────────────────────────────────────────────────────────

@app.get("/agent/tool-log")
async def get_tool_log():
    return tool_call_log[-50:]


@app.get("/health")
async def health():
    mcp_up = await mcp_available()
    return {
        "status": "ok",
        "mcp_connected": mcp_up,
        "tool_calls_made": len(tool_call_log),
        **get_model_status(),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
