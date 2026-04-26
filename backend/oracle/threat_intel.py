import os
import json
import time
import urllib.request
import urllib.error
import logging
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

THREATS_CACHE_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'active_threats.json')
# Ensure data dir exists
os.makedirs(os.path.dirname(THREATS_CACHE_FILE), exist_ok=True)

# Schema the LLM must return
PROMPT = """
You are a highly advanced Maritime Intelligence Oracle. Your job is to assess the CURRENT real-world global geopolitical climate, supply chain disruptions, weather events, and piracy threats.

Generate a JSON array of 4-6 Active ThreatVectors for global shipping routes.
Return ONLY valid JSON. Do not include markdown code blocks or any other text.

Schema for each ThreatVector object:
{
  "corridor": "string (e.g., 'Red Sea', 'Panama Canal')",
  "region": "string",
  "type": "string (one of: 'Geopolitical', 'Piracy', 'Sanctions', 'Cyber', 'Weather', 'Labor')",
  "severity": number (0.0 to 1.0, where >0.7 is critical),
  "confidence": number (0.0 to 1.0),
  "status": "string (one of: 'Active', 'Monitoring', 'Resolved')",
  "description": "string (Detailed summary of the threat and its impact on shipping)",
  "affectedRoutes": ["string"],
  "affectedCorridors": ["string"]
}

Base your output on realistic, recent global events.
"""

def fetch_threats_from_llm():
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        logger.error("OPENROUTER_API_KEY not found in environment.")
        return None

    try:
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:8000",
            "X-Title": "NEXUS-SC Control Tower"
        }
        payload = json.dumps({
            "model": "google/gemini-2.5-flash",
            "messages": [{"role": "user", "content": PROMPT}],
            "response_format": {"type": "json_object"}
        }).encode('utf-8')

        req = urllib.request.Request(url, data=payload, headers=headers, method='POST')
        
        with urllib.request.urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode('utf-8'))
            
        content = data['choices'][0]['message']['content']
        
        # Clean up in case it returned markdown block
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
        
        parsed_json = json.loads(content)
        # If it returned a dict with a key instead of an array directly, unwrap it
        if isinstance(parsed_json, dict):
            for k, v in parsed_json.items():
                if isinstance(v, list):
                    parsed_json = v
                    break
                    
        if not isinstance(parsed_json, list):
            raise ValueError("LLM did not return a JSON array.")

        # Post-process to add IDs and timestamps
        current_time = time.time()
        for i, threat in enumerate(parsed_json):
            threat['id'] = f"live-th-{int(current_time)}-{i}"
            threat['source'] = 'oracle-llm'
            threat['escalatedToLedger'] = threat.get('severity', 0) > 0.7
            # Let the frontend assign actual ISO strings if missing
            
        # Cache it
        with open(THREATS_CACHE_FILE, 'w') as f:
            json.dump({
                "timestamp": current_time,
                "threats": parsed_json
            }, f, indent=2)
            
        logger.info(f"Successfully fetched and cached {len(parsed_json)} threats from OpenRouter.")
        return parsed_json
        
    except Exception as e:
        logger.error(f"Failed to fetch threats from LLM: {e}")
        return None

def get_active_threats(force_refresh=False, max_age_hours=6):
    """
    Returns the cached threats. If the cache is older than max_age_hours or missing, fetches new ones.
    """
    if not force_refresh and os.path.exists(THREATS_CACHE_FILE):
        try:
            with open(THREATS_CACHE_FILE, 'r') as f:
                data = json.load(f)
                age_hours = (time.time() - data.get('timestamp', 0)) / 3600
                if age_hours < max_age_hours:
                    return data.get('threats', [])
        except Exception as e:
            logger.warning(f"Failed to read threat cache: {e}")
            
    # Need to fetch
    new_threats = fetch_threats_from_llm()
    if new_threats:
        return new_threats
        
    # If all fails and we had a cache, return it anyway
    if os.path.exists(THREATS_CACHE_FILE):
        with open(THREATS_CACHE_FILE, 'r') as f:
            return json.load(f).get('threats', [])
            
    return []

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print(get_active_threats(force_refresh=True))
