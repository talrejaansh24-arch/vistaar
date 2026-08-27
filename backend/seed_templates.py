import os
import sys
from pathlib import Path

# Add backend dir to python path
sys.path.append(str(Path(__file__).resolve().parent))

from app.database import SessionLocal, engine
from app.models import DesignTemplate
from app.services.design_engine import (
    draw_brandex_style, draw_forever_style, draw_waveup_style,
    draw_fiji_style, draw_myst_style, draw_pure_style,
    draw_reva_style, draw_openlate_style, draw_oneburger_style,
    draw_mountain_style, draw_vivia_style, draw_melt_style,
    draw_lifewtrart1_style, draw_lifewtrart2_style, draw_lifewtrart3_style
)
from PIL import Image, ImageDraw
from app.config import TEMPLATES_DIR

def seed():
    # Make sure template directory exists
    TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
    
    db = SessionLocal()
    
    # Clear existing templates to start fresh
    db.query(DesignTemplate).delete()
    db.commit()

    # Define 20 premium templates
    templates_meta = [
        # Luxury
        {"name": "Pure Sparkle", "style": "Pure", "category": "hotel", "style_group": "luxury", "colors": ["#1a1a1a", "#ffffff", "#888888"], "draw": draw_pure_style, "tagline": "Premium Sparkling Water"},
        {"name": "Royal Night", "style": "OpenLate", "category": "hotel", "style_group": "luxury", "colors": ["#000000", "#ffffff", "#ffffff"], "draw": draw_openlate_style, "tagline": "Royal Palace Select"},
        {"name": "Melt Gold", "style": "Melt", "category": "restaurant", "style_group": "luxury", "colors": ["#191c1e", "#ffffff", "#e60028"], "draw": draw_melt_style, "tagline": "Reserved Selection"},
        {"name": "Vivia Crimson", "style": "Vivia", "category": "event", "style_group": "luxury", "colors": ["#e60028", "#ffffff", "#009688"], "draw": draw_vivia_style, "tagline": "Grand Gala Edition"},
        
        # Modern
        {"name": "Brandex Pro", "style": "Brandex", "category": "corporate", "style_group": "modern", "colors": ["#00a8ff", "#ffffff", "#00a8ff"], "draw": draw_brandex_style, "tagline": "Executive Water"},
        {"name": "WaveUp Neo", "style": "WaveUp", "category": "corporate", "style_group": "modern", "colors": ["#ebf0f5", "#0b1e50", "#00a8ff"], "draw": draw_waveup_style, "tagline": "Ocean Fresh Blend"},
        {"name": "Forever Digital", "style": "Forever", "category": "corporate", "style_group": "modern", "colors": ["#0096f2", "#ffffff", "#2d3436"], "draw": draw_forever_style, "tagline": "100% Recyclable Packaging"},
        {"name": "LifeWtr Alpine", "style": "LifeWtrArt1", "category": "event", "style_group": "modern", "colors": ["#ffffff", "#000000", "#ff6b6b"], "draw": draw_lifewtrart1_style, "tagline": "Art Series One"},
        
        # Minimal
        {"name": "Myst Oasis", "style": "Myst", "category": "hotel", "style_group": "minimal", "colors": ["#ffffff", "#009650", "#0a1d50"], "draw": draw_myst_style, "tagline": "Natural Artesian Springs"},
        {"name": "Reva Pristine", "style": "Reva", "category": "gym", "style_group": "minimal", "colors": ["#1e2022", "#a3e635", "#ffffff"], "draw": draw_reva_style, "tagline": "Electrolytes Infused"},
        {"name": "OneBurger Minimal", "style": "OneBurger", "category": "restaurant", "style_group": "minimal", "colors": ["#ffffff", "#000000", "#000000"], "draw": draw_oneburger_style, "tagline": "Pure Elements"},
        
        # Classic
        {"name": "Fiji Traditional", "style": "Fiji", "category": "hotel", "style_group": "classic", "colors": ["#ffffff", "#e60028", "#009650"], "draw": draw_fiji_style, "tagline": "Original Mineral Water"},
        {"name": "LifeWtr Doodle Art", "style": "LifeWtrArt2", "category": "cafe", "style_group": "classic", "colors": ["#f5f6fa", "#000000", "#ff6b6b"], "draw": draw_lifewtrart2_style, "tagline": "Playful Craft Brew"},
        {"name": "LifeWtr Diamond Prism", "style": "LifeWtrArt3", "category": "cafe", "style_group": "classic", "colors": ["#ffffff", "#000000", "#ff007f"], "draw": draw_lifewtrart3_style, "tagline": "Diamond Cuts Series"},
        
        # Eco
        {"name": "Mountain Eco", "style": "Mountain", "category": "general", "style_group": "eco", "colors": ["#dff9fb", "#130cb7", "#52c234"], "draw": draw_mountain_style, "tagline": "100% Biodegradable"},
        {"name": "Myst Organic", "style": "Myst", "category": "general", "style_group": "eco", "colors": ["#ffffff", "#009650", "#0a1d50"], "draw": draw_myst_style, "tagline": "Green Organic Spring"},
        {"name": "WaveUp Nature", "style": "WaveUp", "category": "general", "style_group": "eco", "colors": ["#ebf0f5", "#0b1e50", "#00a8ff"], "draw": draw_waveup_style, "tagline": "Earth Conscious Blend"},

        # More Premium Additions (To reach 20+)
        {"name": "Lush Premium", "style": "Myst", "category": "restaurant", "style_group": "luxury", "colors": ["#ffffff", "#009650", "#0a1d50"], "draw": draw_myst_style, "tagline": "Premium Selected Artesian"},
        {"name": "Aura Corporate", "style": "Brandex", "category": "corporate", "style_group": "classic", "colors": ["#00a8ff", "#ffffff", "#00a8ff"], "draw": draw_brandex_style, "tagline": "Premium Partner Water"},
        {"name": "Eco Alpine", "style": "Mountain", "category": "general", "style_group": "eco", "colors": ["#dff9fb", "#130cb7", "#52c234"], "draw": draw_mountain_style, "tagline": "Alpine Valley Source"},
        {"name": "Classic Bistro", "style": "Fiji", "category": "restaurant", "style_group": "classic", "colors": ["#ffffff", "#e60028", "#009650"], "draw": draw_fiji_style, "tagline": "Bistro Special Edition"}
    ]

    width, height = 500, 300 # Standard 500ml size

    for i, meta in enumerate(templates_meta):
        filename = f"template_{i+1}.png"
        filepath = TEMPLATES_DIR / filename
        
        # Draw image
        img = Image.new("RGB", (width, height), (255, 255, 255))
        draw = ImageDraw.Draw(img)
        meta["draw"](draw, width, height, meta["name"], meta["tagline"])
        img.save(str(filepath), "PNG", quality=95)
        
        # Save record in database
        template = DesignTemplate(
            name=meta["name"],
            category=meta["category"],
            style=meta["style_group"],
            file_path=f"/static/templates/{filename}",
            colors=meta["colors"]
        )
        db.add(template)
        
    db.commit()
    print(f"Successfully seeded {len(templates_meta)} premium templates in database!")
    db.close()

if __name__ == "__main__":
    seed()
