import uuid
from PIL import Image, ImageDraw, ImageFont
from app.config import GENERATED_DIR, TEMPLATES_DIR

# ── Color Palettes by Category ──
CATEGORY_PALETTES = {
    "hotel": [
        {"bg": "#1a1a2e", "text": "#e6d5b8", "accent": "#c4956a", "name": "Royal Night"},
        {"bg": "#2d3436", "text": "#dfe6e9", "accent": "#00b894", "name": "Elegant Dark"},
        {"bg": "#f8f5f1", "text": "#2d3436", "accent": "#6c5ce7", "name": "Premium Light"},
        {"bg": "#0c1445", "text": "#f8f5f1", "accent": "#f0c27f", "name": "Sapphire Gold"},
    ],
    "restaurant": [
        {"bg": "#2d1b00", "text": "#ffeaa7", "accent": "#e17055", "name": "Warm Rustic"},
        {"bg": "#1e3a3a", "text": "#f8f5f1", "accent": "#55efc4", "name": "Fresh Green"},
        {"bg": "#f9f3ed", "text": "#2d1b00", "accent": "#d63031", "name": "Classic Red"},
        {"bg": "#0a192f", "text": "#64ffda", "accent": "#f8f5f1", "name": "Ocean Deep"},
    ],
    "cafe": [
        {"bg": "#3e2723", "text": "#efebe9", "accent": "#ff8a65", "name": "Coffee Brown"},
        {"bg": "#faf3e0", "text": "#3e2723", "accent": "#ff6b6b", "name": "Latte Cream"},
        {"bg": "#1b1b2f", "text": "#e4e4e4", "accent": "#e43f5a", "name": "Mocha Night"},
        {"bg": "#f5e6cc", "text": "#4a3728", "accent": "#2d9cdb", "name": "Artisan Blend"},
    ],
    "event": [
        {"bg": "#0f0c29", "text": "#f8f5f1", "accent": "#f953c6", "name": "Party Neon"},
        {"bg": "#141e30", "text": "#f8f5f1", "accent": "#00d2ff", "name": "Electric Blue"},
        {"bg": "#f8f5f1", "text": "#141e30", "accent": "#f7971e", "name": "Sunrise Gold"},
        {"bg": "#200122", "text": "#f8f5f1", "accent": "#6f0000", "name": "Grand Velvet"},
    ],
    "gym": [
        {"bg": "#0d0d0d", "text": "#f8f5f1", "accent": "#ff4757", "name": "Power Red"},
        {"bg": "#1a1a2e", "text": "#e4e4e4", "accent": "#00f5d4", "name": "Energy Teal"},
        {"bg": "#1e1e1e", "text": "#ffd700", "accent": "#ffffff", "name": "Champion Gold"},
        {"bg": "#0f3460", "text": "#f8f5f1", "accent": "#e94560", "name": "Sport Active"},
    ],
    "corporate": [
        {"bg": "#1a1a2e", "text": "#f8f5f1", "accent": "#4fc3f7", "name": "Corporate Blue"},
        {"bg": "#f8f5f1", "text": "#1a1a2e", "accent": "#0288d1", "name": "Clean White"},
        {"bg": "#263238", "text": "#eceff1", "accent": "#80cbc4", "name": "Professional"},
        {"bg": "#37474f", "text": "#ffffff", "accent": "#ffab40", "name": "Executive"},
    ],
    "general": [
        {"bg": "#0a192f", "text": "#f8f5f1", "accent": "#64ffda", "name": "Modern Teal"},
        {"bg": "#f8f5f1", "text": "#2d3436", "accent": "#6c5ce7", "name": "Soft Purple"},
        {"bg": "#1e272e", "text": "#d1d8e0", "accent": "#0be881", "name": "Fresh Mint"},
        {"bg": "#faf3e0", "text": "#2d3436", "accent": "#fd9644", "name": "Warm Amber"},
    ],
}

# ── Font Styles ──
FONT_STYLES = [
    {"name_size": 42, "text_size": 20, "spacing": 8, "style": "Modern"},
    {"name_size": 38, "text_size": 21, "spacing": 9, "style": "Premium"},
    {"name_size": 34, "text_size": 22, "spacing": 10, "style": "Minimal"},
    {"name_size": 45, "text_size": 18, "spacing": 7, "style": "Bold"},
]

STYLE_PREFS = {
    "modern": ["Modern", "Minimal"],
    "premium": ["Premium", "Modern"],
    "minimal": ["Minimal", "Modern"],
    "luxury": ["Premium", "Bold"],
    "eco": ["Minimal", "Modern"],
}

