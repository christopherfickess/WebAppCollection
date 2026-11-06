#!/usr/bin/env python3
"""Add photos to the Photography-Studio gallery.

  python3 tools/photos/build-photos.py <set> <folder-of-photos>

For every .jpg/.jpeg/.png/.webp in the folder this:
  - exports  img/photos/<set>-<name>-640.webp, -960.webp, -1600.webp
    (never upscaled; camera metadata, including GPS location, is dropped)
  - adds an entry to js/photos.js (skipped if the file is already listed)

<set> is one of the ids at the top of js/photos.js (engagement, spain,
london, nature...). Name files like  cathedral-at-night.jpg  : the name
becomes the photo's title. The light (dawn/day/dusk/night) is a guess from
the picture's brightness; check the new entries and fix the title, alt text,
and light by hand.
"""
import json, re, sys
from pathlib import Path
from PIL import Image, ImageOps, ImageStat

ROOT = Path(__file__).resolve().parents[2] / "public" / "Photography-Studio"
OUT = ROOT / "img" / "photos"
MANIFEST = ROOT / "js" / "photos.js"
MARK = "// ADD NEW PHOTOS ABOVE THIS LINE"
REDO = bool(__import__("os").environ.get("REDO"))  # REDO=1 re-exports photos already listed
WIDTHS = (640, 960, 1600)

def guess_light(im):
    g = im.convert("L").resize((64, 64))
    lum = ImageStat.Stat(g).mean[0]
    return "night" if lum < 70 else "day"

def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    set_id, src = sys.argv[1].lower(), Path(sys.argv[2])
    text = MANIFEST.read_text()
    if f'id: "{set_id}"' not in text:
        sys.exit(f'Unknown set "{set_id}". Add it to the sets list in js/photos.js first.')
    OUT.mkdir(parents=True, exist_ok=True)
    lines = []
    for f in sorted(src.iterdir()):
        if f.suffix.lower() not in (".jpg", ".jpeg", ".png", ".webp"):
            continue
        slug = re.sub(r"[^a-z0-9]+", "-", f.stem.lower()).strip("-")
        name = f"{set_id}-{slug}"
        listed = f'"img/photos/{name}"' in text
        if listed and not REDO:
            print("already listed:", name); continue
        im = ImageOps.exif_transpose(Image.open(f)).convert("RGB")
        top = None
        # All three names are always written (a small original just repeats
        # its own size), because the page asks for each of them.
        for w in WIDTHS:
            tw = min(w, im.width)
            th = round(im.height * tw / im.width)
            im.resize((tw, th), Image.LANCZOS).save(OUT / f"{name}-{w}.webp", "WEBP", quality=76, method=6)
            top = (tw, th)
        title = slug.replace("-", " ").capitalize()
        entry = {"set": set_id, "light": guess_light(im), "title": title, "file": f"img/photos/{name}", "width": top[0], "height": top[1], "alt": f"{title} (edit this description)"}
        if not listed:
            lines.append("  " + json.dumps(entry, ensure_ascii=False) + ",")
        print("re-exported:" if listed else "added:", name, top)
    if lines:
        MANIFEST.write_text(text.replace("  " + MARK, "\n".join(lines) + "\n  " + MARK, 1))

main()
