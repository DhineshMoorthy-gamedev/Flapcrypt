import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "docs", "store-assets")
os.makedirs(OUTPUT_DIR, exist_ok=True)

FONT_OSWALD = os.path.join(OUTPUT_DIR, "Oswald-Variable.ttf")
FONT_SPACE = os.path.join(OUTPUT_DIR, "SpaceGrotesk-Variable.ttf")

def get_font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()

def draw_radial_gradient(draw, width, height, center_x, center_y, max_r, col_inner, col_outer):
    steps = 160
    for i in range(steps, 0, -1):
        ratio = i / steps
        r = int(max_r * ratio)
        col = (
            int(col_outer[0] + (col_inner[0] - col_outer[0]) * (1 - ratio)),
            int(col_outer[1] + (col_inner[1] - col_outer[1]) * (1 - ratio)),
            int(col_outer[2] + (col_inner[2] - col_outer[2]) * (1 - ratio)),
        )
        draw.ellipse([center_x - r, center_y - r, center_x + r, center_y + r], fill=col)

def draw_split_flap_tile(img, draw, x, y, w, h, char, font, glyph_color=(243, 237, 226), 
                         top_col_1=(36, 56, 45), top_col_2=(24, 38, 30),
                         bot_col_1=(20, 32, 26), bot_col_2=(14, 22, 18),
                         border_col=(52, 82, 65), radius=18, shadow_blur=24):
    mid_y = y + h // 2

    # 1. Soft Ambient Drop Shadow
    shadow_mask = Image.new("RGBA", img.size, (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow_mask)
    s_draw.rounded_rectangle([x, y + shadow_blur // 2, x + w, y + h + shadow_blur], 
                             radius=radius, fill=(0, 0, 0, 180))
    shadow_blur_img = shadow_mask.filter(ImageFilter.GaussianBlur(shadow_blur))
    img.alpha_composite(shadow_blur_img)

    # 2. Tile Base Layer (Top & Bottom Flaps)
    tile_img = Image.new("RGBA", img.size, (0, 0, 0, 0))
    t_draw = ImageDraw.Draw(tile_img)

    # Top Flap gradient (top-lit)
    for cy in range(int(y), int(mid_y)):
        ratio = (cy - y) / (mid_y - y)
        col = (
            int(top_col_1[0] + (top_col_2[0] - top_col_1[0]) * ratio),
            int(top_col_1[1] + (top_col_2[1] - top_col_1[1]) * ratio),
            int(top_col_1[2] + (top_col_2[2] - top_col_1[2]) * ratio),
            255
        )
        t_draw.line([(x, cy), (x + w, cy)], fill=col)

    # Bottom Flap gradient (slightly recessed)
    for cy in range(int(mid_y), int(y + h)):
        ratio = (cy - mid_y) / (y + h - mid_y)
        col = (
            int(bot_col_1[0] + (bot_col_2[0] - bot_col_1[0]) * ratio),
            int(bot_col_1[1] + (bot_col_2[1] - bot_col_1[1]) * ratio),
            int(bot_col_1[2] + (bot_col_2[2] - bot_col_1[2]) * ratio),
            255
        )
        t_draw.line([(x, cy), (x + w, cy)], fill=col)

    # Corner radius mask
    mask = Image.new("L", img.size, 0)
    m_draw = ImageDraw.Draw(mask)
    m_draw.rounded_rectangle([x, y, x + w, y + h], radius=radius, fill=255)
    img.paste(tile_img, (0, 0), mask)

    # 3. Outer Industrial Bevel
    draw.rounded_rectangle([x, y, x + w, y + h], radius=radius, outline=border_col, width=max(2, int(w * 0.012)))
    # Top edge highlight
    draw.line([(x + radius, y + 2), (x + w - radius, y + 2)], fill=(255, 255, 255, 50), width=2)

    # 4. Draw Typography Glyph
    bbox = draw.textbbox((0, 0), char, font=font)
    char_w = bbox[2] - bbox[0]
    char_h = bbox[3] - bbox[1]
    char_x = x + (w - char_w) // 2 - bbox[0]
    char_y = y + (h - char_h) // 2 - bbox[1] - int(h * 0.02)

    glyph_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    g_draw = ImageDraw.Draw(glyph_layer)
    # Subtle character drop shadow
    g_draw.text((char_x, char_y + 3), char, font=font, fill=(0, 0, 0, 150))
    g_draw.text((char_x, char_y), char, font=font, fill=(*glyph_color, 255))

    # Mask glyph inside tile rounded bounds
    img.paste(glyph_layer, (0, 0), mask)

    # 5. Crisp Horizontal Split Seam
    seam_h = max(2, int(h * 0.008)) # Razor thin 2-3px seam
    draw.rectangle([x, mid_y - seam_h, x + w, mid_y + seam_h], fill=(5, 8, 6, 255))
    draw.line([(x, mid_y - seam_h - 1), (x + w, mid_y - seam_h - 1)], fill=(0, 0, 0, 190), width=1)
    draw.line([(x, mid_y + seam_h + 1), (x + w, mid_y + seam_h + 1)], fill=(255, 255, 255, 35), width=1)

    # Top flap overhang cast shadow onto bottom leaf
    shadow_h = max(4, int(h * 0.04))
    for sy in range(shadow_h):
        alpha = int(90 * (1 - sy / shadow_h))
        draw.line([(x + 2, mid_y + seam_h + 2 + sy), (x + w - 2, mid_y + seam_h + 2 + sy)], 
                  fill=(0, 0, 0, alpha))

    # 6. Brass Hinge Brackets (Left & Right)
    hw = max(4, int(w * 0.035))
    hh = max(8, int(h * 0.065))
    hinge_y1 = mid_y - hh // 2
    hinge_y2 = mid_y + hh // 2

    # Left hinge bracket
    draw.rounded_rectangle([x - 1, hinge_y1, x + hw, hinge_y2], radius=2, 
                           fill=(245, 158, 11), outline=(180, 110, 5), width=1)
    draw.ellipse([x + 2, mid_y - 2, x + hw - 2, mid_y + 2], fill=(40, 25, 0))

    # Right hinge bracket
    draw.rounded_rectangle([x + w - hw, hinge_y1, x + w + 1, hinge_y2], radius=2, 
                           fill=(245, 158, 11), outline=(180, 110, 5), width=1)
    draw.ellipse([x + w - hw + 2, mid_y - 2, x + w - 2, mid_y + 2], fill=(40, 25, 0))


def generate_app_icon():
    print("Generating App Icon (512x512)...")
    SIZE = 1024
    img = Image.new("RGBA", (SIZE, SIZE), (7, 11, 9, 255))
    draw = ImageDraw.Draw(img)

    # 1. Atmospheric Studio Background with Radial Vignette
    draw_radial_gradient(draw, SIZE, SIZE, SIZE // 2, SIZE // 2, 750, (25, 42, 33), (7, 11, 9))

    # Subtle cryptographic radar circles
    for cr in [380, 420, 460]:
        draw.ellipse([512 - cr, 512 - cr, 512 + cr, 512 + cr], outline=(38, 64, 50, 45), width=2)

    # Warm amber ambient spotlight behind hero tile
    glow_img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_img)
    glow_draw.ellipse([200, 160, 824, 864], fill=(245, 158, 11, 40))
    glow_blurred = glow_img.filter(ImageFilter.GaussianBlur(90))
    img.alpha_composite(glow_blurred)

    # 2. Main Hero Split-Flap Tile
    tile_w = 640
    tile_h = 760
    tile_x = (SIZE - tile_w) // 2
    tile_y = (SIZE - tile_h) // 2 - 20

    font_oswald = get_font(FONT_OSWALD, 540)

    draw_split_flap_tile(
        img=img,
        draw=draw,
        x=tile_x,
        y=tile_y,
        w=tile_w,
        h=tile_h,
        char="F",
        font=font_oswald,
        glyph_color=(243, 237, 226), # Warm ivory
        top_col_1=(36, 56, 45),
        top_col_2=(24, 38, 30),
        bot_col_1=(18, 28, 22),
        bot_col_2=(12, 19, 15),
        border_col=(56, 88, 70),
        radius=40,
        shadow_blur=36
    )

    # 3. Corner Rivet Screws on the Bezel
    rivet_offset = 28
    rivet_r = 7
    corners = [
        (tile_x + rivet_offset, tile_y + rivet_offset),
        (tile_x + tile_w - rivet_offset, tile_y + rivet_offset),
        (tile_x + rivet_offset, tile_y + tile_h - rivet_offset),
        (tile_x + tile_w - rivet_offset, tile_y + tile_h - rivet_offset),
    ]
    for rx, ry in corners:
        draw.ellipse([rx - rivet_r, ry - rivet_r, rx + rivet_r, ry + rivet_r], 
                     fill=(245, 158, 11), outline=(180, 110, 5), width=1)
        draw.line([(rx - 3, ry), (rx + 3, ry)], fill=(30, 20, 0), width=1)

    # 4. Mechanical Branding Pill at bottom of tile
    font_space = get_font(FONT_SPACE, 38)
    pill_text = "CRYPT"
    pbbox = draw.textbbox((0, 0), pill_text, font=font_space)
    pw = pbbox[2] - pbbox[0] + 52
    ph = 56
    px = (SIZE - pw) // 2
    py = tile_y + tile_h - 78

    draw.rounded_rectangle([px, py, px + pw, py + ph], radius=ph // 2, 
                           fill=(14, 24, 18, 245), outline=(245, 158, 11), width=3)
    draw.text((px + 26 - pbbox[0], py + (ph - (pbbox[3] - pbbox[1])) // 2 - pbbox[1] - 2), 
              pill_text, font=font_space, fill=(245, 158, 11))

    # 5. Downsample to exact 512x512
    icon_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
    out_path = os.path.join(OUTPUT_DIR, "icon-512.png")
    icon_512.save(out_path, "PNG", optimize=True)
    print(f"App Icon saved: {out_path} ({os.path.getsize(out_path) / 1024:.1f} KB)")


def generate_feature_graphic():
    print("Generating Feature Graphic (1024x500)...")
    W = 2048
    H = 1000
    img = Image.new("RGBA", (W, H), (7, 11, 9, 255))
    draw = ImageDraw.Draw(img)

    # 1. Atmospheric Studio Background
    draw_radial_gradient(draw, W, H, W // 2, H // 2 - 40, 1100, (26, 44, 34), (6, 9, 7))

    # Subtle ambient lighting
    glow_img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_img)
    glow_draw.ellipse([W // 2 - 600, H // 2 - 320, W // 2 + 600, H // 2 + 220], fill=(245, 158, 11, 42))
    glow_blurred = glow_img.filter(ImageFilter.GaussianBlur(130))
    img.alpha_composite(glow_blurred)

    # 2. Header Tag Badge: "MECHANICAL WORD CIPHER"
    font_space_sm = get_font(FONT_SPACE, 32)
    tag_text = "MECHANICAL WORD CIPHER"
    tbbox = draw.textbbox((0, 0), tag_text, font=font_space_sm)
    tag_w = tbbox[2] - tbbox[0] + 80
    tag_h = 56
    tag_x = (W - tag_w) // 2
    tag_y = 145

    draw.rounded_rectangle([tag_x, tag_y, tag_x + tag_w, tag_y + tag_h], 
                           radius=tag_h // 2, fill=(15, 26, 20, 230), outline=(52, 85, 68), width=2)
    # Draw gold bullet dots on left and right
    draw.ellipse([tag_x + 22, tag_y + tag_h // 2 - 5, tag_x + 32, tag_y + tag_h // 2 + 5], fill=(245, 158, 11))
    draw.ellipse([tag_x + tag_w - 32, tag_y + tag_h // 2 - 5, tag_x + tag_w - 22, tag_y + tag_h // 2 + 5], fill=(245, 158, 11))
    draw.text((tag_x + 40 - tbbox[0], tag_y + (tag_h - (tbbox[3] - tbbox[1])) // 2 - tbbox[1] - 2), 
              tag_text, font=font_space_sm, fill=(245, 158, 11))

    # 3. Grand Master FLAPCRYPT Split-Flap Board (9 Tiles)
    title_word = "FLAPCRYPT"
    tile_w = 172
    tile_h = 246
    gap = 18
    total_w = len(title_word) * tile_w + (len(title_word) - 1) * gap
    start_x = (W - total_w) // 2
    start_y = 250

    font_oswald = get_font(FONT_OSWALD, 182)

    for i, ch in enumerate(title_word):
        tx = start_x + i * (tile_w + gap)
        if i < 4:
            glyph_color = (243, 237, 226) # Ivory for FLAP
            border_col = (52, 82, 65)
            top_c1 = (36, 56, 45)
            top_c2 = (24, 38, 30)
        else:
            glyph_color = (245, 158, 11) # Amber Gold for CRYPT
            border_col = (72, 105, 82)
            top_c1 = (38, 62, 49)
            top_c2 = (26, 42, 33)

        draw_split_flap_tile(
            img=img,
            draw=draw,
            x=tx,
            y=start_y,
            w=tile_w,
            h=tile_h,
            char=ch,
            font=font_oswald,
            glyph_color=glyph_color,
            top_col_1=top_c1,
            top_col_2=top_c2,
            bot_col_1=(18, 28, 22),
            bot_col_2=(12, 19, 15),
            border_col=border_col,
            radius=18,
            shadow_blur=24
        )

    # 4. Master Subtitle: "ROTATE THE FLAPS • CRACK THE CIPHER"
    font_space_lg = get_font(FONT_SPACE, 44)
    sub_text = "ROTATE THE FLAPS   •   CRACK THE CIPHER"
    sbbox = draw.textbbox((0, 0), sub_text, font=font_space_lg)
    sub_x = (W - (sbbox[2] - sbbox[0])) // 2 - sbbox[0]
    sub_y = start_y + tile_h + 55
    draw.text((sub_x, sub_y + 3), sub_text, font=font_space_lg, fill=(0, 0, 0, 180))
    draw.text((sub_x, sub_y), sub_text, font=font_space_lg, fill=(226, 232, 240))

    # 5. Value Proposition Badges (without unrendered emoji glyphs)
    badges = [
        "100+ CRYPTIC LEVELS",
        "DAILY CHALLENGES",
        "100% OFFLINE PLAY"
    ]
    font_badge = get_font(FONT_SPACE, 30)
    badge_h = 56
    badge_y = sub_y + 88

    b_widths = []
    for b in badges:
        bb = draw.textbbox((0, 0), b, font=font_badge)
        b_widths.append(bb[2] - bb[0] + 64)
    
    b_gap = 28
    b_total = sum(b_widths) + (len(badges) - 1) * b_gap
    bx = (W - b_total) // 2

    for i, b in enumerate(badges):
        bw = b_widths[i]
        draw.rounded_rectangle([bx, badge_y, bx + bw, badge_y + badge_h], 
                               radius=badge_h // 2, fill=(14, 24, 19, 220), outline=(42, 68, 54), width=2)
        # Small decorative green indicator dot
        draw.ellipse([bx + 18, badge_y + badge_h // 2 - 4, bx + 26, badge_y + badge_h // 2 + 4], 
                     fill=(16, 185, 129))
        bb = draw.textbbox((0, 0), b, font=font_badge)
        draw.text((bx + 34 - bb[0], 
                   badge_y + (badge_h - (bb[3] - bb[1])) // 2 - bb[1] - 2), 
                  b, font=font_badge, fill=(180, 206, 192))
        bx += bw + b_gap

    # 6. Downsample to exact 1024x500 RGB
    feat_1024 = img.resize((1024, 500), Image.Resampling.LANCZOS)
    feat_rgb = feat_1024.convert("RGB")
    out_path = os.path.join(OUTPUT_DIR, "feature-graphic-1024x500.png")
    feat_rgb.save(out_path, "PNG", optimize=True)
    print(f"Feature Graphic saved: {out_path} ({os.path.getsize(out_path) / 1024:.1f} KB)")


if __name__ == "__main__":
    generate_app_icon()
    generate_feature_graphic()
    print("Store assets generated with enhanced precision!")
