import urllib.parse
import uuid
import sys
import os
import sqlite3
import time

styles = {
  'hotel': {
    'modern': [
        'Matte charcoal wrap, glowing cyan vertical typography, silver foil accents.',
        'Frosted translucent sleeve, diagonal neon-orange split, bold sans-serif numbering.',
        'Monochromatic black-and-white grid, QR concierge tag, sharp linear borders.',
        'Gradient twilight-blue wrap, floating minimalist hotel monogram, metallic rim.',
        'Asymmetrical split label, matte slate and gloss transparent water window.',
        'Geometric low-poly faceted label print, metallic silver foil highlights.',
        'Deep navy backdrop, ultra-clean Swiss typography, sleek barcode accent.',
        'Frameless matte gray label, vertical condensed san-serif brand wordmark.',
        'High-contrast emerald green & black color-block, clean room-service badge.',
        'Carbon-fiber textured wrap, reflective chrome hotel insignia.',
        'Dark mode UI-inspired label, subtle volume indicators, micro-grid details.',
        'Muted concrete-gray finish, recessed debossed lettering, modern crest.',
        'Split pastel & obsidian layout, angled geometric divider, modern typography.',
        'Frosted glass direct screen-print, glossy black vertical title block.',
        'All-black matte sleeve with single holographic foil vertical stripe.'
    ],
    'classic': [
        'Antique cream textured parchment, vintage filigree borders, engraved gold foil crests, traditional serif script.',
        'Deep royal burgundy base, embossed botanical framing, wax-seal badge motif, vintage vintage-year stamp styling.',
        'Warm ivory stock, dual-line gold filigree borders, heraldic emblem centerpiece, Roman numeral batch codes.',
        'Rich mahogany textured label, gold foil classic typography, intricate baroque border.',
        'Classic white linen texture, silver embossed crest, traditional elegant serif.',
        'Midnight blue classic stock, gold hot-stamped royal insignia, ornate corners.',
        'Vintage apothecary style, sepia toned paper, elegant cursive script, black borders.',
        'Regal purple backdrop, gold filigree, classic European hotel aesthetic.',
        'Timeless white and gold classic wrap, subtle embossed texture, minimalist crest.',
        'Classic French chateau style, cream background, delicate gold framing, serif fonts.',
        'Traditional Victorian era label, intricate black line art on cream paper, gold accents.',
        'Classic Italian villa style, warm terracotta and cream, elegant scrollwork.',
        'Heritage luxury style, forest green, gold embossed classic typography, ornate border.',
        'Classic maritime aesthetic, deep navy, gold rope border, elegant anchor crest.',
        'Vintage classic botanical, soft cream background, faded botanical illustration, serif text.'
    ]
  },
  'cafe': {
    'minimal': [
        'Pure stark white background, centered hairline typography, maximum negative space, single micro dot brand mark.',
        'Translucent frosted clear wrap, delicate black hairline fonts, no borders, miniature volume metric (500ml).',
        'Soft off-white muted gray label, single centered sans-serif logo, flush left-aligned metadata.',
        'Ultra-minimalist blush pink, tiny black sans-serif text, completely empty borders.',
        'Stark black minimal label, single white vertical line, tiny white typography.',
        'Clear transparent minimal wrap, single floating white sans-serif letter, minimal text.',
        'Minimalist mint green, delicate white typography, geometric purity, plenty of white space.',
        'Soft warm gray minimal design, single thin black geometric shape, elegant sans-serif.',
        'Ultra-clean minimal aesthetic, pure white, tiny silver typography, invisible grid.',
        'Minimalist Japanese style, natural beige, single black kanji-inspired mark, vertical text.',
        'Minimalist Scandinavian style, soft ice blue, clean geometric sans-serif, maximum whitespace.',
        'Pure minimal transparent wrap, barely visible white frosted typography, elegant simplicity.',
        'Minimalist brutalist style, stark black and white, heavy sans-serif, grid alignment.',
        'Soft peach minimal label, delicate charcoal typography, completely plain background.',
        'Ultra-minimalist white wrap, single embossed logo without ink, subtle texture.'
    ]
  },
  'event': {
    'luxury': [
        'Matte jet-black substrate, heavy embossed 24k gold foil typography, diamond-mesh pattern textures.',
        'Midnight sapphire wrap, polished brass linear geometric crests, bevel-embossed luxury insignia.',
        'Deep emerald green velvet finish, rose-gold hot stamping, prestige watermark patterning.',
        'Pearl white luxury stock, platinum foil lettering, intricate subtle damask texture.',
        'Rich ruby red luxury label, gold foil geometric art deco patterns, bold luxury typography.',
        'Brushed gold metallic foil wrap, stark black debossed luxury typography, minimalist luxury.',
        'Matte charcoal luxury label, subtle black-on-black gloss UV pattern, gold logo.',
        'Champagne gold metallic finish, white luxury serif typography, elegant minimalist crest.',
        'Deep plum luxury velvet texture, silver foil intricate borders, elegant script.',
        'Luxury marble texture, gold foil veins, sleek black minimalist typography.',
        'High-end carbon and gold, dark grey texture, glowing gold lines, premium aesthetic.',
        'Luxury frosted glass look, heavy rose gold foil crest, elegant luxury script.',
        'Onyx black glossy luxury label, matte black subtle patterns, silver foil text.',
        'Premium white leather texture, gold hot-stamped logo, stitched border effect.',
        'Luxury platinum finish, subtle holographic luxury crest, minimalist black text.'
    ]
  },
  'general': {
    'eco': [
        'Raw unbleached kraft paper wrap, forest-green soy-ink botanical line art, recycled certification seal.',
        'Seed-paper textured label, earthy olive/terracotta palette, minimalist leaf motif, biodegradable badge.',
        'Ribbed brown ribbed cardboard sleeve, hand-pressed stamp typography, zero-waste hydration messaging.',
        'Recycled ocean plastic aesthetic, soft seafoam green, white minimalist text, eco badge.',
        'Natural bamboo texture wrap, simple dark green typography, organic aesthetic.',
        'Eco-friendly cork texture, white painted minimalist logo, sustainable messaging.',
        'Textured recycled cotton paper, soft earthy tones, minimalist botanical watercolor.',
        'Raw natural stone texture, simple green sans-serif text, eco-minimalist design.',
        'Organic earthy brown wrap, white leaf emblem, clean sustainable typography.',
        'Eco-conscious clear wrap, single green leaf motif, minimal white text, 100% recycled badge.',
        'Sustainable hemp paper texture, dark brown organic typography, raw earthy feel.',
        'Eco-friendly wheat straw texture, soft yellow-brown, green sustainable logo.',
        'Recycled gray paper texture, bright green eco-leaf accent, clean typography.',
        'Natural woodgrain texture wrap, white minimalist text, organic and raw aesthetic.',
        'Raw unbleached canvas texture, forest green stamped logo, eco-friendly badge.'
    ]
  }
}

