# Handover: how to run your site

The site is made of plain files. Words, prices and photos live in small data files in `content/`. After changing one, run `npm run content` (the host does this for you on every publish). It checks your edits and stops with a plain message if something is wrong.

## Edit in a browser (recommended)
Go to `/Photography-Studio/admin/` and sign in with GitHub. Pick a section, change it, and press Publish. The site updates in about a minute. Only people with write access to the repository can sign in.

## Edit the files directly
| File in `content/` | What it holds |
|---|---|
| `site.json` | Business name, menu, location, colours, footer links, search-engine details |
| `hero.json`, `about.json` | The top of the page and the About section |
| `packages.json` | Packages, prices, and deposits (`amount` and `deposit` are whole dollars; the deposit cannot exceed the price) |
| `print-sizes.json` | Print sizes and prices |
| `booking.json` | Minimum notice, closed weekdays, dates you are away |
| `faq.json`, `day.json` | Questions and the "day on a session" steps |
| `photos.json` | Photo titles, descriptions, and time of day |

## Change the colours
Edit `theme` in `site.json` (`accent`, `text`, `muted`, `soft`, and four `sky` colours). Run `npm run quality` afterwards: it fails if contrast gets too low.

## Change the fonts
Fonts are files in `fonts/`, set at the top of `css/style.css`. Only use fonts you are licensed to use (see `LICENSES.md`).

## Add or replace photos
See `photo-inbox/README.md`.

## Set your location
In `site.json`, set `location`. The booking form then shows sunrise, golden hour and sunset for the date a client picks.

## Take bookings and payments
1. Create a Stripe account. Add `STRIPE_SECRET_KEY` in Netlify (Site configuration > Environment variables).
2. In Stripe, add a webhook to `https://your-site/api/stripe-webhook` for the event `checkout.session.completed`. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Create a Resend account, verify your sending address, and set `RESEND_API_KEY`, `EMAIL_FROM` and `OWNER_EMAIL`.
Prefer to keep every key in GitHub? Add them as repository secrets (names above, plus `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID`), then run the "Sync secrets to Netlify" workflow from the Actions tab and redeploy.

Until step 1 is done, visitors see only the request form. Until step 3 is done, no emails are sent. Paid dates disappear from the calendar by themselves. To free a date after a refund, remove it from the booked list (ask your developer, or block/unblock dates in `booking.json`).

## Visitor counts
The site counts page views without cookies, IP addresses or user ids, and ignores visitors who send Do Not Track. Set `STATS_TOKEN` (16 or more random characters), then open `/Photography-Studio/admin/stats.html` and enter it.

## Replace the placeholder business details
Replace the business details in `site.json`, and the text on `privacy/index.html` and `terms/index.html`. Have a lawyer review them.

## Check everything still works
Run `npm run quality` for the page checks and `npm test` for the booking and payment logic.

## Calm mode
Visitors can switch off the moving sky, walking fox and animations with the "Calm mode" button in the footer. The site also respects the device's "reduce motion" setting.
