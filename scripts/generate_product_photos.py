"""Generate stylized product card photos for the Hasaki prototype.
Outputs 600x750 JPGs into images/products/.
Each image: cream/blush/etc. background gradient, a styled product silhouette
with highlight strip + soft shadow, and brand+name label baked in lightly.
"""
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from pathlib import Path
import os

OUT = Path("images/products")
OUT.mkdir(parents=True, exist_ok=True)

W, H = 600, 750

def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def darken(rgb, f=0.75):
    return tuple(max(0, int(c * f)) for c in rgb)

def lighten(rgb, f=0.15):
    return tuple(min(255, int(c + (255 - c) * f)) for c in rgb)

def gradient_bg(top_hex, bot_hex):
    img = Image.new("RGB", (W, H), top_hex)
    draw = ImageDraw.Draw(img)
    t = hex_to_rgb(top_hex); b = hex_to_rgb(bot_hex)
    for y in range(H):
        f = y / H
        c = tuple(int(t[i] + (b[i] - t[i]) * f) for i in range(3))
        draw.line([(0, y), (W, y)], fill=c)
    return img

def add_shadow(layer, blur=16, opacity=110, dy=18):
    """Drop-shadow for an RGBA product layer onto the bg."""
    sh = Image.new("RGBA", layer.size, (0,0,0,0))
    sd = ImageDraw.Draw(sh)
    # Use the product alpha to make a black shadow, blurred
    alpha = layer.split()[-1]
    shadow = Image.new("RGBA", layer.size, (0,0,0,0))
    shadow.putalpha(alpha.point(lambda v: int(v * opacity / 255)))
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur))
    shifted = Image.new("RGBA", layer.size, (0,0,0,0))
    shifted.paste(shadow, (0, dy), shadow)
    return shifted

def draw_bottle(layer, color, cap_h=70, body_color=None):
    """Pump bottle silhouette."""
    d = ImageDraw.Draw(layer)
    body_color = body_color or color
    # cap
    d.rounded_rectangle([(225, 110), (375, 110+cap_h)], radius=10, fill=darken(color, 0.65))
    # neck
    d.rectangle([(255, 110+cap_h), (345, 110+cap_h+22)], fill=darken(color, 0.85))
    # body
    d.rounded_rectangle([(180, 110+cap_h+22), (420, 660)], radius=24, fill=body_color)
    # highlight strip
    d.rounded_rectangle([(215, 230), (240, 580)], radius=14, fill=lighten(color, 0.45))
    # base shadow
    d.rounded_rectangle([(380, 600), (415, 650)], radius=10, fill=darken(body_color, 0.7))

def draw_pump(layer, color):
    d = ImageDraw.Draw(layer)
    # nozzle
    d.polygon([(255,80),(305,80),(305,110),(345,110),(345,140),(255,140)], fill=darken(color, 0.7))
    # head
    d.rounded_rectangle([(225,140),(375,180)], radius=10, fill=darken(color, 0.85))
    # body
    d.rounded_rectangle([(180,180),(420,680)], radius=24, fill=color)
    # highlight
    d.rounded_rectangle([(215,230),(240,580)], radius=14, fill=lighten(color, 0.5))

def draw_jar(layer, color):
    d = ImageDraw.Draw(layer)
    # lid
    d.rounded_rectangle([(150,210),(450,310)], radius=12, fill=darken(color, 0.7))
    # body
    d.rounded_rectangle([(115,295),(485,640)], radius=18, fill=color)
    # lip rim
    d.rounded_rectangle([(115,295),(485,330)], radius=18, fill=darken(color, 0.85))
    # highlight
    d.rounded_rectangle([(155,360),(190,580)], radius=14, fill=lighten(color, 0.5))

def draw_tube(layer, color, cap_color=None):
    d = ImageDraw.Draw(layer)
    cap_color = cap_color or darken(color, 0.7)
    # cap
    d.rounded_rectangle([(225,110),(375,180)], radius=10, fill=cap_color)
    # body, slightly tapered
    d.polygon([(190,180),(410,180),(425,650),(175,650)], fill=color)
    # crimp at bottom
    d.rectangle([(175,650),(425,672)], fill=darken(color, 0.85))
    # highlight
    d.rounded_rectangle([(225,225),(255,595)], radius=14, fill=lighten(color, 0.55))

def draw_lipstick(layer, color, bullet_color=None):
    d = ImageDraw.Draw(layer)
    bullet_color = bullet_color or color
    # tube container
    d.rounded_rectangle([(195,310),(405,690)], radius=10, fill=color)
    # collar/neck
    d.rectangle([(195,310),(405,330)], fill=darken(color, 0.82))
    # bullet (extended lipstick)
    d.rounded_rectangle([(225,135),(375,310)], radius=8, fill=bullet_color)
    # angled top
    d.polygon([(225,150),(375,150),(300,90)], fill=lighten(bullet_color, 0.15))
    # highlight on tube
    d.rounded_rectangle([(220,360),(245,640)], radius=14, fill=lighten(color, 0.4))
    # highlight on bullet
    d.rounded_rectangle([(232,170),(248,295)], radius=8, fill=lighten(bullet_color, 0.45))

def draw_perfume(layer, color, cap_color=None):
    d = ImageDraw.Draw(layer)
    cap_color = cap_color or darken(color, 0.6)
    # cap
    d.rounded_rectangle([(245,75),(355,175)], radius=12, fill=cap_color)
    # neck
    d.rectangle([(265,175),(335,210)], fill=darken(color, 0.9))
    # square bottle body
    d.rounded_rectangle([(150,210),(450,665)], radius=20, fill=color)
    # subtle inner reflection
    d.rounded_rectangle([(180,250),(220,610)], radius=18, fill=lighten(color, 0.4))
    # right edge shadow
    d.rounded_rectangle([(410,250),(440,610)], radius=18, fill=darken(color, 0.85))
    # label band
    d.rectangle([(150,420),(450,470)], fill=lighten(color, 0.65))

