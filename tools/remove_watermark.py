"""Remove the fixed bottom-right sparkle watermark and upscale Play Store mockups.

Usage:
    python tools\remove_watermark.py <image> [--size 2160x3840] [--bbox x0,y0,x1,y1]
"""

import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

REF_W, REF_H = 1536, 2752
STAR_BBOX = (1399, 2615, 1446, 2662)
PAD = 25
UNSHARP = dict(radius=1.6, percent=95, threshold=3)
JPEG = dict(quality=95, subsampling=0, optimize=True)


def scaled_bbox(w, h, bbox):
    x0, y0, x1, y1 = bbox
    sx, sy = w / REF_W, h / REF_H
    return (
        max(0, int(round(x0 * sx)) - PAD),
        max(0, int(round(y0 * sy)) - PAD),
        min(w, int(round(x1 * sx)) + PAD),
        min(h, int(round(y1 * sy)) + PAD),
    )


def _robust_poly(xs, vals, cols_out):
    A = np.stack([xs ** k for k in range(3)], axis=1)
    coef, *_ = np.linalg.lstsq(A, vals, rcond=None)
    keep = np.abs(vals - A @ coef) < 3.0
    if keep.sum() >= 10:
        coef, *_ = np.linalg.lstsq(A[keep], vals[keep], rcond=None)
    Ao = np.stack([cols_out.astype(np.float64) ** k for k in range(3)], axis=1)
    return Ao @ coef


def fit_axis(img, rx0, ry0, rx1, ry1):
    h, w = img.shape[:2]
    touches = (rx0 <= 1 or ry0 <= 1 or rx1 >= w - 2 or ry1 >= h - 2)
    if not touches:
        cols = np.concatenate([np.arange(rx0 - 40, rx0), np.arange(rx1, rx1 + 40)])
        fill = np.arange(rx0, rx1)
        out = img.copy()
        xs = cols.astype(np.float64)
        for y in range(ry0, ry1):
            for c in range(3):
                out[y, fill, c] = _robust_poly(xs, img[y, cols, c], fill)
        return out, True
    rows = np.concatenate([np.arange(max(0, ry0 - 40), ry0), np.arange(ry1, min(h, ry1 + 40))])
    fill = np.arange(ry0, ry1)
    out = img.copy()
    ys_ = rows.astype(np.float64)
    for x in range(rx0, rx1):
        for c in range(3):
            out[fill, x, c] = _robust_poly(ys_, img[rows, x, c], fill)
    return out, False


def remove_mark(img, bbox):
    rx0, ry0, rx1, ry1 = bbox
    out, horizontal = fit_axis(img, rx0, ry0, rx1, ry1)

    bh, bw = ry1 - ry0, rx1 - rx0
    yy, xx = np.mgrid[0:bh, 0:bw]
    dist = np.minimum(np.minimum(yy, bh - 1 - yy), np.minimum(xx, bw - 1 - xx)).astype(float)
    alpha = np.clip(dist / 20.0, 0, 1)[:, :, None]
    region = img[ry0:ry1, rx0:rx1]
    out[ry0:ry1, rx0:rx1] = region * (1 - alpha) + out[ry0:ry1, rx0:rx1] * alpha
    out = np.clip(out, 0, 255).astype(np.uint8)

    diff = np.abs(out.astype(np.int16) - img.astype(np.int16)).max(axis=2)
    col = out[ry0:ry1, (rx0 + rx1) // 2].mean(axis=1)
    seam = float(np.abs(np.diff(col, 2)).max()) if bh > 2 else 0.0
    return out, {
        "changed_px": int((diff > 0).sum()),
        "max_change": int(diff.max()),
        "fit_axis": "horizontal" if horizontal else "vertical",
        "seam_d2": seam,
    }


def enhance(pil, size):
    up = pil.resize(size, Image.LANCZOS)
    return up.filter(ImageFilter.UnsharpMask(**UNSHARP))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image", type=Path)
    ap.add_argument("--size", default="2160x3840", help="WxH, e.g. 2160x3840")
    ap.add_argument("--bbox", default=None, help="override x0,y0,x1,y1 in source pixels")
    ap.add_argument("--suffix", default="_clean")
    args = ap.parse_args()

    tw, th = (int(v) for v in args.size.lower().split("x"))
    try:
        img = np.array(Image.open(args.image).convert("RGB"))
    except Exception as e:
        sys.exit(f"cannot read {args.image}: {e}")
    h, w = img.shape[:2]

    if args.bbox:
        bbox = tuple(int(v) for v in args.bbox.split(","))
        bbox = (max(0, bbox[0] - PAD), max(0, bbox[1] - PAD),
                min(w, bbox[2] + PAD), min(h, bbox[3] + PAD))
    else:
        bbox = scaled_bbox(w, h, STAR_BBOX)

    out, report = remove_mark(img, bbox)
    pil = Image.fromarray(out)
    result = enhance(pil, (tw, th))

    dst = args.image.with_name(f"{args.image.stem}{args.suffix}{args.image.suffix}")
    if dst.suffix.lower() in (".jpg", ".jpeg"):
        result.save(dst, "JPEG", **JPEG)
    else:
        result.save(dst)

    print(f"source : {args.image} ({w}x{h})")
    print(f"bbox   : {bbox}")
    print(f"removed: {report['changed_px']} px, max delta {report['max_change']}, "
          f"fit {report['fit_axis']}, seam d2 {report['seam_d2']:.2f}")
    print(f"output : {dst} ({result.size[0]}x{result.size[1]})")


if __name__ == "__main__":
    main()
