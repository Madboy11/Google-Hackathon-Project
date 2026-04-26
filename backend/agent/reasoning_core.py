"""
reasoning_core.py — NEXUS-SC Agentic Reasoning Core
======================================================
Uses OpenRouter with OpenAI-compatible API.
Supports full function/tool calling for capable models.
Automatically rotates to next model on rate-limit or bad-request errors.

Model Pool (in priority order):
  1. google/gemini-2.5-flash-preview-05-20  — tool-capable
  2. openai/gpt-4o-mini                     — tool-capable
  3. openai/gpt-oss-120b:free               — text-only (no tool_choice)
  4. inclusionai/ling-2.6-1t:free           — text-only
  5. google/gemma-3-27b-it:free             — text-only
"""

import os
import json
import logging
from openai import OpenAI, RateLimitError, BadRequestError

logger = logging.getLogger(__name__)

# ── Model rotation pool (FREE ONLY) ───────────────────────────────────────────
# Each entry: (model_id, supports_openai_tools)
# Free-tier OpenRouter models don't support function calling —
# we pre-fetch MCP tool data in the orchestrator and inject as context instead.
MODEL_POOL = [
    ("openai/gpt-oss-120b:free",     False),
    ("inclusionai/ling-2.6-1t:free", False),
    ("google/gemma-3-27b-it:free",   False),
    ("meta-llama/llama-4-maverick:free", False),
    ("deepseek/deepseek-r1-0528:free",   False),
]

_current_model_idx = 0


def get_current_model_id() -> str:
    return MODEL_POOL[_current_model_idx % len(MODEL_POOL)][0]


def current_supports_tools() -> bool:
    return MODEL_POOL[_current_model_idx % len(MODEL_POOL)][1]


def rotate_model(reason: str = "") -> str:
    global _current_model_idx
    old = get_current_model_id()
    _current_model_idx += 1
    new = get_current_model_id()
    logger.warning("🔄 Model rotated: %s → %s  (reason: %s)", old, new, reason[:80])
    return new


def get_model_status() -> dict:
    return {
        "current_model": get_current_model_id(),
        "supports_tools": current_supports_tools(),
        "model_idx": _current_model_idx % len(MODEL_POOL),
        "pool": [m[0] for m in MODEL_POOL],
    }


# ── OpenRouter client ──────────────────────────────────────────────────────────
def _client() -> OpenAI:
    return OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=os.getenv("OPENROUTER_API_KEY", ""),
        default_headers={
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "NEXUS-SC Supply Chain Control Tower",
        },
    )


# ── System prompt ──────────────────────────────────────────────────────────────
def get_system_prompt() -> str:
    prompt_path = os.path.join(os.path.dirname(__file__), "system_prompt.txt")
    try:
        with open(prompt_path, "r") as f:
            return f.read()
    except FileNotFoundError:
        return (
            "You are NEXUS, an elite autonomous supply chain intelligence system. "
            "You have access to real-time tools for vessel tracking, port congestion, "
            "disruption signals, weather hazards, geopolitical risk, and route optimization. "
            "Always use your tools to ground your analysis in live data before responding. "
            "Be concise, decisive, and action-oriented."
        )


