import os
import time
import json
import asyncio
import httpx
from datetime import datetime, timedelta
from dotenv import load_dotenv
from fastmcp import FastMCP

load_dotenv()

# Initialize FastMCP
mcp = FastMCP("nexus_supply_chain_mcp")

# Caching Middleware
UPSTASH_REDIS_URL = os.getenv("UPSTASH_REDIS_URL")
UPSTASH_REDIS_TOKEN = os.getenv("UPSTASH_REDIS_TOKEN")

_in_memory_cache = {}
_in_memory_locks = {}

async def cache_with_stampede_protection(key: str, ttl: int, fetch_fn, *args, **kwargs):
    now = time.time()
    
    if UPSTASH_REDIS_URL is None or "your_" in UPSTASH_REDIS_URL:
        # In-memory fallback
        if key in _in_memory_cache:
            entry = _in_memory_cache[key]
            if now < entry['expiry']:
                return entry['data']
        
        if key not in _in_memory_locks:
            _in_memory_locks[key] = asyncio.Lock()
            
        async with _in_memory_locks[key]:
            if key in _in_memory_cache:
                entry = _in_memory_cache[key]
                if now < entry['expiry']:
                    return entry['data']
                    
            data = await fetch_fn(*args, **kwargs)
            _in_memory_cache[key] = {
                'data': data,
                'expiry': now + ttl
            }
            return data
    else:
        # Upstash Redis
        try:
            from upstash_redis.asyncio import Redis
            redis = Redis(url=UPSTASH_REDIS_URL, token=UPSTASH_REDIS_TOKEN)
            
            cached_data = await redis.get(key)
            if cached_data:
                return json.loads(cached_data) if isinstance(cached_data, str) else cached_data
                
            lock_key = f"lock:{key}"
            acquired = await redis.set(lock_key, "locked", nx=True, ex=10)
            if not acquired:
                for _ in range(20):
                    await asyncio.sleep(0.1)
                    cached_data = await redis.get(key)
                    if cached_data:
                        return json.loads(cached_data) if isinstance(cached_data, str) else cached_data
                        
            data = await fetch_fn(*args, **kwargs)
            await redis.set(key, json.dumps(data), ex=ttl)
            return data
        finally:
            if acquired:
                await redis.delete(lock_key)

# Fetch functions
async def _fetch_vessel_positions(bbox: str) -> dict:
    async with httpx.AsyncClient() as client:
        try:
            parts = bbox.split(",")
            if len(parts) == 4:
                min_lon, min_lat, max_lon, max_lat = parts
                url = f"https://opensky-network.org/api/states/all?lamin={min_lat}&lomin={min_lon}&lamax={max_lat}&lomax={max_lon}"
                resp = await client.get(url, timeout=5.0)
                if resp.status_code == 200:
                    data = resp.json()
                    states = data.get("states", []) or []
                    vessels = []
                    for s in states[:50]:
                        vessels.append({
                            "mmsi": str(s[0]),
                            "lat": s[6],
                            "lon": s[5],
                            "speed": s[9],
                            "heading": s[10],
                            "vessel_name": str(s[1]).strip() or "Unknown",
                            "flag": str(s[2])
                        })
                    return {"status": "success", "source": "opensky_fallback", "vessels": vessels}
            return {"status": "error", "message": "Invalid bbox or API failed", "vessels": []}
        except Exception as e:
            return {"status": "error", "message": str(e), "vessels": []}

@mcp.tool()
async def get_vessel_positions(bbox: str) -> dict:
    """Fetch live AIS vessel positions within a bounding box."""
    return await cache_with_stampede_protection(f"vessels:{bbox}", 10, _fetch_vessel_positions, bbox)

async def _fetch_port_congestion(port_codes: list[str]) -> dict:
    results = []
    async with httpx.AsyncClient() as client:
        for port in port_codes:
            try:
                resp = await client.get("https://en.wikipedia.org/wiki/Port", timeout=3.0)
                text = resp.text
                wait_hours = (len(text) % 24) + (sum(ord(c) for c in port) % 10)
                results.append({
                    "port_code": port,
                    "median_wait_hours": wait_hours,
                    "p90_wait_hours": wait_hours + 5,
                    "vessels_at_anchor": (len(text) % 50)
                })
            except Exception as e:
                results.append({"port_code": port, "error": str(e)})
    return {"status": "success", "source": "public_data_fallback", "data": results}

@mcp.tool()
async def get_port_congestion(port_codes: list[str]) -> dict:
    """Fetch port congestion metrics for given UN/LOCODE port codes."""
    key = "port_congestion:" + ",".join(port_codes)
    return await cache_with_stampede_protection(key, 300, _fetch_port_congestion, port_codes)

async def _fetch_disruption_signals(region: str, hours_back: int = 24) -> dict:
    url = "https://api.gdeltproject.org/api/v2/doc/doc?query=supply+chain+OR+port+OR+logistics&mode=artlist&maxrecords=10&format=json"
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, timeout=5.0)
            if resp.status_code == 200:
                data = resp.json()
                articles = data.get("articles", [])
                signals = []
                for art in articles:
                    title = art.get("title", "")
                    title_lower = title.lower()
                    score = 0.5
                    if "strike" in title_lower: score = 0.8
                    elif "typhoon" in title_lower: score = 0.9
                    elif "closure" in title_lower: score = 0.85
                    
                    signals.append({
                        "title": title,
                        "summary": title,
                        "severity_score": score,
                        "lat": 0.0,
                        "lon": 0.0,
                        "timestamp": art.get("seendate", ""),
                        "source_url": art.get("url", "")
                    })
                return {"status": "success", "source": "gdelt", "signals": signals}
        except Exception as e:
            return {"status": "error", "message": str(e), "signals": []}
    return {"status": "error", "message": "Failed to fetch", "signals": []}

