import os
import google.generativeai as genai

def get_model(tools_list=None):
    genai.configure(api_key=os.getenv("GEMINI_API_KEY", "dummy_key"))
    prompt_path = os.path.join(os.path.dirname(__file__), "system_prompt.txt")
    
    with open(prompt_path, "r") as f:
        system_instruction = f.read()

    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=system_instruction,
        tools=tools_list
    )
    return model