# ── Tool schemas (OpenAI function-calling format) ──────────────────────────────
NEXUS_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_vessel_positions",
            "description": "Fetch live AIS vessel positions within a bounding box. Use to check maritime traffic density.",
            "parameters": {
                "type": "object",
                "properties": {
                    "bbox": {
                        "type": "string",
                        "description": "Bounding box as 'minLon,minLat,maxLon,maxLat', e.g. '32,12,45,30' for Red Sea.",
                    }
                },
                "required": ["bbox"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_port_congestion",
            "description": "Fetch port congestion metrics (wait times, anchor queue) for UN/LOCODE port codes.",
            "parameters": {
                "type": "object",
                "properties": {
                    "port_codes": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of UN/LOCODE codes, e.g. ['SGSIN', 'CNSHA', 'AEDXB']",
                    }
                },
                "required": ["port_codes"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_disruption_signals",
            "description": "Fetch real-time supply-chain disruption signals from GDELT (strikes, closures, disasters).",
            "parameters": {
                "type": "object",
                "properties": {
                    "region": {
                        "type": "string",
                        "description": "Geographic region, country, or 'global'.",
                    },
                    "hours_back": {
                        "type": "integer",
                        "description": "How many hours back to search. Default 24.",
                    },
                },
                "required": ["region"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_weather_hazards",
            "description": "Fetch active weather hazards (wind, precipitation) for a shipping corridor coordinate.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lat": {"type": "number", "description": "Center latitude."},
                    "lon": {"type": "number", "description": "Center longitude."},
                    "radius_km": {"type": "integer", "description": "Search radius in km."},
                },
                "required": ["lat", "lon", "radius_km"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_geopolitical_risk_index",
            "description": "Fetch geopolitical risk scores (0–1) per country based on GDELT event volume.",
            "parameters": {
                "type": "object",
                "properties": {
                    "country_codes": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "ISO-2 country codes, e.g. ['CN', 'IR', 'SA', 'EG', 'RU']",
                    }
                },
                "required": ["country_codes"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "optimise_route",
            "description": "Compute the optimal shipping route between two ports. Returns waypoints, cost, and risk score.",
            "parameters": {
                "type": "object",
                "properties": {
                    "origin_port": {"type": "string", "description": "Origin port name."},
                    "destination_port": {"type": "string", "description": "Destination port name."},
                    "cargo_type": {"type": "string", "description": "Cargo type, e.g. 'containers'."},
                    "departure_date": {"type": "string", "description": "ISO 8601 date, e.g. '2025-06-01'."},
                },
                "required": ["origin_port", "destination_port", "cargo_type", "departure_date"],
            },
        },
    },
]


# ── Non-streaming reasoning (for background autonomous scans) ──────────────────
def complete_reasoning(messages: list, tool_executor=None) -> str:
    """Runs agentic tool-calling loop and returns final text. Rotates model on failure."""
    client = _client()
    system = get_system_prompt()
    full_messages = [{"role": "system", "content": system}] + list(messages)

    for _ in range(len(MODEL_POOL)):
        model = get_current_model_id()
        use_tools = current_supports_tools() and bool(tool_executor)
        tools = NEXUS_TOOLS if use_tools else None
        try:
            loop_messages = list(full_messages)
            for __ in range(4):
                resp = client.chat.completions.create(
                    model=model,
                    messages=loop_messages,
                    tools=tools,
                )
                msg = resp.choices[0].message
                if not msg.tool_calls:
                    return msg.content or ""
                loop_messages.append(msg)
                for tc in msg.tool_calls:
                    try:
                        args = json.loads(tc.function.arguments)
                        result = tool_executor(tc.function.name, args) if tool_executor else {"error": "no executor"}
                    except Exception as e:
                        result = {"error": str(e)}
                    loop_messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(result),
                    })
            return "Max tool-call rounds reached."
        except (RateLimitError, BadRequestError) as e:
            rotate_model(str(e))
            client = _client()

    return "All models exhausted. Please try again later."


# ── Streaming reasoning (yields text chunks for SSE) ──────────────────────────
def stream_reasoning(messages: list, tool_executor=None):
    """
    Agentic streaming pipeline:
    Phase 1 — Non-streaming tool-calling rounds (up to 3 rounds).
    Phase 2 — Stream the final response token by token.
    Automatically rotates model on RateLimitError / BadRequestError.
    Only passes tools to models that support OpenAI function calling.
    """
    client = _client()
    system = get_system_prompt()
    full_messages = [{"role": "system", "content": system}] + list(messages)

    for _ in range(len(MODEL_POOL)):
        model = get_current_model_id()
        use_tools = current_supports_tools() and bool(tool_executor)
        tools = NEXUS_TOOLS if use_tools else None
        try:
            loop_messages = list(full_messages)
            called_sigs: set = set()

            # ── Phase 1: tool-calling (non-streaming) ──────────────────────
            for __ in range(3):
                resp = client.chat.completions.create(
                    model=model,
                    messages=loop_messages,
                    tools=tools,
                )
                msg = resp.choices[0].message

                if not msg.tool_calls:
                    # Model answered directly — yield and exit
                    if msg.content:
                        yield msg.content
                    return

                loop_messages.append(msg)
                made_new = False
                for tc in msg.tool_calls:
                    sig = f"{tc.function.name}:{tc.function.arguments}"
                    if sig in called_sigs:
                        continue
                    called_sigs.add(sig)
                    made_new = True
                    try:
                        args = json.loads(tc.function.arguments)
                        result = tool_executor(tc.function.name, args) if tool_executor else {"error": "no executor"}
                    except Exception as e:
                        result = {"error": str(e)}
                    yield f"\n\n[🔧 **{tc.function.name}**]\n"
                    loop_messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(result),
                    })
                if not made_new:
                    break  # all duplicates — stop tool loop

            # ── Phase 2: stream the final answer ───────────────────────────
            with client.chat.completions.create(
                model=model,
                messages=loop_messages,
                tools=None,
                stream=True,
            ) as stream:
                for chunk in stream:
                    delta = chunk.choices[0].delta
                    if delta and delta.content:
                        yield delta.content
            return  # done

        except (RateLimitError, BadRequestError) as e:
            rotate_model(str(e))
            client = _client()
            yield f"\n\n[⚠️ Switching to next model...]\n\n"

    yield "\n\n[❌ All models exhausted. Please try again later.]"


# Legacy shim — keeps old callers happy
def get_model(tools_list=None):
    return None
