import base64
import json
import uuid
from pathlib import Path
from urllib import error, request

from app.config import GENERATED_DIR, GEMINI_API_KEY, GEMINI_IMAGE_MODEL
from app.services.design_engine import generate_designs


def _collect_inline_images(payload):
    images = []

    def walk(node):
        if isinstance(node, dict):
            inline = node.get("inlineData") or node.get("inline_data")
            if isinstance(inline, dict) and inline.get("data"):
                images.append(inline)
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(payload)
    return images


def enhance_user_prompt(user_prompt: str) -> str:
    """Enhance a user's raw prompt into a detailed image generation prompt using Gemini."""
    if not GEMINI_API_KEY:
        return user_prompt
    
    enhancer_system_prompt = (
        'You are a professional AI image generation prompt enhancer.\n\n'
        f'User Input:\n"{user_prompt}"\n\n'
        'Instructions:\n'
        '- Convert the user\'s text into a detailed, high-quality image generation prompt.\n'
        '- Preserve the exact intent of the user.\n'
        '- Add visual details, lighting, composition, colors, camera angle, environment, textures, and realism where appropriate.\n'
        '- If the user asks for a cartoon, anime, illustration, logo, poster, mascot, character, or fantasy image, optimize accordingly.\n'
        '- If the user asks for a photorealistic image, generate a professional photography-style prompt.\n'
        '- Never change the subject unless necessary for quality improvement.\n'
        '- Return ONLY the final image generation prompt.\n'
        '- No explanations, no markdown, no extra text.'
    )

    model_name = "gemini-1.5-flash"
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={GEMINI_API_KEY}"

    request_body = {
        "contents": [{"parts": [{"text": enhancer_system_prompt}]}],
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 512},
    }

    try:
        req = request.Request(
            endpoint,
            method="POST",
            data=json.dumps(request_body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        with request.urlopen(req, timeout=20) as response:
            payload = json.loads(response.read().decode("utf-8"))

        candidates = payload.get("candidates", [])
        if candidates:
            enhanced = candidates[0]["content"]["parts"][0]["text"].strip()
            # Strip any accidental markdown wrapping
            if enhanced.startswith('"') and enhanced.endswith('"'):
                enhanced = enhanced[1:-1]
            if enhanced:
                print(f"[Prompt Enhancer] Original: {user_prompt}")
                print(f"[Prompt Enhancer] Enhanced: {enhanced}")
                return enhanced
    except Exception as exc:
        print(f"[Prompt Enhancer] Failed, using original prompt: {exc}")
    
    return user_prompt


def _normalize_prompt(prompt: str, business_name: str, detail: str, category: str, style: str) -> str:
    template_references = (
        "1. Pure: Minimalist dark charcoal/black backdrop, massive centered text, premium water.\n"
        "2. Reva: Dark gray base, dense bubble circle pattern, lime-green vertical title.\n"
        "3. OpenLate: Pure black backdrop, centered white Greek symbol Phi, serif brand/taglines.\n"
        "4. OneBurger: Pure white backdrop, centered black Greek symbol Phi, bold uppercase title.\n"
        "5. Mountain: Alpine mountains/snow peaks, blue-green gradients, script title, wave base.\n"
        "6. Brandex: Blue side geometric zigzags, central badge with sailboat icon, large bold initial.\n"
        "7. Forever: Diagonal blue-white split, vertical typography, circle droplet frames.\n"
        "8. WaveUp: Gray base, concentric ripple line accents, blue wave swirl logo, horizontal split.\n"
        "9. Fiji: Multi-colored vertical top stripes, red script accent, green slab-serif title.\n"
        "10. Myst: Overlapping green, dark blue, cyan, and light green organic blob droplets."
    )
    
    return (
        f"You are a master designer AI. The user has described their desired packaging design: '{prompt}'.\n"
        f"Their business name is: '{business_name}'. Category: '{category}'. Style: '{style}'.\n"
        "Based on their description, you need to map their request to the 3 best fitting templates from our library below:\n\n"
        f"{template_references}\n\n"
        "Please return EXACTLY a JSON array of 3 objects, each with the following keys:\n"
        "- template_name: The exact name of the matched template (e.g., 'Pure', 'Reva', etc.).\n"
        "- business_name: The brand name to use (usually the user's business name).\n"
        "- bottle_text: A catchy short tagline or subtitle derived from the prompt (e.g., 'PREMIUM QUALITY', 'SPRING WATER').\n"
        "- category: The best category from (hotel, restaurant, cafe, event, gym, corporate, general).\n"
        "- style: The visual style (e.g. 'modern', 'premium').\n"
        "DO NOT output markdown formatting like ```json ... ```, just the raw JSON array."
    )

def generate_ai_designs(
    prompt: str,
    business_name: str,
    count: int = 3,
    detail: str = "medium",
    category: str = "general",
    style: str = "modern",
    enhance_prompt: bool = True,
) -> list[dict]:
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is missing on the server.")

    safe_count = max(1, min(count, 4))

    # Optionally enhance the user's prompt before mapping to templates
    effective_prompt = prompt
    if enhance_prompt:
        effective_prompt = enhance_user_prompt(prompt)
    
    # We use gemini-1.5-flash text model instead of image model due to quota limits,
    # and instead map the prompt to our existing generative templates in design_engine.py
    model_name = "gemini-1.5-flash"
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={GEMINI_API_KEY}"
    
    request_body = {
        "contents": [
            {
                "parts": [
                    {"text": _normalize_prompt(effective_prompt, business_name, detail, category, style)}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.45,
            "responseMimeType": "application/json"
        },
    }

    try:
        req = request.Request(
            endpoint,
            method="POST",
            data=json.dumps(request_body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        with request.urlopen(req, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
            
        candidates = payload.get("candidates", [])
        if not candidates:
            raise ValueError("No response from Gemini API.")
            
        text_response = candidates[0]["content"]["parts"][0]["text"].strip()
        
        # Clean any accidental markdown markdown JSON formatting
        if text_response.startswith("```json"):
            text_response = text_response[7:]
        if text_response.endswith("```"):
            text_response = text_response[:-3]
            
        extracted_data = json.loads(text_response.strip())
        
        if not isinstance(extracted_data, list):
            extracted_data = [extracted_data]
            
        designs = []
        for i, data in enumerate(extracted_data[:safe_count]):
            # Use generate_designs to create the actual image based on the chosen template
            fallback_res = generate_designs(
                business_name=data.get("business_name", business_name).upper()[:15],
                bottle_text=data.get("bottle_text", "Premium Water")[:20],
                category=data.get("category", category),
                bottle_size="500ml",
                style=data.get("style", style),
                count=1, # Generate 1 per template
                force_template=data.get("template_name")
            )
            if fallback_res:
                generated = fallback_res[0]
                generated["name"] = f"AI Concept {i + 1} - {data.get('template_name', 'Custom')}"
                designs.append(generated)
                
        if designs:
            return designs

    except Exception as exc:
        print(f"Gemini API Text Error: {exc}")
        # Fallback if parsing or API fails
        pass

    # Graceful fallback so Studio remains functional
    fallback = generate_designs(
        business_name=business_name or "VISTAARWATER",
        bottle_text=effective_prompt[:34] or "Premium Water",
        category=category or "general",
        bottle_size="500ml",
        style=style or "modern",
        count=safe_count,
    )
    if fallback:
        return fallback
    raise ValueError("Gemini failed and fallback failed.")