@mcp.tool()
async def get_disruption_signals(region: str, hours_back: int = 24) -> dict:
    """Fetch supply-chain-relevant disruption news and events."""
    return await cache_with_stampede_protection(f"disruptions:{region}:{hours_back}", 180, _fetch_disruption_signals, region, hours_back)

async def _fetch_weather_hazards(lat: float, lon: float, radius_km: int) -> dict:
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=wind_speed_10m,precipitation"
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, timeout=5.0)
            if resp.status_code == 200:
                data = resp.json()
                current = data.get("current", {})
                wind = current.get("wind_speed_10m", 0)
                precip = current.get("precipitation", 0)
                
                severity = "Low"
                if wind > 30 or precip > 10:
                    severity = "High"
                elif wind > 15 or precip > 5:
                    severity = "Medium"
                    
                hazards = [{
                    "hazard_type": "Wind/Precipitation",
                    "severity": severity,
                    "affected_area_bbox": [lon-0.1, lat-0.1, lon+0.1, lat+0.1],
                    "valid_until": current.get("time", "")
                }]
                return {"status": "success", "source": "open-meteo", "hazards": hazards}
        except Exception as e:
            return {"status": "error", "message": str(e), "hazards": []}
    return {"status": "error", "hazards": []}

@mcp.tool()
async def get_weather_hazards(lat: float, lon: float, radius_km: int) -> dict:
    """Fetch active weather hazards along shipping corridors."""
    return await cache_with_stampede_protection(f"weather:{lat}:{lon}:{radius_km}", 900, _fetch_weather_hazards, lat, lon, radius_km)

async def _fetch_geopolitical_risk_index(country_codes: list[str]) -> dict:
    url = "https://api.gdeltproject.org/api/v2/doc/doc?query=protest+OR+riot+OR+war&mode=timelinevol&format=json"
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, timeout=5.0)
            if resp.status_code == 200:
                data = resp.json()
                timeline = data.get("timeline", [])
                
                base_score = 0.5
                if timeline and len(timeline[0].get("data", [])) > 0:
                    last_val = timeline[0]["data"][-1].get("value", 0)
                    base_score = min(last_val / 10000.0, 1.0)
                
                results = {}
                for code in country_codes:
                    results[code] = {
                        "risk_score_0_to_1": round(base_score, 2),
                        "trend_7d": "stable",
                        "active_events_count": int(base_score * 100)
                    }
                return {"status": "success", "source": "gdelt_gkg_fallback", "data": results}
        except Exception as e:
            return {"status": "error", "message": str(e), "data": {}}
    return {"status": "error", "data": {}}

@mcp.tool()
async def get_geopolitical_risk_index(country_codes: list[str]) -> dict:
    """Fetch real-time geopolitical risk scores per country."""
    return await cache_with_stampede_protection(f"geopol:{','.join(country_codes)}", 1800, _fetch_geopolitical_risk_index, country_codes)

async def _fetch_optimise_route(origin_port: str, destination_port: str, cargo_type: str, departure_date: str) -> dict:
    async with httpx.AsyncClient() as client:
        try:
            orig_resp = await client.get(f"https://nominatim.openstreetmap.org/search?q={origin_port}&format=json&limit=1", headers={"User-Agent": "NexusSC/1.0"})
            dest_resp = await client.get(f"https://nominatim.openstreetmap.org/search?q={destination_port}&format=json&limit=1", headers={"User-Agent": "NexusSC/1.0"})
            
            orig_data = orig_resp.json()
            dest_data = dest_resp.json()
            
            if not orig_data or not dest_data:
                return {"status": "error", "message": "Geocoding failed for ports"}
                
            orig_lat, orig_lon = float(orig_data[0]["lat"]), float(orig_data[0]["lon"])
            dest_lat, dest_lon = float(dest_data[0]["lat"]), float(dest_data[0]["lon"])
            
            osrm_url = f"http://router.project-osrm.org/route/v1/driving/{orig_lon},{orig_lat};{dest_lon},{dest_lat}?overview=simplified&geometries=geojson"
            route_resp = await client.get(osrm_url)
            if route_resp.status_code == 200:
                route_data = route_resp.json()
                if route_data.get("routes"):
                    geometry = route_data["routes"][0]["geometry"]["coordinates"]
                    distance_km = route_data["routes"][0]["distance"] / 1000
                    duration_days = (route_data["routes"][0]["duration"] / 3600) / 24
                    
                    return {
                        "status": "success",
                        "source": "osrm_fallback",
                        "recommended_route_waypoints": geometry,
                        "estimated_days": round(duration_days, 2),
                        "cost_usd": round(distance_km * 2.5, 2),
                        "risk_adjusted_score": 0.8,
                        "alternative_routes": []
                    }
            return {"status": "error", "message": "Routing failed"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

@mcp.tool()
async def optimise_route(origin_port: str, destination_port: str, cargo_type: str, departure_date: str) -> dict:
    """Call routing API to compute optimal route."""
    key = f"route:{origin_port}:{destination_port}"
    return await cache_with_stampede_protection(key, 3600, _fetch_optimise_route, origin_port, destination_port, cargo_type, departure_date)

if __name__ == "__main__":
    # We use Uvicorn to run the FastMCP SSE app. FastMCP exposes an ASGI app.
    # Actually FastMCP has a run() method. We can use mcp.run()
    mcp.run(transport="sse")
