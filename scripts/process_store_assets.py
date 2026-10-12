import os
from PIL import Image, ImageDraw, ImageFilter

ARTIFACT_DIR = r"C:\Users\DHINESH\.gemini\antigravity-cli\brain\3cc52bfa-b8be-44a4-a53a-b7b400b375ac"
AI_ICON_PATH = os.path.join(ARTIFACT_DIR, "flapcrypt_app_icon_1791698841349.jpg")
AI_FEAT_PATH = os.path.join(ARTIFACT_DIR, "flapcrypt_feature_graphic_mechanical_cryptogram_1791699772936.jpg")

DOCS_ASSETS_DIR = r"E:\PROTO\Flapcrypt\docs\store-assets"
os.makedirs(DOCS_ASSETS_DIR, exist_ok=True)

def process_app_icon():
    print("Processing App Icon to exact Google Play specs (512x512 full-bleed square)...")
    orig = Image.open(AI_ICON_PATH).convert("RGBA")
    W, H = orig.size

    # Notice the image has a rounded dark border at r=140.
    # We zoom in (1.24x) centered so the outer artificial rounded corners 
    # bleed completely past the edges, making the mechanical gear & emerald casing fill the full square naturally!
    zoom = 1.30
    crop_w = int(W / zoom)
    crop_h = int(H / zoom)
    left = (W - crop_w) // 2
    top = (H - crop_h) // 2
    cropped = orig.crop((left, top, left + crop_w, top + crop_h))

    # Resize to exact 512x512 with high-quality Lanczos resampling
    icon_512 = cropped.resize((512, 512), Image.Resampling.LANCZOS)
    
    # Save primary icon
    out_path = os.path.join(DOCS_ASSETS_DIR, "icon-512.png")
    icon_512.save(out_path, "PNG", optimize=True)
    print(f"Saved primary icon: {out_path} ({os.path.getsize(out_path) / 1024:.1f} KB)")


def process_feature_graphic():
    print("Processing Feature Graphic to exact Google Play specs (1024x500 RGB)...")
    orig = Image.open(AI_FEAT_PATH).convert("RGB")
    orig_w, orig_h = orig.size # 1376 x 768

    # Target: 1024 x 500 (aspect ratio 2.048)
    target_w, target_h = 1024, 500
    target_aspect = target_w / target_h # 2.048

    # In 1376x768, the Solari board is in the center with dark space top & bottom.
    # To match 2.048 aspect ratio, crop height to: 1376 / 2.048 = 672
    crop_h = int(orig_w / target_aspect)
    # The board is centered slightly lower than midpoint, so center the crop nicely:
    crop_top = (orig_h - crop_h) // 2 + 10 # slight offset to balance top light and bottom gears
    crop_box = (0, crop_top, orig_w, crop_top + crop_h)

    cropped = orig.crop(crop_box)
    feat_1024 = cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)

    out_path = os.path.join(DOCS_ASSETS_DIR, "feature-graphic-1024x500.png")
    feat_1024.save(out_path, "PNG", optimize=True)
    print(f"Saved primary feature graphic: {out_path} ({os.path.getsize(out_path) / 1024:.1f} KB)")


if __name__ == "__main__":
    process_app_icon()
    process_feature_graphic()
    print("Done processing assets!")
