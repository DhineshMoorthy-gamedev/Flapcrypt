import os
import shutil
from PIL import Image, ImageDraw

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICON_SRC = os.path.join(PROJECT_ROOT, "docs", "store-assets", "icon-512.png")
RES_DIR = os.path.join(PROJECT_ROOT, "android", "app", "src", "main", "res")
PUBLIC_DIR = os.path.join(PROJECT_ROOT, "public")

# Density specifications: (folder_name, legacy_size, adaptive_fg_size)
MIPMAP_CONFIG = [
    ("mipmap-mdpi", 48, 108),
    ("mipmap-hdpi", 72, 162),
    ("mipmap-xhdpi", 96, 216),
    ("mipmap-xxhdpi", 144, 324),
    ("mipmap-xxxhdpi", 192, 432),
]

def make_round_icon(img):
    """Applies a circular mask to an image."""
    w, h = img.size
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, w, h), fill=255)
    
    round_img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    round_img.paste(img, (0, 0), mask)
    return round_img

def make_adaptive_foreground(src_img, size):
    """
    Creates an adaptive icon foreground of the given size (108dp).
    The active icon is placed within the inner safe zone (approx 72dp = ~66% of total canvas)
    with a transparent background.
    """
    fg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    # Scale icon to ~72% of canvas to fit comfortably in the safe zone
    icon_size = int(size * 0.74)
    scaled_icon = src_img.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
    offset = (size - icon_size) // 2
    fg.paste(scaled_icon, (offset, offset), scaled_icon if scaled_icon.mode == "RGBA" else None)
    return fg

def setup_icons():
    print(f"Loading master app icon: {ICON_SRC}")
    master_icon = Image.open(ICON_SRC).convert("RGBA")

    # 1. Copy to public/ for Web/Capacitor use
    public_icon_path = os.path.join(PUBLIC_DIR, "icon-512.png")
    shutil.copyfile(ICON_SRC, public_icon_path)
    print(f"Copied icon to public: {public_icon_path}")

    # Favicon
    favicon = master_icon.resize((64, 64), Image.Resampling.LANCZOS)
    favicon_path = os.path.join(PUBLIC_DIR, "favicon.png")
    favicon.save(favicon_path, "PNG")
    print(f"Saved favicon: {favicon_path}")

    # 2. Update Android ic_launcher_background.xml
    bg_xml_path = os.path.join(RES_DIR, "values", "ic_launcher_background.xml")
    os.makedirs(os.path.dirname(bg_xml_path), exist_ok=True)
    with open(bg_xml_path, "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n')
        f.write('<resources>\n')
        f.write('    <color name="ic_launcher_background">#070B09</color>\n')
        f.write('</resources>\n')
    print(f"Updated Android adaptive background color: {bg_xml_path} (#070B09)")

    # 3. Generate Android Mipmap icons for all densities
    for folder, legacy_sz, fg_sz in MIPMAP_CONFIG:
        target_dir = os.path.join(RES_DIR, folder)
        os.makedirs(target_dir, exist_ok=True)

        # Standard legacy icon (square)
        legacy_icon = master_icon.resize((legacy_sz, legacy_sz), Image.Resampling.LANCZOS)
        legacy_icon_path = os.path.join(target_dir, "ic_launcher.png")
        legacy_icon.save(legacy_icon_path, "PNG", optimize=True)

        # Round legacy icon (circle)
        round_icon = make_round_icon(legacy_icon)
        round_icon_path = os.path.join(target_dir, "ic_launcher_round.png")
        round_icon.save(round_icon_path, "PNG", optimize=True)

        # Adaptive foreground
        fg_icon = make_adaptive_foreground(master_icon, fg_sz)
        fg_icon_path = os.path.join(target_dir, "ic_launcher_foreground.png")
        fg_icon.save(fg_icon_path, "PNG", optimize=True)

        print(f"Generated {folder}: {legacy_sz}x{legacy_sz} standard/round, {fg_sz}x{fg_sz} adaptive fg")

    print("\nAll game icons successfully configured!")

if __name__ == "__main__":
    setup_icons()
