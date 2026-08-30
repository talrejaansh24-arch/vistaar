"""
design_painter.py — Pure Python + Pillow label background generator.
Generates beautiful bordered/gradient/pattern label designs for every
category × style combination. No external API required.
"""

import os
import math
import random
import hashlib
from datetime import date
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter


# ────────────────────────────────────────────────────────────────
# Colour Palettes  (category → style → list of (bg, accent, border) tuples)
# ────────────────────────────────────────────────────────────────
PALETTES: dict[str, dict[str, list[tuple]]] = {
    "hotel": {
        "modern":  [("#1a1a2e","#00b4d8","#0077b6"),("#0d0d0d","#f72585","#7209b7"),("#16213e","#e94560","#0f3460")],
        "luxury":  [("#1c0a00","#d4af37","#8b6914"),("#0b0014","#c9b037","#6a0dad"),("#0d0208","#b8960c","#2c0a3a")],
        "classic": [("#2d1b1e","#c8a96e","#8b5e3c"),("#1a1209","#e8d5b7","#a0856c"),("#261a0a","#d4a853","#7a5c3a")],
        "minimal": [("#f5f5f0","#2c2c2c","#8a8a8a"),("#fafafa","#1a1a1a","#cccccc"),("#f0f0ed","#333333","#999999")],
        "eco-friendly": [("#1b4332","#95d5b2","#52b788"),("#2d6a4f","#74c69d","#40916c"),("#081c15","#b7e4c7","#1b4332")],
    },
    "restaurant": {
        "modern":  [("#2b0000","#ff4757","#c0392b"),("#1a0a00","#ff6348","#e55039"),("#0d0000","#ff3f34","#d63031")],
        "luxury":  [("#1a0000","#d4af37","#8b0000"),("#200000","#e0b040","#6b0000"),("#120000","#c9a227","#7b0000")],
        "classic": [("#3c1518","#e8d5b7","#a4361a"),("#2d0e12","#dbb89a","#8b2b1c"),("#1e0809","#c9a87c","#6b1c14")],
        "minimal": [("#fff5f0","#cc3311","#ffccbc"),("#fef6ee","#d84315","#ffb99a"),("#fff3ee","#bf360c","#ffccbc")],
        "eco-friendly": [("#3b1f1f","#a7c957","#6a994e"),("#2c1810","#b5d95b","#4a7c59"),("#1e0f0f","#c5e063","#386641")],
    },
    "cafe": {
        "modern":  [("#1c0f00","#ff9f43","#e58e26"),("#120900","#ffc048","#d4851b"),("#0a0500","#ffae42","#c87722")],
        "luxury":  [("#1a1000","#d4af37","#8b6914"),("#120c00","#c9a72a","#7a5c0f"),("#0c0800","#bfa023","#6b4f0a")],
        "classic": [("#3d2b1f","#e8d5b7","#8b4513"),("#2e1f13","#d4c4a8","#7a3c1e"),("#1f1009","#c2b097","#6b2c18")],
        "minimal": [("#fdf6ec","#795548","#bcaaa4"),("#fef9f2","#6d4c41","#d7ccc8"),("#faf3e8","#5d4037","#efebe9")],
        "eco-friendly": [("#1a2e1a","#a7c957","#6a994e"),("#0f1f0f","#b8d96a","#508a55"),("#0a150a","#c5df7a","#3a6b3a")],
    },
    "event": {
        "modern":  [("#0d0221","#a855f7","#ec4899"),("#080118","#9333ea","#db2777"),("#050010","#7c3aed","#c026d3")],
        "luxury":  [("#0a0015","#d4af37","#9333ea"),("#060010","#c9a730","#7c3aed"),("#030008","#b89428","#6d28d9")],
        "classic": [("#1a0a2e","#c8a96e","#9b59b6"),("#12071f","#b8996a","#8e44ad"),("#0c0415","#a68960","#7d3c98")],
        "minimal": [("#fdf4ff","#9333ea","#e9d5ff"),("#faf0ff","#7c3aed","#ede9fe"),("#f7ebff","#6d28d9","#ddd6fe")],
        "eco-friendly": [("#0f2418","#a3e635","#4ade80"),("#0a1a10","#bef264","#22c55e"),("#061008","#d9f99d","#16a34a")],
    },
    "gym": {
        "modern":  [("#000a14","#00d4ff","#0099cc"),("#00040a","#00c4ef","#0088bb"),("#000205","#00b4df","#0077aa")],
        "luxury":  [("#0a0a00","#f5c518","#ff6b00"),("#060600","#ffd700","#ff5500"),("#020200","#ffe135","#ff4400")],
        "classic": [("#1a0000","#e0e0e0","#ff0000"),("#0d0000","#d4d4d4","#cc0000"),("#060000","#c8c8c8","#bb0000")],
        "minimal": [("#f0f0f5","#1a1a2e","#6c63ff"),("#e8e8f0","#0d0d1f","#5a52eb"),("#e0e0eb","#000010","#4840d7")],
        "eco-friendly": [("#0a1f0a","#7fff00","#39d353"),("#061506","#6fe800","#2db844"),("#030d03","#5fd100","#20a033")],
    },
    "fitness": {
        "modern":  [("#0a0014","#ff6bcb","#ff3864"),("#060008","#ff55bb","#ff2755"),("#030004","#ff44ab","#ff1644")],
        "luxury":  [("#1a0014","#d4af37","#c71585"),("#0d000c","#c9a730","#b01070"),("#060007","#b49420","#991060")],
        "classic": [("#1a1a1a","#ff6b6b","#4ecdc4"),("#121212","#ff5c5c","#3ebdb5"),("#0a0a0a","#ff4d4d","#2dada5")],
        "minimal": [("#fff0f5","#ff1493","#ffb6c1"),("#ffe8ef","#e01285","#ffa0b4"),("#ffe0ea","#cc1075","#ff8aa0")],
        "eco-friendly": [("#0f1f0f","#39d353","#00ff88"),("#0a150a","#2db844","#00ee77"),("#060e06","#20a033","#00dd66")],
    },
    "corporate": {
        "modern":  [("#0a0f1e","#2979ff","#1565c0"),("#060b14","#1565c0","#0d47a1"),("#02060f","#0d47a1","#01579b")],
        "luxury":  [("#0a0a14","#d4af37","#1a237e"),("#060610","#c9a730","#0d1461"),("#020208","#b89420","#060d4e")],
        "classic": [("#0d1b2a","#e0e0e0","#1f5c99"),("#08131f","#d4d4d4","#174d8a"),("#030b14","#c8c8c8","#0f3d7a")],
        "minimal": [("#f0f4ff","#1a237e","#90a4ae"),("#e8eeff","#0d1461","#78909c"),("#e0e9ff","#060d4e","#607d8b")],
        "eco-friendly": [("#0a1f1a","#00bcd4","#4db6ac"),("#061514","#00acc1","#3da69c"),("#030c0a","#009cb0","#2d968c")],
    },
    "general": {
        "modern":  [("#0f0f1a","#6c63ff","#4facfe"),("#0a0a12","#5c53ef","#3f9cee"),("#050508","#4c44df","#2f8cde")],
        "luxury":  [("#100a00","#d4af37","#c0392b"),("#0a0600","#c9a730","#a93226"),("#050300","#b89420","#921b1b")],
        "classic": [("#1a1209","#c8a96e","#8b5e3c"),("#120c04","#b89a62","#7a4f31"),("#0a0800","#a88a56","#6a3f26")],
        "minimal": [("#f8f8f8","#333333","#aaaaaa"),("#f0f0f0","#222222","#999999"),("#e8e8e8","#111111","#888888")],
        "eco-friendly": [("#0f1f0f","#6db33f","#4a7c59"),("#0a150a","#5da132","#3a6b49"),("#060e06","#4d9125","#2a5b39")],
    },
}

