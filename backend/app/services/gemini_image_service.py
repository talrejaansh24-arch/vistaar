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

import urllib.parse
import uuid

def generate_ai_designs(
    prompt: str,
    business_name: str,
    count: int = 3,
    detail: str = "medium",
    category: str = "general",
    style: str = "modern",
    enhance_prompt: bool = True,
) -> list[dict]:
    safe_count = max(1, min(count, 12))
    
    # Enhance prompt for better image quality
    effective_prompt = prompt
    if enhance_prompt and GEMINI_API_KEY:
        try:
            effective_prompt = enhance_user_prompt(prompt)
        except:
            pass

    designs = []
    import time
    
    # Generate actual unique flat label backgrounds via Pollinations AI
    for i in range(safe_count):
        # We add some variation to the prompt to ensure unique images
        variation = ["masterpiece, seamless abstract pattern", "highly detailed beautiful gradient", "premium elegant texture", "hyperrealistic graphic art"][i % 4]
        
        # VERY STRICT PROMPT: We ONLY want a flat background for a label. NO text, NO bottle, NO 3D objects.
        full_prompt = f"A beautiful, colorful, completely flat 2D rectangular background graphic texture for a {category} label. Theme: {style}. {effective_prompt}. {variation}. NO TEXT, NO WORDS, NO FONTS, NO BOTTLE SHAPE, NO 3D, just the flat artwork pattern."
        
        encoded_prompt = urllib.parse.quote(full_prompt)
        # Append a unique seed so we get distinct images per iteration
        seed = int(time.time() * 1000) + i
        image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=1024&nologo=true&seed={seed}"
        
        designs.append({
            "id": f"ai_{uuid.uuid4().hex[:8]}",
            "name": f"AI Concept {i + 1} - {business_name}",
            "preview_url": image_url,
            "base_image_url": image_url, # Allow importing into Editor as background
            "style": style,
            "colors": ["#ffffff", "#000000"],
            "business_name": business_name,
            "bottle_text": prompt[:30],
            "template_id": None
        })
        
    return designs
