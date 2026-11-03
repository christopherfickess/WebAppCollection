#!/usr/bin/env bash
# Re-render the resume PDF's pages as images for the Resume page's
# phone preview. Run this whenever public/resume/Christopher_Fickess_Resume.pdf
# changes, then commit the output. Needs poppler (pdftoppm) and cwebp or
# Python Pillow. Not part of the Netlify build - the images are committed.
set -euo pipefail
cd "$(dirname "$0")/.."
PDF=public/resume/Christopher_Fickess_Resume.pdf
OUT=public/resume/pages
TMP=$(mktemp -d)
mkdir -p "$OUT"
rm -f "$OUT"/page-*.webp
# 1400px wide: sharp on high-density phone screens without being huge.
pdftoppm -png -scale-to-x 1400 -scale-to-y -1 "$PDF" "$TMP/page"
for f in "$TMP"/page-*.png; do
  n=$(basename "$f" .png | sed 's/^page-0*//')
  python3 -c "from PIL import Image; Image.open('$f').convert('RGB').save('$OUT/page-$n.webp', 'WEBP', quality=82)"
done
rm -rf "$TMP"
ls -la "$OUT"
