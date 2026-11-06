# Fox & Fern Photography (template)

A data-driven photographer's portfolio and booking site. Static files only; served from `/Photography-Studio/`.

## Change the content
Everything visible is in `js/data.js`: name, nav, hero, about, gallery, packages, steps, FAQ. Change the base path in `site.base` if the site moves.

## Replace the placeholder photos
The gallery currently shows illustrated placeholders drawn by `tools/photos/make-placeholders.py` (original artwork, no stock photography). To use real photos:
1. Export each photo at 640, 960 and 1600 px wide as WebP: `img/photos/<name>-640.webp`, `-960.webp`, `-1600.webp` (the Travel Advisor's `tools/photos/refine-photos.py` does this).
2. Update the entry in `data.js`: `file`, `width: 1600`, `height` (the 1600 export's real height), `alt`, `category`, `title`.

## The booking form
`index.html` holds a static Netlify form (`name="photo-session"`, honeypot included). It must stay plain HTML so Netlify can detect it. Submissions go to `thanks/`.

## Rules this site follows
No inline styles or scripts (the site's CSP blocks them); set positions in CSS. Hero fox and leaves come from the original Website2 artwork.

## Add-on modules

- **Print preview** (`#wall`, `fx-wall`): edit `printSizes` in `js/data.js`. It uses the gallery photos.
- **Best light on your date**: set `site.location` (place, lat, lon, timeZone) in `js/data.js`. To remove, delete `LightNote.attach` in `js/main.js` and the `#light-note` paragraph.
- **Day timeline**: edit `day` in `js/data.js`; `light` is dawn, day, dusk, or night and sets the dot colour.
