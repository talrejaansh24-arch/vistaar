import os
import sqlite3
from PIL import Image
from pathlib import Path
import json

BASE_DIR = Path(__file__).resolve().parent
STATIC_TEMPLATES = BASE_DIR / "static" / "templates"
DB_PATH = BASE_DIR / "vistaarwater.db"

img2_path = r"C:/Users/talre/.gemini/antigravity/brain/33596945-4109-4fa8-bc20-ed2323305423/.user_uploaded/media_1788088303016.png"

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

designs_to_insert = []

try:
    img2 = Image.open(img2_path)
    # 1024 x 559. 3 cols, 5 rows.
    # We will ignore the header if any. Actually it looks like there's no big header, just boxes on white background.
    col_width = 1024 // 3
    row_height = 559 // 5
    
    categories = ["corporate", "event", "general"]
    styles = ["modern", "premium", "eco", "luxury", "minimal"]
    
    for row in range(5):
        for col in range(3):
            left = col * col_width + 10
            top = row * row_height + 10
            right = (col + 1) * col_width - 10
            bottom = (row + 1) * row_height - 10
            
            box = (left, top, right, bottom)
            cropped = img2.crop(box)
            
            style = styles[row]
            category = categories[col]
            
            filename = f"box_{style}_{category}.png"
            filepath = STATIC_TEMPLATES / filename
            cropped.save(filepath)
            
            designs_to_insert.append((
                f"Premium Box {style.capitalize()}",
                category,
                style,
                f"/static/templates/{filename}",
                json.dumps(["#ffffff"])
            ))
except Exception as e:
    print(f"Failed: {e}")

for d in designs_to_insert:
    cursor.execute("""
        INSERT INTO design_templates (name, category, style, file_path, colors, created_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    """, d)

conn.commit()
conn.close()

print(f"Inserted {len(designs_to_insert)} box designs.")