# ────────────────────────────────────────────────────────────────
# Canvas constants - 2048x2048 ensures crisp, high-res 4K labels
# ────────────────────────────────────────────────────────────────
W, H = 2048, 2048


def _daily_rng(category: str, style: str, variant: int) -> random.Random:
    """Deterministic RNG seeded by today's date + combo so designs change daily."""
    seed = f"{date.today().isoformat()}_{category}_{style}_{variant}"
    return random.Random(hashlib.md5(seed.encode()).hexdigest())


def _hex_to_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))  # type: ignore


def _lerp_color(c1: tuple, c2: tuple, t: float) -> tuple[int, int, int]:
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))  # type: ignore


# ────────────────────────────────────────────────────────────────
# Layer painters
# ────────────────────────────────────────────────────────────────

def _paint_gradient(draw: ImageDraw.ImageDraw, bg: tuple, accent: tuple, rng: random.Random):
    angle = rng.choice([0, 45, 90, 135, 180, 225, 270, 315])
    
    # Create 1D gradient band
    grad_1d = Image.new("RGB", (256, 1))
    for x in range(256):
        t = x / 255.0
        r = int(bg[0] + (accent[0] - bg[0]) * t)
        g = int(bg[1] + (accent[1] - bg[1]) * t)
        b = int(bg[2] + (accent[2] - bg[2]) * t)
        grad_1d.putpixel((x, 0), (r, g, b))
        
    # Scale up to cover rotated diagonal
    diag = int(math.ceil(math.sqrt(W*W + H*H)))
    grad_scaled = grad_1d.resize((diag, diag), Image.Resampling.BILINEAR)
    
    # Rotate
    rotated = grad_scaled.rotate(angle, resample=Image.Resampling.BICUBIC, expand=False)
    
    # Crop center to match W, H
    x0 = (diag - W) // 2
    y0 = (diag - H) // 2
    cropped = rotated.crop((x0, y0, x0 + W, y0 + H))
    
    # Paste onto underlying image
    draw._image.paste(cropped)


