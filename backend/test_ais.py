import asyncio
import json
import os
from dotenv import load_dotenv

load_dotenv()

async def test():
    import websockets
    api_key = os.getenv("AISSTREAM_API_KEY")
    print(f"API Key: {api_key[:10]}...{api_key[-6:]}")
    
    try:
        print("Connecting to AISStream...")
        async with websockets.connect(
            "wss://stream.aisstream.io/v0/stream",
            open_timeout=15,
            close_timeout=5,
            ping_interval=None,  # Disable auto-ping
        ) as ws:
            subscribe_message = {
                "APIKey": api_key,
                "BoundingBoxes": [[[-90, -180], [90, 180]]],
                "FilterMessageTypes": ["PositionReport"]
            }
            print(f"Sending subscription: {json.dumps(subscribe_message)[:120]}...")
            await ws.send(json.dumps(subscribe_message))
            print("Subscription sent. Waiting for first message (up to 15s)...")
            
            for i in range(5):
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=15)
                    data = json.loads(msg)
                    if "ERROR" in str(data) or "error" in str(data):
                        print(f"SERVER ERROR: {msg[:500]}")
                        break
                    if data.get("Message", {}).get("PositionReport"):
                        pr = data["Message"]["PositionReport"]
                        name = data.get("MetaData", {}).get("ShipName", "?")
                        print(f"  MSG #{i+1}: Vessel '{name}' at ({pr['Latitude']:.4f}, {pr['Longitude']:.4f}) Speed={pr.get('Sog', '?')} kn")
                    else:
                        print(f"  MSG #{i+1}: {str(msg)[:200]}")
                except asyncio.TimeoutError:
                    print("  TIMEOUT - no data received in 15s")
                    break
            
            print("\nSUCCESS - AISStream is working!")
    except Exception as e:
        print(f"\nFAILED: {type(e).__name__}: {e}")

asyncio.run(test())
