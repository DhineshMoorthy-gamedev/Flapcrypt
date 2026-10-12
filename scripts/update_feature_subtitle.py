import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

DOCS_ASSETS_DIR = r"E:\PROTO\Flapcrypt\docs\store-assets"
FEAT_PATH = os.path.join(DOCS_ASSETS_DIR, "feature-graphic-1024x500.png")
FONT_OSWALD = os.path.join(DOCS_ASSETS_DIR, "Oswald-Variable.ttf")

def update_feature_graphic_subtitle():
    base_img = Image.open(FEAT_PATH).convert("RGBA")
    
    # Inner slot coordinates in 1024x500 canvas:
    # x: 121 to 899 (w: 778)
    # y: 351 to 407 (h: 56)
    slot_x, slot_y = 121, 351
    slot_w, slot_h = 778, 56

    # Create 2x supersampled slot image for extreme crispness
    scale = 2
    sw, sh = slot_w * scale, slot_h * scale
    slot_img = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    draw = ImageDraw.Draw(slot_img)

    # 1. Background of the recessed display slot
    # Dark noir green-black backing plate with subtle top-to-bottom shading
    for y in range(sh):
        ratio = y / sh
        r = int(9 + 5 * ratio)
        g = int(17 + 8 * ratio)
        b = int(13 + 6 * ratio)
        draw.line([(0, y), (sw, y)], fill=(r, g, b, 255))

    # Inner bevel shadows on the top and bottom edge of the slot
    for y in range(int(6 * scale)):
        a = int(180 * (1 - y / (6 * scale)))
        draw.line([(0, y), (sw, y)], fill=(0, 0, 0, a))
    for y in range(int(5 * scale)):
        a = int(120 * (1 - y / (5 * scale)))
        draw.line([(0, sh - 1 - y), (sw, sh - 1 - y)], fill=(0, 0, 0, a))

    # 2. Render modules for: "The", "Mechanical", "Cryptogram"
    words = ["The", "Mechanical", "Cryptogram"]
    tile_w = int(24.5 * scale) # 49px
    tile_h = int(50.0 * scale) # 100px
    tile_gap = int(2.5 * scale) # 5px
    word_gap = int(24.0 * scale) # 48px
    tile_r = int(3.5 * scale) # 7px

    # Calculate total width to center it
    total_w = 0
    for i, w in enumerate(words):
        w_len = len(w)
        total_w += w_len * tile_w + (w_len - 1) * tile_gap
        if i < len(words) - 1:
            total_w += word_gap

    start_x = (sw - total_w) // 2
    tile_y = (sh - tile_h) // 2

    font_size = int(36 * scale)
    font = ImageFont.truetype(FONT_OSWALD, font_size)

    curr_x = start_x
    for w in words:
        for ch in w:
            mid_y = tile_y + tile_h // 2

            # Tile body
            tile_mask = Image.new("L", (sw, sh), 0)
            tm_draw = ImageDraw.Draw(tile_mask)
            tm_draw.rounded_rectangle([curr_x, tile_y, curr_x + tile_w, tile_y + tile_h], 
                                      radius=tile_r, fill=255)

            # Top flap leaf
            top_layer = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
            t_draw = ImageDraw.Draw(top_layer)
            for ty in range(tile_y, mid_y):
                rat = (ty - tile_y) / (mid_y - tile_y)
                r = int(46 - 16 * rat)
                g = int(58 - 20 * rat)
                b = int(52 - 18 * rat)
                t_draw.line([(curr_x, ty), (curr_x + tile_w, ty)], fill=(r, g, b, 255))

            # Bottom flap leaf
            bot_layer = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
            b_draw = ImageDraw.Draw(bot_layer)
            for ty in range(mid_y, tile_y + tile_h):
                rat = (ty - mid_y) / (tile_y + tile_h - mid_y)
                r = int(28 - 10 * rat)
                g = int(36 - 12 * rat)
                b = int(32 - 10 * rat)
                b_draw.line([(curr_x, ty), (curr_x + tile_w, ty)], fill=(r, g, b, 255))

            slot_img.paste(top_layer, (0, 0), tile_mask)
            slot_img.paste(bot_layer, (0, 0), tile_mask)

            # Outer subtle border around module
            draw.rounded_rectangle([curr_x, tile_y, curr_x + tile_w, tile_y + tile_h], 
                                   radius=tile_r, outline=(54, 72, 62), width=max(1, scale))

            # Letter
            bbox = draw.textbbox((0, 0), ch, font=font)
            cw = bbox[2] - bbox[0]
            ch_h = bbox[3] - bbox[1]
            cx = curr_x + (tile_w - cw) // 2 - bbox[0]
            cy = tile_y + (tile_h - ch_h) // 2 - bbox[1] - int(2 * scale)

            glyph_layer = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
            g_draw = ImageDraw.Draw(glyph_layer)
            # Subtle drop shadow
            g_draw.text((cx, cy + int(1.5 * scale)), ch, font=font, fill=(0, 0, 0, 160))
            # Ivory text
            g_draw.text((cx, cy), ch, font=font, fill=(250, 240, 218, 255))

            slot_img.paste(glyph_layer, (0, 0), tile_mask)

            # Split seam across the middle
            seam_w = max(1, int(1.2 * scale))
            draw.line([(curr_x, mid_y), (curr_x + tile_w, mid_y)], fill=(5, 8, 6, 255), width=seam_w)
            draw.line([(curr_x, mid_y + seam_w), (curr_x + tile_w, mid_y + seam_w)], fill=(255, 255, 255, 45), width=1)

            # Top leaf overhang shadow
            for sy in range(int(3.5 * scale)):
                alpha = int(75 * (1 - sy / (3.5 * scale)))
                draw.line([(curr_x, mid_y + seam_w + 1 + sy), (curr_x + tile_w, mid_y + seam_w + 1 + sy)], fill=(0, 0, 0, alpha))

            # Brass hinge brackets
            hh = int(7 * scale)
            hw = max(2, int(2.5 * scale))
            hy1 = mid_y - hh // 2
            hy2 = mid_y + hh // 2
            # Left hinge
            draw.rectangle([curr_x - 1, hy1, curr_x + hw, hy2], fill=(225, 160, 25), outline=(150, 95, 15))
            # Right hinge
            draw.rectangle([curr_x + tile_w - hw, hy1, curr_x + tile_w + 1, hy2], fill=(225, 160, 25), outline=(150, 95, 15))

            curr_x += tile_w + tile_gap

        curr_x += word_gap - tile_gap

    # Downsample rendered slot to 1x (778 x 56)
    slot_1x = slot_img.resize((slot_w, slot_h), Image.Resampling.LANCZOS)

    # Composite into the base feature graphic at (slot_x, slot_y)
    base_img.paste(slot_1x, (slot_x, slot_y))

    # Save finalized RGB PNG
    final_rgb = base_img.convert("RGB")
    final_rgb.save(FEAT_PATH, "PNG", optimize=True)
    print(f"Updated Feature Graphic saved successfully: {FEAT_PATH}")

if __name__ == "__main__":
    update_feature_graphic_subtitle()