def _paint_geometric(draw: ImageDraw.ImageDraw, accent: tuple, border: tuple, rng: random.Random):
    """Draw overlapping translucent geometric shapes."""
    shape_count = rng.randint(6, 14)
    for _ in range(shape_count):
        alpha = rng.randint(20, 60)
        color_with_alpha = accent + (alpha,)
        shape = rng.choice(["rect", "ellipse", "triangle"])
        x0, y0 = rng.randint(-200, W), rng.randint(-200, H)
        x1, y1 = x0 + rng.randint(200, 900), y0 + rng.randint(200, 900)
        if shape == "rect":
            draw.rectangle([x0, y0, x1, y1], fill=color_with_alpha)
        elif shape == "ellipse":
            draw.ellipse([x0, y0, x1, y1], fill=color_with_alpha)
        else:
            pts = [(x0, y1), ((x0 + x1) // 2, y0), (x1, y1)]
            draw.polygon(pts, fill=color_with_alpha)


def _paint_circles(draw: ImageDraw.ImageDraw, accent: tuple, rng: random.Random):
    """Concentric dot grid."""
    spacing = rng.randint(80, 140)
    radius = rng.randint(6, 16)
    for row in range(-1, H // spacing + 2):
        for col in range(-1, W // spacing + 2):
            cx = col * spacing + rng.randint(-15, 15)
            cy = row * spacing + rng.randint(-15, 15)
            alpha = rng.randint(30, 80)
            draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius],
                         fill=accent + (alpha,))


def _paint_lines(draw: ImageDraw.ImageDraw, accent: tuple, rng: random.Random):
    """Diagonal scan-line texture."""
    gap = rng.randint(30, 80)
    width = rng.randint(3, 8)
    alpha = rng.randint(25, 55)
    angle = rng.choice([30, 45, 60, 135, -45])
    for i in range(-H, W + H, gap):
        rad = math.radians(angle)
        x0, y0 = i, 0
        x1 = x0 + H / math.tan(rad + 0.01)
        draw.line([(int(x0), 0), (int(x1), H)], fill=accent + (alpha,), width=width)


def _paint_waves(draw: ImageDraw.ImageDraw, accent: tuple, rng: random.Random):
    amp = rng.randint(50, 150)
    freq = rng.uniform(0.002, 0.006)
    phase = rng.uniform(0, 2 * math.pi)
    gap = rng.randint(80, 160)
    alpha = rng.randint(30, 60)
    for wave_y in range(0, H + gap, gap):
        pts = []
        for x in range(W + 1):
            y = wave_y + amp * math.sin(freq * x + phase)
            pts.append((x, int(y)))
        if len(pts) > 1:
            draw.line(pts, fill=accent + (alpha,), width=rng.randint(3, 8))


def _paint_border(draw: ImageDraw.ImageDraw, border: tuple, accent: tuple, rng: random.Random):
    """Layered decorative border."""
    margin = rng.randint(50, 120)
    thickness = rng.randint(10, 25)
    inner_gap = rng.randint(15, 35)

    # Outer frame
    draw.rectangle([margin, margin, W - margin, H - margin],
                   outline=border, width=thickness)
    # Inner frame
    inner = margin + inner_gap
    draw.rectangle([inner, inner, W - inner, H - inner],
                   outline=accent, width=max(1, thickness // 2))

    # Corner accents
    size = rng.randint(45, 90)
    corners = [
        (margin, margin, margin + size, margin + size),
        (W - margin - size, margin, W - margin, margin + size),
        (margin, H - margin - size, margin + size, H - margin),
        (W - margin - size, H - margin - size, W - margin, H - margin),
    ]
    for c in corners:
        draw.rectangle(c, fill=accent)

    # Tick marks on border edges
    tick_count = rng.randint(4, 8)
    for k in range(tick_count):
        t = (k + 1) / (tick_count + 1)
        # top & bottom
        tx = int(margin + t * (W - 2 * margin))
        draw.line([(tx, margin - 4), (tx, margin + 4)], fill=accent, width=2)
        draw.line([(tx, H - margin - 4), (tx, H - margin + 4)], fill=accent, width=2)
        # left & right
        ty = int(margin + t * (H - 2 * margin))
        draw.line([(margin - 4, ty), (margin + 4, ty)], fill=accent, width=2)
        draw.line([(W - margin - 4, ty), (W - margin + 4, ty)], fill=accent, width=2)


# ────────────────────────────────────────────────────────────────
# Public API
# ────────────────────────────────────────────────────────────────

def generate_label_design(category: str, style: str, variant: int = 0, out_path: str | None = None) -> str:
    """
    Generate one label background PNG for the given category/style/variant.
    Returns the absolute file path.
    """
    rng = _daily_rng(category, style, variant)
    palette_list = PALETTES.get(category, PALETTES["general"]).get(style, PALETTES["general"]["modern"])
    bg_hex, accent_hex, border_hex = palette_list[variant % len(palette_list)]

    bg     = _hex_to_rgb(bg_hex)
    accent = _hex_to_rgb(accent_hex)
    border = _hex_to_rgb(border_hex)

    # Base image + RGBA overlay layer
    base = Image.new("RGB", (W, H), bg)
    draw = ImageDraw.Draw(base)
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)

    # 1. Gradient base
    _paint_gradient(draw, bg, accent, rng)

    # 2. Texture layer (pick one per variant)
    texture = rng.choice(["geo", "circles", "lines", "waves"])
    if texture == "geo":
        _paint_geometric(odraw, accent, border, rng)
    elif texture == "circles":
        _paint_circles(odraw, accent, rng)
    elif texture == "lines":
        _paint_lines(odraw, accent, rng)
    else:
        _paint_waves(odraw, accent, rng)

    # 3. Composite overlay
    base = base.convert("RGBA")
    base = Image.alpha_composite(base, overlay).convert("RGB")

    # 4. Subtle blur for smoothness
    base = base.filter(ImageFilter.GaussianBlur(radius=0.7))

    # 5. Border on top
    final_draw = ImageDraw.Draw(base)
    _paint_border(final_draw, border, accent, rng)

    # Save
    if out_path is None:
        static_dir = Path(__file__).parent.parent.parent / "static" / "generated"
        static_dir.mkdir(parents=True, exist_ok=True)
        out_path = str(static_dir / f"label_{category}_{style}_{variant}.png")

    base.save(out_path, "PNG", optimize=True)
    return out_path


def generate_all_designs(variants_per_combo: int = 3) -> list[dict]:
    """
    Generate label images for all category × style combinations.
    Returns list of dicts: {category, style, variant, file_path, colors}
    """
    categories = ["hotel", "restaurant", "cafe", "event", "gym", "fitness", "corporate", "general"]
    styles     = ["modern", "luxury", "classic", "minimal", "eco-friendly"]
    results    = []

    for cat in categories:
        for sty in styles:
            for v in range(variants_per_combo):
                path = generate_label_design(cat, sty, v)
                palette_list = PALETTES.get(cat, PALETTES["general"]).get(sty, PALETTES["general"]["modern"])
                bg_hex, accent_hex, border_hex = palette_list[v % len(palette_list)]
                results.append({
                    "category":  cat,
                    "style":     sty,
                    "variant":   v,
                    "file_path": path,
                    "colors":    [bg_hex, accent_hex, border_hex],
                })
    return results
