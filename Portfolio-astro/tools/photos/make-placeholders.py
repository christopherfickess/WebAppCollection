#!/usr/bin/env python3
"""Draws the Photography-Studio template's placeholder "photos".

They are original procedural landscapes (layered ridges, trees, lakes,
night skies), so the template ships no stock or scraped photography.
Replace them with real photos: see public/Photography-Studio/README.md.

  python3 tools/photos/make-placeholders.py

Writes public/Photography-Studio/img/photos/<name>-640|960|1600.webp and
prints each size for js/data.js (width/height of the 1600 export).
"""
import json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), "..", "..", "public", "Photography-Studio", "img", "photos")
os.makedirs(OUT, exist_ok=True)
hexc = lambda h: np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], float)

def ridge(rng, w, base, amp, rough):
    """A skyline: fractal noise built from a few octaves of sines."""
    x = np.linspace(0, 1, w)
    y = np.zeros(w)
    for o in range(1, 7):
        y += np.sin(x * rng.uniform(1.5, 3.5) * o * np.pi + rng.uniform(0, 6.28)) / (o ** rough)
    y = (y - y.min()) / (y.max() - y.min() + 1e-9)
    return base - y * amp

def sky(w, h, top, mid, low, sun=None, glow=None):
    t = np.linspace(0, 1, h)[:, None]
    a, b, c = hexc(top), hexc(mid), hexc(low)
    img = np.where((t < .55)[..., None], a + (b - a) * (t / .55)[..., None], b + (c - b) * ((t - .55) / .45)[..., None])
    img = np.broadcast_to(img, (h, w, 3)).copy()
    if sun:
        sx, sy, col = sun
        yy, xx = np.mgrid[0:h, 0:w]
        d = np.sqrt(((xx - sx * w) / w) ** 2 + ((yy - sy * h) / h) ** 2)
        g = np.exp(-(d / 0.18) ** 2)[..., None]
        img = img + (hexc(col) - img) * g * 0.75
    return img

def layers(img, rng, specs, trees=0, tree_col=None):
    h, w, _ = img.shape
    out = Image.fromarray(img.clip(0, 255).astype("uint8"))
    for i, (col, base, amp, rough, blur) in enumerate(specs):
        sk = ridge(rng, w, base * h, amp * h, rough)
        layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        d.polygon([(0, h)] + [(x, sk[x]) for x in range(w)] + [(w, h)], fill=tuple(int(v) for v in hexc(col)) + (255,))
        if trees and i >= len(specs) - 2:
            for _ in range(trees):
                x = int(rng.uniform(0, w)); top = sk[min(x, w - 1)]
                th = rng.uniform(.05, .11) * h * (1 + i * .3); tw = th * .28
                c = tuple(int(v) for v in hexc(tree_col or col)) + (255,)
                for k in range(3):
                    yy = top - th + k * th * .28
                    d.polygon([(x, yy), (x - tw * (1 + k * .45), yy + th * .45), (x + tw * (1 + k * .45), yy + th * .45)], fill=c)
                d.rectangle([x - 2, top - th * .1, x + 2, top + 4], fill=c)
        if blur: layer = layer.filter(ImageFilter.GaussianBlur(blur))
        out.paste(layer, (0, 0), layer)
    return out