# ── Label Layouts ──
LAYOUTS = [
    {"name": "Centered", "name_y_ratio": 0.30, "text_y_ratio": 0.55, "align": "center"},
    {"name": "Top Heavy", "name_y_ratio": 0.20, "text_y_ratio": 0.50, "align": "center"},
    {"name": "Bottom Focus", "name_y_ratio": 0.40, "text_y_ratio": 0.65, "align": "center"},
    {"name": "Split", "name_y_ratio": 0.25, "text_y_ratio": 0.70, "align": "center"},
]

# Label dimensions based on bottle size
LABEL_SIZES = {
    "250ml": (400, 250),
    "500ml": (500, 300),
    "1000ml": (600, 350),
}


def get_fonts():
    """Helper to load standard sans-serif system fonts with fallbacks."""
    try:
        # Standard system font on Windows/Linux/macOS
        font_name = ImageFont.truetype("arial.ttf", 13)
        font_title = ImageFont.truetype("arial.ttf", 22)
        font_huge = ImageFont.truetype("arial.ttf", 46)
        font_small = ImageFont.truetype("arial.ttf", 15)
    except Exception:
        try:
            # Fallback to standard times or others if arial is missing
            font_name = ImageFont.truetype("times.ttf", 13)
            font_title = ImageFont.truetype("times.ttf", 22)
            font_huge = ImageFont.truetype("times.ttf", 46)
            font_small = ImageFont.truetype("times.ttf", 15)
        except Exception:
            font_name = ImageFont.load_default()
            font_title = ImageFont.load_default()
            font_huge = ImageFont.load_default()
            font_small = ImageFont.load_default()
    return font_name, font_title, font_huge, font_small


