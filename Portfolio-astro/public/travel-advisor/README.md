# Gredin Travel Advisor (template)

Modern rebuild of `../Website3` (Travelly). Static HTML/CSS plus a small
set of JavaScript component classes; no build step of its own.

## Structure

```
index.html              page layout: places the components, holds the hero
                        copy and the contact form
css/style.css           tokens, layout, components, responsive rules
js/data.js              ALL content: brand, nav, itinerary, steps, trips...
js/core.js              Component base class + html`` escaping helper
js/components/*.js      one class per UI piece
js/main.js              loads the content and registers the components
fonts/, img/            self-hosted fonts (OFL) and photos
```

## Components

Each is a class extending `Component` (which extends `HTMLElement`), used
as a custom tag that reads its content from `data.js` via `data-from`:

| Tag | Class | Renders |
| --- | --- | --- |
| `<gta-header data-from="site">` | `SiteHeader` | brand, nav, CTA; `open()` / `close()` / `toggle()` for the phone menu |
| `<gta-itinerary data-from="itinerary">` | `ItineraryCard` | the hero's route-style sample itinerary |
| `<gta-steps data-from="steps">` | `StepList` | numbered "How it works" steps |
| `<gta-trip-grid data-from="trips">` | `TripGrid` | the trip layout, composed of `TripCard`s |
| `<gta-trip data-from="trips.0" feature>` | `TripCard` | one trip (`feature` = large card) |
| `<gta-included data-from="included">` | `IncludedList` | what every booking covers |
| `<gta-footer data-from="site">` | `SiteFooter` | footer and links |

To add a component: create a class with a `static tag`, a `render(data)`
that returns an ``html`…` `` template, and optional `afterRender()` for
behaviour; then add it to the list in `main.js`.

To rebrand or change trips, edit `js/data.js` only.

## Deliberately not components

- **Hero headline and intro** stay in `index.html` so they're in the page
  for search engines and visible before any JS runs.
- **Contact form** stays in `index.html` because Netlify only detects
  forms that are present in the deployed HTML (`data-netlify="true"`).
  Submissions appear under the site's Forms tab as `travel-advisor`.

## Constraints from the portfolio site

The portfolio's `_headers` sends a strict CSP (`script-src 'self'`,
`style-src 'self'`, `font-src 'self'`): no inline scripts or styles, no
font CDNs. That's why fonts are self-hosted and all JS is in files.

## Photos

The three photos are carried over from Website3 and two show
photographer credits (Mike Mezeul II, Russ Burden). Swap in your own or
properly licensed images before using this for a real business.