def stars(im, rng, n, band=False):
    w, h = im.size
    a = np.array(im).astype(float)
    if band:
        yy, xx = np.mgrid[0:h, 0:w]
        d = np.abs((yy / h) - (0.1 + 0.8 * (1 - xx / w))) 
        n2 = np.array(Image.fromarray((rng.random((h // 40, w // 40)) * 255).astype("uint8")).resize((w, h), Image.BICUBIC)) / 255
        a += (np.exp(-(d / .09) ** 2) * (0.35 + 0.65 * n2) * 70)[..., None] * np.array([.8, .75, 1])
    layer = Image.new("L", (w, h))
    d = ImageDraw.Draw(layer)
    for _ in range(n):
        x, y = rng.uniform(0, w), rng.uniform(0, h * .7); r = rng.choice([1, 1, 1, 2, 2, 3]); v = int(rng.uniform(140, 255))
        d.ellipse([x - r, y - r, x + r, y + r], fill=v)
    glow = np.array(layer.filter(ImageFilter.GaussianBlur(2.2))).astype(float)[..., None] * .8
    a += np.array(layer).astype(float)[..., None] + glow
    return Image.fromarray(a.clip(0, 255).astype("uint8"))

def lake(im, horizon, tint):
    w, h = im.size; hy = int(horizon * h)
    top = im.crop((0, 0, w, hy)).transpose(Image.FLIP_TOP_BOTTOM).resize((w, h - hy))
    top = top.filter(ImageFilter.GaussianBlur(3))
    a = np.array(top).astype(float) * .72 + hexc(tint) * .28
    ripples = (np.sin(np.linspace(0, 260, h - hy))[:, None] * 5)[..., None]
    out = im.copy(); out.paste(Image.fromarray((a + ripples).clip(0, 255).astype("uint8")), (0, hy))
    return out

def finish(im, rng, grain=7):
    a = np.array(im).astype(float)
    h, w, _ = a.shape
    yy, xx = np.mgrid[0:h, 0:w]
    v = 1 - .28 * (((xx / w - .5) ** 2 + (yy / h - .5) ** 2) * 2)
    a = a * v[..., None] + rng.normal(0, grain, a.shape)
    return Image.fromarray(a.clip(0, 255).astype("uint8"))

def make(name, w, h, seed, kind, **k):
    rng = np.random.default_rng(seed)
    base = sky(w, h, *k["sky"], sun=k.get("sun"))
    if kind == "lake":
        im = layers(base, rng, k["layers"], trees=k.get("trees", 0), tree_col=k.get("tree"))
        im = lake(im, k["horizon"], k["water"])
    else:
        im = layers(base, rng, k["layers"], trees=k.get("trees", 0), tree_col=k.get("tree"))
    if k.get("stars"): im = stars(im, rng, k["stars"], band=k.get("band", False))
    im = finish(im, rng)
    out = {}
    for tw in (640, 960, 1600):
        th = round(h * tw / w); s = im.resize((tw, th), Image.LANCZOS)
        s.save(os.path.join(OUT, f"{name}-{tw}.webp"), "WEBP", quality=80, method=6)
        out = {"w": tw, "h": th}
    return name, out

L = lambda *a: a
SPECS = [
  ("mountain-dawn", 2400, 1600, 11, "m", dict(sky=("#3d3a5c", "#c98a8f", "#f3c9a0"), sun=(.62, .62, "#ffd9a8"),
     layers=[L("#b99aa8", .58, .22, 1.6, 1.5), L("#8a6f86", .68, .2, 1.4, 1), L("#5a4864", .78, .18, 1.3, 0), L("#2e2a3b", .9, .14, 1.1, 0)])),
  ("mountain-haze", 2400, 1600, 23, "m", dict(sky=("#6f8fa8", "#b9cdd6", "#e7e3dc"),
     layers=[L("#a9bcc6", .50, .20, 1.7, 2), L("#8fa6b3", .60, .22, 1.5, 1.5), L("#6d8795", .71, .2, 1.4, 1), L("#47606d", .82, .18, 1.2, 0), L("#2c3d46", .94, .14, 1.1, 0)])),
  ("mountain-peaks", 1600, 2400, 37, "m", dict(sky=("#27324d", "#7a6a8e", "#e9a98a"), sun=(.35, .55, "#ffcf9e"),
     layers=[L("#9d86a3", .42, .26, 1.5, 1.5), L("#6e5a7c", .55, .28, 1.3, 1), L("#463b57", .68, .26, 1.2, 0), L("#251f33", .85, .2, 1.1, 0)])),
  ("forest-mist", 2400, 1600, 41, "f", dict(sky=("#9bb3a9", "#d3dccf", "#eef0e6"), trees=170, tree="#1f342d",
     layers=[L("#b9c9bd", .55, .12, 1.8, 3), L("#8fa89b", .65, .13, 1.6, 2), L("#58766a", .76, .12, 1.4, 1), L("#2d4a40", .86, .1, 1.3, 0), L("#18302a", .95, .08, 1.2, 0)])),
  ("forest-pines", 1600, 2400, 53, "f", dict(sky=("#2f4a45", "#7da08f", "#e6d6a8"), sun=(.5, .5, "#ffe4a8"), trees=120, tree="#14261f",
     layers=[L("#6d9080", .5, .1, 1.8, 2), L("#476d5e", .62, .12, 1.6, 1), L("#274539", .76, .1, 1.4, 0), L("#12261f", .9, .08, 1.3, 0)])),
  ("lake-sunset", 2400, 1600, 61, "l", dict(sky=("#4a3b6b", "#d9798a", "#ffc58a"), sun=(.5, .5, "#ffe0a8"), horizon=.62, water="#9a5f7a",
     layers=[L("#6a4a73", .5, .16, 1.6, 1.5), L("#3b2c4f", .6, .12, 1.4, 0), L("#241b33", .625, .03, 1.2, 0)])),
  ("lake-blue", 2400, 1600, 71, "l", dict(sky=("#4f78a6", "#9ec0d6", "#e8eee9"), horizon=.64, water="#5d86a3", trees=90, tree="#1d3a35",
     layers=[L("#a1bccb", .50, .15, 1.7, 2), L("#6f93a5", .58, .13, 1.5, 1), L("#2c4a45", .64, .08, 1.3, 0)])),
  ("night-stars", 2400, 1600, 83, "n", dict(sky=("#05070f", "#10203c", "#2a3f63"), stars=1100, band=True, trees=70, tree="#04060b",
     layers=[L("#101a2c", .78, .12, 1.6, 0), L("#05080f", .9, .1, 1.4, 0)])),
  ("night-ridge", 1600, 2400, 97, "n", dict(sky=("#080a18", "#2a1f46", "#8a4f6b"), stars=700, sun=(.5, .78, "#b46c80"),
     layers=[L("#2a1f3d", .72, .18, 1.5, 1), L("#150f24", .84, .16, 1.3, 0), L("#07050e", .95, .1, 1.2, 0)])),
]
res = {}
for name, w, h, seed, kind, k in SPECS:
    n, size = make(name, w, h, seed, "lake" if kind == "l" else kind, **k)
    res[n] = size
    print(n, size)
json.dump(res, open(os.path.join(OUT, "sizes.json"), "w"))