def draw_brandex_style(draw, width, height, business_name, tagline):
    """Draw Brandex Style: blue geometric zigzag side panels, central oval pill badge with a sailboat icon and large initial."""
    bg_color = (0, 168, 255) # Cyan-blue
    accent_color = (255, 255, 255) # White
    
    # 1. Background fill
    draw.rectangle([(0, 0), (width, height)], fill=bg_color)
    
    # 2. Geometric side zigzags
    # Left side
    draw.line([(10, 10), (50, 50), (10, 90), (50, 130), (10, 170), (50, 210), (10, 250), (50, 290)], fill=accent_color, width=4)
    draw.line([(30, 10), (70, 50), (30, 90), (70, 130), (30, 170), (70, 210), (30, 250), (70, 290)], fill=accent_color, width=2)
    # Right side
    draw.line([(width-10, 10), (width-50, 50), (width-10, 90), (width-50, 130), (width-10, 170), (width-50, 210), (width-10, 250), (width-50, 290)], fill=accent_color, width=4)
    draw.line([(width-30, 10), (width-70, 50), (width-30, 90), (width-70, 130), (width-30, 170), (width-70, 210), (width-30, 250), (width-70, 290)], fill=accent_color, width=2)
    
    # 3. Central pill shape
    pill_w, pill_h = 160, 220
    px1 = (width - pill_w) // 2
    py1 = (height - pill_h) // 2
    px2 = px1 + pill_w
    py2 = py1 + pill_h
    draw.rounded_rectangle([px1, py1, px2, py2], radius=40, outline=accent_color, width=3, fill=bg_color)
    
    font_name, font_title, font_huge, font_small = get_fonts()
    
    # 4. Text and logo elements
    # Sailboat shape
    draw.text((width // 2, py1 + 25), "⛵", fill=accent_color, font=font_small, anchor="mm")
    
    # Brand Name text
    draw.text((width // 2, py1 + 55), business_name.upper()[:12], fill=accent_color, font=font_name, anchor="mm")
    
    # Huge initial B or brand letter
    initial = (business_name or "B")[0].upper()
    draw.text((width // 2, py1 + 110), initial, fill=accent_color, font=font_huge, anchor="mm")
    
    # Soda / tagline text
    tag = tagline.upper()[:10] if tagline else "SODA"
    draw.text((width // 2, py1 + 165), tag, fill=accent_color, font=font_title, anchor="mm")
    
    # Bottom subtext
    draw.text((width // 2, py1 + 195), "NATURAL & PURE", fill=accent_color, font=font_name, anchor="mm")


def draw_forever_style(draw, width, height, business_name, tagline):
    """Draw Forever Water Style: wavy/diagonal split, vertical typography, and side metadata text."""
    blue_color = (0, 150, 242)
    white_color = (255, 255, 255)
    text_color = (45, 52, 54) # Charcoal
    
    # 1. Background fill
    draw.rectangle([(0, 0), (width, height)], fill=white_color)
    
    # 2. Diagonal split
    draw.polygon([(0, 0), (int(width * 0.45), 0), (int(width * 0.65), height), (0, height)], fill=blue_color)
    
    # 3. Soft circles representation of water droplets on the right white side
    for cx, cy, r in [(width - 80, 50, 12), (width - 40, 120, 8), (width - 120, 200, 15), (width - 70, 245, 10)]:
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=(220, 230, 242), width=1)
        draw.ellipse([cx-r+2, cy-r+2, cx-r+5, cy-r+5], fill=(225, 240, 255))
        
    font_name, font_title, font_huge, font_small = get_fonts()
    
    # 4. Vertical text split
    words = business_name.split(None, 1)
    word1 = words[0].upper() if len(words) > 0 else "FOREVER"
    word2 = words[1].upper() if len(words) > 1 else "WATER"
    
    y_start = height * 0.12
    # Draw word1 vertically over blue
    for i, char in enumerate(word1[:8]):
        draw.text((int(width * 0.18), int(y_start + i * 26)), char, fill=white_color, font=font_title, anchor="mm")
        
    # Draw word2 vertically over white
    for i, char in enumerate(word2[:8]):
        draw.text((int(width * 0.38), int(y_start + i * 26)), char, fill=text_color, font=font_title, anchor="mm")
        
    # Disclaimer text at bottom left
    tag = tagline if tagline else "100% of proceeds go to clean water for children"
    draw.text((int(width * 0.28), height - 20), tag[:48], fill=white_color, font=font_name, anchor="mm")
    
    # Vertical line and details on the right
    draw.line([(width - 150, 20), (width - 150, height - 20)], fill=(210, 218, 226), width=1)
    draw.text((width - 135, height // 2), "MINERALS ADDED FOR TASTE • 100% RECYCLABLE", fill=(120, 130, 140), font=font_name, anchor="mm")


def draw_waveup_style(draw, width, height, business_name, tagline):
    """Draw WaveUp Style: silver backdrop, circular ripple lines, blue wave swirl logo, and vertical text."""
    draw.rectangle([(0, 0), (width, height)], fill=(235, 240, 245))
    
    # Concentric ripples
    for r in range(40, 160, 30):
        draw.ellipse([width//2 - r, height//2 - r - 20, width//2 + r, height//2 + r - 20], outline=(220, 228, 235), width=1)
        
    # Swirl wave logo
    cx, cy = width // 2, height // 2 - 20
    draw.ellipse([cx-40, cy-40, cx+40, cy+40], fill=(0, 168, 255))
    draw.ellipse([cx-32, cy-48, cx+48, cy+32], fill=(235, 240, 245))
    draw.ellipse([cx-25, cy-25, cx+25, cy+25], fill=(0, 210, 255))
    draw.ellipse([cx-20, cy-30, cx+30, cy+20], fill=(235, 240, 245))
    
    font_name, font_title, font_huge, font_small = get_fonts()
    
    text_part1 = business_name[:10]
    text_part2 = tagline[:10] if tagline else "UP"
    
    # Horizontal layout with wave prefix and suffix
    draw.text((width // 2 - 12, height - 70), text_part1, fill=(11, 30, 80), font=font_title, anchor="rm")
    draw.text((width // 2 - 8, height - 70), text_part2, fill=(0, 168, 255), font=font_title, anchor="lm")
    
    draw.text((width // 2, height - 35), "OCEAN FRESH DRINKING WATER", fill=(100, 110, 120), font=font_name, anchor="mm")


def draw_fiji_style(draw, width, height, business_name, tagline):
    """Draw Fiji Style: multi-colored vertical header stripes, Love subtext, and slab green main brand text with double shadows."""
    stripes = [
        (10, 30, 80),    # Dark Blue
        (0, 168, 255),   # Light Blue
        (255, 255, 255), # White
        (230, 0, 40),    # Red
        (255, 215, 0),   # Yellow
        (0, 150, 80)     # Green
    ]
    
    stripe_h = int(height * 0.25)
    stripe_w = width // len(stripes)
    
    draw.rectangle([(0, 0), (width, height)], fill=(255, 255, 255))
    
    for i, color in enumerate(stripes):
        x1 = i * stripe_w
        x2 = width if i == len(stripes) - 1 else x1 + stripe_w
        draw.rectangle([(x1, 0), (x2, stripe_h)], fill=color)
        
    font_name, font_title, font_huge, font_small = get_fonts()
    
    # Love subtext
    draw.text((width // 2, stripe_h + 35), "Love", fill=(230, 0, 40), font=font_title, anchor="mm")
    
    # Green bold brand name with shadows
    brand = business_name.upper()[:15]
    cx, cy = width // 2, stripe_h + 90
    draw.text((cx + 3, cy + 3), brand, fill=(255, 215, 0), font=font_huge, anchor="mm")
    draw.text((cx + 1, cy + 1), brand, fill=(30, 30, 30), font=font_huge, anchor="mm")
    draw.text((cx, cy), brand, fill=(0, 150, 80), font=font_huge, anchor="mm")
    
    # Tagline bottom
    tag = tagline if tagline else "NATURAL MINERAL WATER"
    draw.text((width // 2, stripe_h + 150), tag.upper(), fill=(0, 168, 255), font=font_name, anchor="mm")


def draw_myst_style(draw, width, height, business_name, tagline):
    """Draw Myst Style: overlapping organic color droplets/blobs with centered clean white brand text."""
    draw.rectangle([(0, 0), (width, height)], fill=(255, 255, 255))
    
    droplets = [
        (width // 2 - 40, height // 2 - 10, 85, (0, 150, 80)),    # Green blob
        (width // 2 + 50, height // 2 - 30, 75, (10, 30, 80)),    # Dark Blue blob
        (width // 2 - 70, height // 2 + 30, 60, (0, 168, 255)),   # Light Blue blob
        (width // 2 + 20, height // 2 + 40, 50, (115, 200, 80)),  # Light Green blob
        (width // 2 - 10, height // 2 - 70, 45, (0, 210, 255)),   # Cyan blob
    ]
    
    for cx, cy, r, color in droplets:
        rx = int(r * 1.2)
        ry = int(r * 0.95)
        draw.ellipse([cx-rx, cy-ry, cx+rx, cy+ry], fill=color)
        
    font_name, font_title, font_huge, font_small = get_fonts()
    
    brand = business_name.upper()[:12]
    cx, cy = width // 2 - 20, height // 2 - 10
    draw.text((cx, cy), brand, fill=(255, 255, 255), font=font_title, anchor="mm")
    
    tag = tagline if tagline else "NATURAL MINERAL WATER"
    draw.text((cx, cy + 30), tag.upper()[:24], fill=(255, 255, 255), font=font_name, anchor="mm")


def draw_pure_style(draw, width, height, business_name, tagline):
    """Draw Pure Style: Charcoal/black base, clean spaced 'NEW ZEALAND', giant centered white 'Pure.', and artesian subtexts."""
    bg_color = (26, 26, 26) # Charcoal
    text_color = (255, 255, 255) # White
    accent_color = (136, 136, 136) # Muted Gray
    
    # Background fill
    draw.rectangle([(0, 0), (width, height)], fill=bg_color)
    
    font_name, font_title, font_huge, font_small = get_fonts()
    
    # Sparkling. text
    draw.text((40, 35), "Sparkling.", fill=accent_color, font=font_small, anchor="ls")
    
    # NEW ZEALAND
    nz_text = "N E W   Z E A L A N D"
    draw.text((width // 2, int(height * 0.40)), nz_text, fill=accent_color, font=font_name, anchor="mm")
    
    # Large "Pure." text
    main_name = (business_name or "Pure").strip()
    if main_name.lower() in ("vistaar", "vistaarwater"):
        main_name = "Pure."
    else:
        if not main_name.endswith("."):
            main_name = main_name + "."
            
    draw.text((width // 2, int(height * 0.58)), main_name, fill=text_color, font=font_huge, anchor="mm")
    
    # ARTESIAN WATER
    tag = tagline.upper() if tagline else "ARTESIAN WATER"
    draw.text((width // 2, int(height * 0.76)), tag, fill=text_color, font=font_name, anchor="mm")
    
    # WAI PUNA MANAWA
    draw.text((width // 2, int(height * 0.85)), "WAI PUNA MANAWA", fill=accent_color, font=font_small, anchor="mm")


def draw_reva_style(draw, width, height, business_name, tagline):
    """Draw Reva Style: Dark gray backdrop with a dense bubble circle pattern, large vertical lime-green 'REVA' text, and bottom stats."""
    bg_color = (30, 32, 34) # Dark gray #1e2022
    lime_green = (163, 230, 53) # Lime Green #a3e635
    text_color = (255, 255, 255) # White
    
    # Background fill
    draw.rectangle([(0, 0), (width, height)], fill=bg_color)
    
    # Bubble pattern
    import random
    rnd = random.Random(42)
    for _ in range(35):
        cx = rnd.randint(10, width - 10)
        cy = rnd.randint(10, height - 10)
        r = rnd.randint(2, 8)
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=(255, 255, 255, 30), width=1)
        
    font_name, font_title, font_huge, font_small = get_fonts()
    
    # Vertical brand name text
    name = (business_name or "REVA").upper()
    y_start = height * 0.12
    for i, char in enumerate(name[:8]):
        draw.text((int(width * 0.35), int(y_start + i * 26)), char, fill=lime_green, font=font_title, anchor="mm")
        
    # Vertical divider line
    draw.line([(width - 160, 20), (width - 160, height - 20)], fill=(80, 80, 80), width=1)
    
    # Stats on the right
    stats = [
        "pH LEVEL: 7.8",
        "TDS: 120 PPM",
        "SODIUM: 2.1 mg/L",
        "CALCIUM: 12 mg/L",
    ]
    for i, stat in enumerate(stats):
        draw.text((width - 145, int(height * 0.25 + i * 30)), stat, fill=text_color, font=font_name, anchor="lm")
        
    # Bottom tagline
    tag = tagline if tagline else "NATURAL BUBBLE SPRING"
    draw.text((width // 2, height - 20), tag.upper()[:40], fill=text_color, font=font_name, anchor="mm")


def draw_openlate_style(draw, width, height, business_name, tagline):
    """Draw OpenLate Style: High-contrast black, white Greek symbol Φ in center, serif 'OPEN LATE' subtext."""
    bg_color = (0, 0, 0)
    accent_color = (255, 255, 255)
    
    # Background fill
    draw.rectangle([(0, 0), (width, height)], fill=bg_color)
    
    # Draw Greek Symbol Phi Φ
    cx, cy = width // 2, height // 2 - 25
    r = 30
    draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=accent_color, width=3)
    draw.line([(cx, cy - r - 15), (cx, cy + r + 15)], fill=accent_color, width=3)
    
    font_name, font_title, font_huge, font_small = get_fonts()
    
    # Brand Name
    brand = (business_name or "OPEN LATE").upper()
    draw.text((width // 2, int(height * 0.70)), brand, fill=accent_color, font=font_title, anchor="mm")
    
    # Tagline
    tag = tagline.upper() if tagline else "BECAUSE TASTEBUDS DON'T SLEEP"
    draw.text((width // 2, int(height * 0.85)), tag, fill=accent_color, font=font_name, anchor="mm")


def draw_oneburger_style(draw, width, height, business_name, tagline):
    """Draw OneBurger Style: Pure white base, black symbol Φ in center, bold black 'ONEBURGER' uppercase text."""
    bg_color = (255, 255, 255)
    accent_color = (0, 0, 0)
    
    # Background fill
    draw.rectangle([(0, 0), (width, height)], fill=bg_color)
    
    # Draw Greek Symbol Phi Φ
    cx, cy = width // 2, height // 2 - 35
    r = 25
    draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=accent_color, width=3)
    draw.line([(cx, cy - r - 12), (cx, cy + r + 12)], fill=accent_color, width=3)
    
    font_name, font_title, font_huge, font_small = get_fonts()
    
    # Brand Name
    brand = (business_name or "ONEBURGER").upper()
    draw.text((width // 2, int(height * 0.58)), brand, fill=accent_color, font=font_title, anchor="mm")
    
    # Tagline
    tag = tagline.upper() if tagline else "ONEBURGER.COM"
    draw.text((width // 2, int(height * 0.82)), tag, fill=accent_color, font=font_name, anchor="mm")


def draw_mountain_style(draw, width, height, business_name, tagline):
    """Draw Mountain Style: Alpine mountains graphic, green-to-blue gradient overlays, cursive white 'Water' textbox."""
    bg_color = (223, 249, 251) # Light blue-green #dff9fb
    draw.rectangle([(0, 0), (width, height)], fill=bg_color)
    
    # Mountains polygons
    draw.polygon([(50, height), (220, height - 160), (380, height)], fill=(9, 132, 227))
    draw.polygon([(180, height - 120), (220, height - 160), (260, height - 120)], fill=(255, 255, 255))
    
    draw.polygon([(260, height), (420, height - 180), (580, height)], fill=(0, 184, 148))
    draw.polygon([(380, height - 135), (420, height - 180), (460, height - 135)], fill=(255, 255, 255))
    
    # Water base
    draw.rectangle([(0, height - 45), (width, height)], fill=(9, 132, 227))
    
    font_name, font_title, font_huge, font_small = get_fonts()
    
    # Brand text
    brand = (business_name or "MOUNTAIN").upper()
    draw.text((width // 2, int(height * 0.28)), brand, fill=(11, 30, 80), font=font_title, anchor="mm")
    
    # Script word "Water"
    draw.text((width // 2, int(height * 0.52)), "Water", fill=(255, 255, 255), font=font_huge, anchor="mm")
    
    # Minerals subtext
    tag = tagline if tagline else "High in Natural Minerals"
    draw.text((width // 2, height - 22), tag, fill=(255, 255, 255), font=font_name, anchor="mm")


def draw_vivia_style(draw, width, height, business_name, tagline):
    """Draw Vivia Style: Bright red background, cursive white script title, small uppercase FONTE subtitle above, and curved cyan & white waves at bottom."""
    red_color = (230, 0, 40)
    draw.rectangle([(0, 0), (width, height)], fill=red_color)
    
    # Bottom waves
    draw.polygon([
        (0, height),
        (0, height - 30),
        (width // 3, height - 20),
        (2 * width // 3, height - 55),
        (width, height - 40),
        (width, height)
    ], fill=(255, 255, 255))
    
    draw.polygon([
        (0, height),
        (0, height - 20),
        (width // 3, height - 35),
        (2 * width // 3, height - 15),
        (width, height - 30),
        (width, height)
    ], fill=(0, 150, 136))
    
    draw.polygon([
        (0, height),
        (0, height - 12),
        (width // 3, height - 27),
        (2 * width // 3, height - 8),
        (width, height - 22),
        (width, height)
    ], fill=(240, 248, 255))
    
    font_name, font_title, font_huge, font_small = get_fonts()
    draw.text((width // 2, height // 2 - 45), "FONTE", fill=(255, 255, 255), font=font_small, anchor="mm")
    brand = business_name.strip() if business_name else "Vivia"
    draw.text((width // 2, height // 2 - 5), brand, fill=(255, 255, 255), font=font_huge, anchor="mm")
    tag = tagline if tagline else "Natural Spring"
    draw.text((width // 2, height // 2 + 55), tag.upper(), fill=(255, 255, 255), font=font_name, anchor="mm")


def draw_melt_style(draw, width, height, business_name, tagline):
    """Draw Melt Style: Dark gray/black background with simulated water drops, tilted red label tag with NUEVA, clean uppercase brand, cursive subtext."""
    bg_color = (25, 28, 30)
    draw.rectangle([(0, 0), (width, height)], fill=bg_color)
    
    import random
    rnd = random.Random(99)
    for _ in range(40):
        cx = rnd.randint(10, width - 10)
        cy = rnd.randint(10, height - 10)
        r = rnd.randint(2, 6)
        draw.ellipse([cx-r+1, cy-r+1, cx+r+1, cy+r+1], fill=(10, 10, 12))
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(38, 42, 45))
        draw.ellipse([cx-r+1, cy-r+1, cx-r+3, cy-r+3], fill=(255, 255, 255))
        
    bx, by = width // 2, 45
    draw.polygon([
        (bx - 50, by - 12),
        (bx + 50, by - 16),
        (bx + 46, by + 12),
        (bx - 54, by + 16)
    ], fill=(230, 0, 40))
    
    font_name, font_title, font_huge, font_small = get_fonts()
    draw.text((bx - 2, by - 1), "NUEVA", fill=(255, 255, 255), font=font_small, anchor="mm")
    brand = (business_name or "MELT WATER").upper()
    draw.text((width // 2, height // 2 + 10), brand, fill=(255, 255, 255), font=font_huge, anchor="mm")
    tag = tagline if tagline else "Original"
    draw.text((width // 2, height // 2 + 65), tag, fill=(255, 255, 255), font=font_title, anchor="mm")


def draw_lifewtrart1_style(draw, width, height, business_name, tagline):
    """Draw LifeWtrArt1 Style: Colorful sloped mountains backdrop (red, yellow, blue), with a black square label block at top center."""
    draw.rectangle([(0, 0), (width, height)], fill=(255, 255, 255))
    draw.polygon([(0, height), (0, height - 70), (width, height - 120), (width, height)], fill=(44, 62, 80))
    draw.polygon([(0, height), (0, height - 160), (width - 120, height - 60), (width, height)], fill=(254, 202, 87))
    draw.polygon([(int(width * 0.2), height), (int(width * 0.4), height - 200), (width, height - 40), (width, height)], fill=(255, 107, 107))
    draw.polygon([(0, height - 190), (width, height - 250), (width, height - 120), (0, height - 120)], fill=(72, 219, 251))
    
    box_w, box_h = 100, 100
    bx1 = (width - box_w) // 2
    by1 = 20
    draw.rectangle([bx1, by1, bx1 + box_w, by1 + box_h], fill=(0, 0, 0))
    
    font_name, font_title, font_huge, font_small = get_fonts()
    brand_parts = business_name.upper().split(None, 1)
    p1 = brand_parts[0] if len(brand_parts) > 0 else "LIFE"
    p2 = brand_parts[1] if len(brand_parts) > 1 else "WTR"
    draw.text((width // 2, by1 + 30), p1[:6], fill=(255, 255, 255), font=font_title, anchor="mm")
    draw.text((width // 2, by1 + 70), p2[:6], fill=(255, 255, 255), font=font_title, anchor="mm")


def draw_lifewtrart2_style(draw, width, height, business_name, tagline):
    """Draw LifeWtrArt2 Style: Playful cartoon doodles backdrop (teal blobs, red outlines) with a black square brand box at top center."""
    draw.rectangle([(0, 0), (width, height)], fill=(245, 246, 250))
    draw.ellipse([50, 80, 150, 180], fill=(72, 219, 251))
    draw.ellipse([width - 160, 100, width - 60, 200], fill=(0, 150, 136))
    draw.ellipse([120, height - 100, 200, height - 20], fill=(255, 107, 107))
    
    draw.arc([30, 60, 170, 200], 0, 360, fill=(230, 0, 40), width=2)
    draw.arc([width - 180, 80, width - 40, 220], 0, 360, fill=(230, 0, 40), width=2)
    draw.arc([80, 120, 120, 150], 0, 180, fill=(0, 0, 0), width=3)
    draw.ellipse([75, 105, 85, 115], fill=(0, 0, 0))
    draw.ellipse([115, 105, 125, 115], fill=(0, 0, 0))
    draw.arc([width - 130, 130, width - 90, 160], 0, 180, fill=(0, 0, 0), width=3)
    draw.ellipse([width - 135, 115, width - 125, 125], fill=(0, 0, 0))
    
    box_w, box_h = 100, 100
    bx1 = (width - box_w) // 2
    by1 = 20
    draw.rectangle([bx1, by1, bx1 + box_w, by1 + box_h], fill=(0, 0, 0))
    
    font_name, font_title, font_huge, font_small = get_fonts()
    brand_parts = business_name.upper().split(None, 1)
    p1 = brand_parts[0] if len(brand_parts) > 0 else "LIFE"
    p2 = brand_parts[1] if len(brand_parts) > 1 else "WTR"
    draw.text((width // 2, by1 + 30), p1[:6], fill=(255, 255, 255), font=font_title, anchor="mm")
    draw.text((width // 2, by1 + 70), p2[:6], fill=(255, 255, 255), font=font_title, anchor="mm")


def draw_lifewtrart3_style(draw, width, height, business_name, tagline):
    """Draw LifeWtrArt3 Style: Concentric geometric diamond backdrop, with a black square brand box at top center."""
    draw.rectangle([(0, 0), (width, height)], fill=(255, 255, 255))
    cx, cy = width // 2, height // 2 + 40
    
    for size, color in [
        (240, (230, 0, 40)),
        (200, (255, 215, 0)),
        (160, (0, 168, 255)),
        (120, (255, 0, 127)),
        (80, (0, 150, 80)),
        (40, (0, 0, 0))
    ]:
        draw.polygon([
            (cx, cy - size // 2),
            (cx + size, cy),
            (cx, cy + size // 2),
            (cx - size, cy)
        ], fill=color)
        
    box_w, box_h = 100, 100
    bx1 = (width - box_w) // 2
    by1 = 20
    draw.rectangle([bx1, by1, bx1 + box_w, by1 + box_h], fill=(0, 0, 0))
    
    font_name, font_title, font_huge, font_small = get_fonts()
    brand_parts = business_name.upper().split(None, 1)
    p1 = brand_parts[0] if len(brand_parts) > 0 else "LIFE"
    p2 = brand_parts[1] if len(brand_parts) > 1 else "WTR"
    draw.text((width // 2, by1 + 30), p1[:6], fill=(255, 255, 255), font=font_title, anchor="mm")
    draw.text((width // 2, by1 + 70), p2[:6], fill=(255, 255, 255), font=font_title, anchor="mm")


def generate_designs(
    business_name: str,
    bottle_text: str = "",
    category: str = "general",
    bottle_size: str = "500ml",
    style: str = "modern",
    count: int = 8,
    force_template: str = None
) -> list:
    """Generate multiple brand-inspired design variations and save them to the static assets folder."""
    label_size = LABEL_SIZES.get(bottle_size, LABEL_SIZES["500ml"])
    width, height = label_size

    # The custom designs we generate with style group tags
    styles_meta = [
        {"name": "Brandex Geometric", "style": "Brandex", "colors": ["#00a8ff", "#ffffff", "#00a8ff"], "draw": draw_brandex_style, "style_groups": ["modern"]},
        {"name": "Forever Wave", "style": "Forever", "colors": ["#0096f2", "#ffffff", "#2d3436"], "draw": draw_forever_style, "style_groups": ["modern", "classic"]},
        {"name": "WaveUp Dynamic", "style": "WaveUp", "colors": ["#ebf0f5", "#0b1e50", "#00a8ff"], "draw": draw_waveup_style, "style_groups": ["modern", "eco"]},
        {"name": "Fiji Stripes", "style": "Fiji", "colors": ["#ffffff", "#e60028", "#009650"], "draw": draw_fiji_style, "style_groups": ["classic", "modern"]},
        {"name": "Myst Droplets", "style": "Myst", "colors": ["#ffffff", "#009650", "#0a1d50"], "draw": draw_myst_style, "style_groups": ["minimal", "eco"]},
        {"name": "Pure Artesian", "style": "Pure", "colors": ["#1a1a1a", "#ffffff", "#888888"], "draw": draw_pure_style, "style_groups": ["luxury", "minimal"]},
        {"name": "Reva Bubble", "style": "Reva", "colors": ["#1e2022", "#a3e635", "#ffffff"], "draw": draw_reva_style, "style_groups": ["minimal", "luxury"]},
        {"name": "OpenLate Night", "style": "OpenLate", "colors": ["#000000", "#ffffff", "#ffffff"], "draw": draw_openlate_style, "style_groups": ["luxury"]},
        {"name": "OneBurger Clean", "style": "OneBurger", "colors": ["#ffffff", "#000000", "#000000"], "draw": draw_oneburger_style, "style_groups": ["minimal", "classic"]},
        {"name": "Mountain Alpine", "style": "Mountain", "colors": ["#dff9fb", "#130cb7", "#52c234"], "draw": draw_mountain_style, "style_groups": ["eco", "classic"]},
        {"name": "Vivia Cursive", "style": "Vivia", "colors": ["#e60028", "#ffffff", "#009688"], "draw": draw_vivia_style, "style_groups": ["luxury", "modern"]},
        {"name": "Melt Water", "style": "Melt", "colors": ["#191c1e", "#ffffff", "#e60028"], "draw": draw_melt_style, "style_groups": ["luxury"]},
        {"name": "LifeWtr Mountain", "style": "LifeWtrArt1", "colors": ["#ffffff", "#000000", "#ff6b6b"], "draw": draw_lifewtrart1_style, "style_groups": ["modern", "luxury"]},
        {"name": "LifeWtr Doodle", "style": "LifeWtrArt2", "colors": ["#f5f6fa", "#000000", "#ff6b6b"], "draw": draw_lifewtrart2_style, "style_groups": ["classic"]},
        {"name": "LifeWtr Diamond", "style": "LifeWtrArt3", "colors": ["#ffffff", "#000000", "#ff007f"], "draw": draw_lifewtrart3_style, "style_groups": ["classic"]},
    ]

    designs = []
    
    # Filter/reorder based on selected style and force_template
    if force_template:
        matching = [m for m in styles_meta if m["style"].lower() == force_template.lower()]
        if matching:
            styles_meta = matching
    elif style:
        style_clean = style.lower().strip()
        matching = [m for m in styles_meta if style_clean in m.get("style_groups", [])]
        if matching:
            non_matching = [m for m in styles_meta if m not in matching]
            # Prioritize matching styles, then append the rest as secondary choices
            styles_meta = matching + non_matching
            
    num_to_generate = min(max(count, len(styles_meta)), 15)
    if force_template and matching:
        num_to_generate = count

    for i in range(num_to_generate):
        meta = styles_meta[i % len(styles_meta)]
        design_id = str(uuid.uuid4())[:8]
        filename = f"design_{design_id}.png"
        filepath = GENERATED_DIR / filename
        
        # Create pillow image
        img = Image.new("RGB", (width, height), (255, 255, 255))
        draw = ImageDraw.Draw(img)
        
        drawn_business_name = business_name or "VISTAARWATER"
        drawn_bottle_text = bottle_text or tagline_fallbacks[i % len(tagline_fallbacks)]
        
        # Call drawing logic
        meta["draw"](draw, width, height, drawn_business_name, drawn_bottle_text)
        img.save(str(filepath), "PNG", quality=95)
        
        # Make a custom name variation if it's a second loop
        style_name = meta["name"]
        if i >= len(styles_meta):
            style_name += f" Var {i // len(styles_meta) + 1}"
            
        designs.append({
            "id": design_id,
            "name": style_name,
            "preview_url": f"/static/generated/{filename}",
            "style": meta["style"],
            "colors": meta["colors"],
            "template_id": None,
            "business_name": drawn_business_name,
            "bottle_text": drawn_bottle_text,
        })
        
    return designs

# Fallback taglines for design loops
tagline_fallbacks = [
    "PREMIUM SODA",
    "PURE MOUNTAIN WATER",
    "OCEAN FRESH",
    "NATURAL MINERAL WATER",
    "ORGANIC DRINK",
]

