import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "docs", "store-assets")

FONT_OSWALD = os.path.join(OUTPUT_DIR, "Oswald-Variable.ttf")

def render_subtitle_replacement():
    slot_w, slot_h = 778, 56
    # Create 2x supersampled slot for extreme sharpness
    scale = 2
    W, H = slot_w * scale, slot_h * scale

    slot_img = Image.new("RGBA", (W, H), (9, 18, 13, 255))
    draw = ImageDraw.Draw(slot_img)

    # Dark background with subtle vertical gradient and inner shadow
    for y in range(H):
        ratio = y / H
        c = int(8 + 6 * ratio), int(16 + 8 * ratio), int(12 + 6 * ratio)
        draw.line([(0, y), (W, y)], fill=(*c, 255))

    # Inner top & bottom shadow to blend seamlessly into the recessed bevel
    for y in range(8 * scale):
        alpha = int(140 * (1 - y / (8 * scale)))
        draw.line([(0, y), (W, y)], fill=(0, 0, 0, alpha))
    for y in range(6 * scale):
        alpha = int(100 * (1 - y / (6 * scale)))
        draw.line([(0, H - 1 - y), (W, H - 1 - y)], fill=(0, 0, 0, alpha))

    # The words: "The", "Mechanical", "Cryptogram"
    words = ["The", "Mechanical", "Cryptogram"]
    total_letters = sum(len(w) for w in words) # 23
    
    # Calculate module sizing
    # Total available width = W (1556px)
    # We want: 23 modules + 2 inter-word gaps + padding
    tile_w = int(27.5 * scale) # ~55px
    tile_h = int(50.0 * scale) # ~100px
    tile_gap = int(2.5 * scale) # ~5px
    word_gap = int(24.0 * scale) # ~48px
    tile_radius = int(4.0 * scale)

    total_content_w = (
        (len(words[0]) * tile_w + (len(words[0]) - 1) * tile_gap) +
        word_gap +
        (len(words[1]) * tile_w + (len(words[1]) - 1) * tile_gap) +
        word_gap +
        (len(words[2]) * tile_w + (len(words[2]) - 1) * tile_gap)
    )

    start_x = (W - total_content_w) // 2
    tile_y = (H - tile_h) // 2

    font_size = int(36 * scale)
    try:
        font = ImageFont.truetype(FONT_OSWALD, font_size)
    except Exception:
        font = ImageFont.load_default()

    curr_x = start_x
    for w_idx, word in enumerate(words):
        for ch in word:
            # Draw individual split-flap module
            mid_y = tile_y + tile_h // 2
            
            # Module base
            m_mask = Image.new("L", (W, H), 0)
            m_draw = ImageDraw.Draw(m_mask)
            m_draw.rounded_rectangle([curr_x, tile_y, curr_x + tile_w, tile_y + tile_h], 
                                     radius=tile_radius, fill=255)

            # Top flap gradient
            top_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            tl_draw = ImageDraw.Draw(top_layer)
            for ty in range(tile_y, mid_y):
                rat = (ty - tile_y) / (mid_y - tile_y)
                col = (int(38 - 14 * rat), int(48 - 16 * rat), int(42 - 14 * rat), 255)
                tl_draw.line([(curr_x, ty), (curr_x + tile_w, ty)], fill=col)

            # Bottom flap gradient
            bot_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            bl_draw = ImageDraw.Draw(bot_layer)
            for ty in range(mid_y, tile_y + tile_h):
                rat = (ty - mid_y) / (tile_y + tile_h - mid_y)
                col = (int(22 - 6 * rat), int(28 - 8 * rat), int(24 - 6 * rat), 255)
                bl_draw.line([(curr_x, ty), (curr_x + tile_w, ty)], fill=col)

            slot_img.paste(top_layer, (0, 0), m_mask)
            slot_img.paste(bot_layer, (0, 0), m_mask)

            # Outer subtle border
            draw.rounded_rectangle([curr_x, tile_y, curr_x + tile_w, tile_y + tile_h], 
                                   radius=tile_radius, outline=(48, 64, 54), width=max(1, scale))

            # Character
            bbox = draw.textbbox((0, 0), ch, font=font)
            cw = bbox[2] - bbox[0]
            ch_h = bbox[3] - bbox[1]
            cx = curr_x + (tile_w - cw) // 2 - bbox[0]
            cy = tile_y + (tile_h - ch_h) // 2 - bbox[1] - int(1.5 * scale)

            glyph_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            g_draw = ImageDraw.Draw(glyph_layer)
            # Text shadow
            g_draw.text((cx, cy + int(1.5 * scale)), ch, font=font, fill=(0, 0, 0, 160))
            # Text color (warm ivory)
            g_draw.text((cx, cy), ch, font=font, fill=(245, 238, 222, 255))

            slot_img.paste(glyph_layer, (0, 0), m_mask)

            # Split seam
            seam_h = max(1, int(1.2 * scale))
            draw.line([(curr_x, mid_y), (curr_x + tile_w, mid_y)], fill=(5, 8, 6, 255), width=seam_h)
            draw.line([(curr_x, mid_y + seam_h), (curr_x + tile_w, mid_y + seam_h)], fill=(255, 255, 255, 40), width=1)
            # Cast shadow from top leaf
            for sy in range(int(3 * scale)):
                alpha = int(70 * (1 - sy / (3 * scale)))
                draw.line([(curr_x, mid_y + seam_h + 1 + sy), (curr_x + tile_w, mid_y + seam_h + 1 + sy)], fill=(0, 0, 0, alpha))

            # Brass hinge clips
            hh = int(7 * scale)
            hw = max(2, int(2 * scale))
            hy1 = mid_y - hh // 2
            hy2 = mid_y + hh // 2
            # Left hinge
            draw.rectangle([curr_x - 1, hy1, curr_x + hw, hy2], fill=(215, 148, 20), outline=(140, 90, 10))
            # Right hinge
            draw.rectangle([curr_x + tile_w - hw, hy1, curr_x + tile_w + 1, hy2], fill=(215, 148, 20), outline=(140, 90, 10))

            curr_x += tile_w + tile_gap

        curr_x += word_gap - tile_gap

    # Downsample to exact 778 x 56
    final_slot = slot_img.resize((slot_w, slot_h), Image.Resampling.LANCZOS)
    final_slot.save(os.path.join(OUTPUT_DIR, "test_rendered_slot.png"))
    print("Saved test_rendered_slot.png successfully!")

if __name__ == "__main__":
    render_subtitle_replacement()
