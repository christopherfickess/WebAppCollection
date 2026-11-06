# Photo inbox

Put new photos in the folder for their collection (`engagement`, `spain`, `london`, `nature`).
Name each file for what it shows, for example `cathedral-at-night.jpg`: the name becomes the photo's title.

Then run, from `Portfolio-astro/`:

    python3 tools/photos/build-photos.py engagement photo-inbox/engagement

This exports the three web sizes (and drops camera data such as GPS location), then adds the photos to
`public/Photography-Studio/content/photos.json`. Open that file (or use the editor at `/Photography-Studio/admin/`) and check each new entry:
the title, the alt text (what a screen reader says), and `light` (dawn, day, dusk, or night; the tool only guesses).

Need a new collection? Add a line to `sets` in `photos.json`. Empty collections stay hidden.

Engagement and portrait sessions: only publish photos of people with their written permission.
