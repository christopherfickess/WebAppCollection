# Tone-correct, crop, and export web sizes for one city's travel photos.
#   python3 tools/photos/refine-photos.py <source-dir> <out-dir> <jobs.json>
# jobs.json maps an output name to its settings, for example:
#   "valencia-micalet": {"src": "IMG_1234.jpg", "crop": [0, 300, 1190, 2576],
#                        "haze": 0.1, "mode": "day", "blur": [[x1, y1, x2, y2]]}
# mode: "day" (default: lift haze, colour, contrast), "night", or "food".
# blur: boxes (in original pixels) to blur, e.g. number plates.
# Writes <name>-640/960/1600.webp with no EXIF or GPS metadata.
import sys, json
from PIL import Image, ImageOps, ImageEnhance, ImageFilter
SRC=sys.argv[1].rstrip('/')+'/'
OUT=sys.argv[2]
jobs=json.load(open(sys.argv[3]))

def levels(img, lo_pct, hi_pct):
    out=[]
    for ch in img.split():
        h=ch.histogram(); n=sum(h); acc=0; lo=0; hi=255
        for v,c in enumerate(h):
            acc+=c
            if acc>=n*lo_pct: lo=v; break
        acc=0
        for v in range(255,-1,-1):
            acc+=h[v]
            if acc>=n*hi_pct: hi=v; break
        hi=max(hi,lo+1)
        out.append(ch.point(lambda x,lo=lo,hi=hi: max(0,min(255,round((x-lo)*255/(hi-lo))))))
    return Image.merge('RGB',out)

for name,j in jobs.items():
    im=ImageOps.exif_transpose(Image.open(SRC+j['src'])).convert('RGB')
    for b in j.get('blur',[]):
        im.paste(im.crop(tuple(b)).filter(ImageFilter.GaussianBlur(6)), tuple(b[:2]))
    if j.get('crop'): im=im.crop(tuple(j['crop']))
    mode=j.get('mode','day')
    if mode=='night':
        # Keep the dark sky dark; open up the shadows a little, tame noise.
        im=im.filter(ImageFilter.MedianFilter(3))
        im=im.point(lambda x: round(255*((x/255)**0.9)))
        im=ImageEnhance.Contrast(im).enhance(1.05)
        im=ImageEnhance.Color(im).enhance(1.06)
    elif mode=='food':
        im=levels(im,0.004,0.004)
        im=ImageEnhance.Color(im).enhance(1.1)
        im=ImageEnhance.Contrast(im).enhance(1.05)
    else:
        haze=j.get('haze',0.25)
        im=levels(im, 0.004+0.02*haze, 0.002)
        im=im.point(lambda x: round(255*((x/255)**(1+0.12*haze))))
        im=ImageEnhance.Contrast(im).enhance(1.04+0.06*haze)
        im=ImageEnhance.Color(im).enhance(1.06+0.08*haze)
    im=im.filter(ImageFilter.UnsharpMask(radius=1.6, percent=50, threshold=3))
    for w in (1600,960,640):
        r=im if im.width<=w else im.resize((w, round(im.height*w/im.width)), Image.LANCZOS)
        r.save(f'{OUT}/{name}-{w}.webp','WEBP',quality=74, method=6)
    print(name, im.size, mode)