db_path = 'backend/vistaarwater.db'
if not os.path.exists(db_path):
    print(f'DB not found at {db_path}')
    sys.exit(1)

conn = sqlite3.connect(db_path)
c = conn.cursor()

# Check if we already have the new templates, if so delete them to recreate properly
c.execute("DELETE FROM design_templates WHERE name LIKE 'AI 4K%'")
conn.commit()

count = 1
print('Starting insertion of 75 4K templates...')

for category, category_data in styles.items():
    for style, prompts in category_data.items():
        for i, prompt in enumerate(prompts):
            full_prompt = f"A premium 4K product packaging label design for a bottle. {prompt}. Hyper-detailed, masterpiece, professional design, minimalist, NO TEXT on image."
            encoded_prompt = urllib.parse.quote(full_prompt)
            seed = int(time.time() * 1000) + count
            image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=1024&nologo=true&seed={seed}"
            
            c.execute(
                '''
                INSERT INTO design_templates (name, file_path, category, style, colors)
                VALUES (?, ?, ?, ?, ?)
                ''',
                (f"AI 4K {style.capitalize()} {i+1}", image_url, category, style, '["#ffffff", "#000000"]')
            )
            count += 1

conn.commit()
conn.close()
print(f'Successfully inserted {count-1} 4K templates into the database.')