def draw_dropper(layer, color):
    d = ImageDraw.Draw(layer)
    # cap with squeeze bulb
    d.rounded_rectangle([(225,90),(375,205)], radius=10, fill=darken(color, 0.65))
    d.ellipse([(255,75),(345,115)], fill=darken(color, 0.5))
    # body
    d.rounded_rectangle([(195,205),(405,665)], radius=18, fill=color)
    # liquid level — slightly lighter
    d.rounded_rectangle([(215,260),(385,640)], radius=14, fill=lighten(color, 0.18))
    # highlight
    d.rounded_rectangle([(220,290),(245,600)], radius=14, fill=lighten(color, 0.55))

def add_label(img, brand, name, size_text):
    """Subtle product label baked into the photo."""
    d = ImageDraw.Draw(img)
    try:
        font_brand = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
        font_name  = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
        font_size  = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12)
    except Exception:
        font_brand = ImageFont.load_default()
        font_name  = ImageFont.load_default()
        font_size  = ImageFont.load_default()
    # tiny brand bar bottom-left
    d.text((30, H-58), brand.upper(), fill=(40,40,40), font=font_brand)
    d.text((30, H-34), size_text, fill=(110,110,110), font=font_size)

def render(path, bg_top, bg_bot, draw_fn, *args, brand="", size_text=""):
    bg = gradient_bg(bg_top, bg_bot)
    layer = Image.new("RGBA", (W, H), (0,0,0,0))
    draw_fn(layer, *args)
    # shadow under product
    sh = add_shadow(layer, blur=24, opacity=140, dy=22)
    bg.paste(sh, (0,0), sh)
    bg.paste(layer, (0,0), layer)
    bg.save(path, "JPEG", quality=86, optimize=True)
    print(f"  wrote {path}")

# Bestseller card images
print("Generating product photos…")
render(OUT/"laneige-lip-sleeping-mask.jpg", "#f0d4cc", "#e8c4b8",
       draw_jar, hex_to_rgb("#9d2a4d"),
       brand="Laneige", size_text="Lip mask · 20 g")
render(OUT/"cosrx-snail-essence.jpg",       "#dde9e0", "#c8dcd0",
       draw_pump, hex_to_rgb("#306e51"),
       brand="COSRX", size_text="Essence · 100 ml")
render(OUT/"ysl-libre-edp.jpg",             "#1a1a1a", "#0a0a0a",
       draw_perfume, hex_to_rgb("#d4af6e"),
       brand="YSL", size_text="EDP · 90 ml")
render(OUT/"laroche-anthelios.jpg",         "#ebe4d8", "#d8cfb9",
       draw_tube, hex_to_rgb("#5b8fb8"),
       brand="La Roche-Posay", size_text="SPF50+ · 50 ml")
render(OUT/"dior-rouge-999.jpg",            "#f0d4cc", "#e8c4b8",
       draw_lipstick, hex_to_rgb("#1a1a1a"), hex_to_rgb("#7a1018"),
       brand="Dior", size_text="Lipstick · 3.2 g")
render(OUT/"innisfree-green-tea.jpg",       "#dde9e0", "#c8dcd0",
       draw_dropper, hex_to_rgb("#3d4a3a"),
       brand="Innisfree", size_text="Serum · 50 ml")
render(OUT/"anessa-perfect-uv.jpg",         "#ebe4d8", "#d8cfb9",
       draw_bottle, hex_to_rgb("#c7a352"),
       brand="Anessa", size_text="SPF50+ · 60 ml")
render(OUT/"the-ordinary-niacinamide.jpg",  "#f5f1ea", "#e8e0cf",
       draw_dropper, hex_to_rgb("#2a2a2a"),
       brand="The Ordinary", size_text="Serum · 30 ml")

# Trending shelf images
render(OUT/"charlotte-tilbury-pillow-talk.jpg", "#f0d4cc", "#e8c4b8",
       draw_lipstick, hex_to_rgb("#3a2828"), hex_to_rgb("#c98985"),
       brand="Charlotte Tilbury", size_text="Lipstick · 3.5 g")
render(OUT/"glow-recipe-watermelon.jpg",        "#f5d8d8", "#eec0c8",
       draw_dropper, hex_to_rgb("#e08fa8"),
       brand="Glow Recipe", size_text="Drops · 40 ml")
render(OUT/"tom-ford-black-orchid.jpg",         "#1a1a1a", "#0a0a0a",
       draw_perfume, hex_to_rgb("#4a2a2a"), hex_to_rgb("#1a1a1a"),
       brand="Tom Ford", size_text="EDP · 50 ml")
render(OUT/"sulwhasoo-first-care.jpg",          "#ebe4d8", "#d8cfb9",
       draw_bottle, hex_to_rgb("#a06b3a"),
       brand="Sulwhasoo", size_text="Serum · 60 ml")
render(OUT/"maybelline-sky-high.jpg",           "#f0d4cc", "#e8c4b8",
       draw_lipstick, hex_to_rgb("#0a0a0a"), hex_to_rgb("#1a1a1a"),
       brand="Maybelline", size_text="Mascara · 7 ml")
render(OUT/"jomalone-wood-sage.jpg",            "#3d4a3a", "#2c372d",
       draw_perfume, hex_to_rgb("#cdb389"), hex_to_rgb("#5a4a32"),
       brand="Jo Malone", size_text="Cologne · 100 ml")

print("Done.")
