# Handover: how to run your site

This site is made of plain files. There is no database and nothing to keep updated. Change a file, save it, and the host publishes the new version.

## Change the words, prices, and links
Open `js/data.js`. Every piece of text on the site is there: the name, menu, hero, About text, packages and prices, questions, the day timeline, and the footer. Change the text between the quotation marks and keep the quotation marks and commas.

## Change the colours
In `js/data.js`, edit the `theme` block (`accent`, `text`, `muted`, `soft`) and the four `sky` colours. Colours are written as `#d9622b` or `[26, 40, 38]`. Keep text colours light against the dark sky so it stays readable. Run `npm run quality` afterwards: it fails if contrast gets too low.

## Change the fonts
Fonts are files in `fonts/`, set at the top of `css/style.css`. To swap one, add a `.woff2` file and change its `@font-face` line. Only use fonts you are licensed to use (see `LICENSES.md`).

## Add or replace photos
See `photo-inbox/README.md`. In short: put photos in a collection folder, run one command, then check the title, description, and time of day for each in `js/photos.js`.

## Set your location (for the booking-date light note)
In `js/data.js`, set `location` (place name, latitude, longitude, time zone). The booking form then shows sunrise, golden hour, and sunset for the date a client picks.

## Replace the placeholder business details
Search `js/data.js` for the business name, `business`, and the footer note. Replace the text on `privacy/index.html` and `terms/index.html`, and have a lawyer review them.

## Receive bookings
The booking form works on Netlify with no extra set-up. Submissions appear in the Netlify dashboard under Forms. Set up email notifications there.

## Visitor statistics (optional)
The site loads no tracking scripts. To add privacy-friendly statistics such as Plausible, add its script to `index.html` and allow its address in `script-src` and `connect-src` in the `_headers` file. Update the privacy page to say so.

## Check everything still works
Run `npm run quality`. It opens every page in a real browser at phone, tablet, and desktop widths and checks for errors, broken images, sideways scrolling, and accessibility problems. It writes `quality-report.md`.

## Calm mode
Visitors can switch off the moving sky, walking fox, and animations with the "Calm mode" button in the footer. The site also respects the device's "reduce motion" setting.
