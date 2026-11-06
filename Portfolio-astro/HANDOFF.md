# Portfolio redesign — session handoff

Status snapshot for picking this back up later. Read this before assuming
anything about "the live site" — there are two deployments in play right now.

## Where things actually are

- **Repo**: `christopherfickess/WebAppCollection` (GitHub). This Astro
  project lives at `WebAppCollection/Portfolio-astro/` inside it — the repo
  root on GitHub *is* `WebAppCollection`, not the `websites/` folder above it.
- **Branch**: `redesign/rails-nav-theme`, pushed to `origin`. **Not merged to
  `main`.**
- **Production** (untouched all session): `main--fickess.netlify.app`, still
  serving the old hand-written site at `WebAppCollection/Portfolio/`.
- **Test deployment** (new Astro site): Netlify site `starlight-dogfood-test-1`,
  building from `redesign/rails-nav-theme`, base directory `Portfolio-astro`.
  - Bookmark **`https://redesign-rails-nav-theme--starlight-dogfood-test-1.netlify.app/`**
    — this is the stable branch alias that always reflects the latest push.
  - Any URL with a long hash prefix (e.g. `6ae7fc79...--starlight-dogfood-test-1.netlify.app`)
    is a **pinned snapshot of one specific deploy** and will never update —
    don't use these for ongoing checks, only for referencing a specific past build.
  - Env var `UPTIMEROBOT_API_KEY` is already set on this Netlify site
    (All scopes, same value pasted into Production/Deploy Previews/Branch
    deploys/Preview Server contexts since the free tier doesn't allow one
    shared value across all contexts).

## What got built this session

**1. Full Astro migration** (from a hand-written, 4x-duplicated static site)
- New project at `Portfolio-astro/`, sibling to the untouched original `Portfolio/`.
- Shared components instead of 4 copy-pasted HTML files: `BaseLayout`,
  `NavRail`, `UtilityRail`, `MobileDrawer`, `Topbar`, `Footer`, `Starfield`,
  `HeroIllustration`. One shared `site.js` / `starfield.js` instead of 4
  inline script copies.
- Content-hashed asset filenames (kills the old manual `?v=N` cache-busting
  that caused real bugs all session).
- Strict CSP + security headers via `public/_headers` (`script-src`/`style-src`
  `'self'`, no `unsafe-inline` — had to externalize the theme-boot script and
  remove one inline `style=""` attribute to get there).
- Self-hosted fonts (Montserrat, Frank Ruhl Libre) instead of Google Fonts CDN.
- `astro:assets` `<Image>` for the 3 project screenshots (319KB/217KB/568KB
  PNG → 10KB/18KB/19KB WebP).
- `index-before.html` / `index-redesign.html` deliberately **not** ported into
  the component system — preserved as literal static files in `public/` with
  their own legacy CSS/JS copies, because `index-before.html` is a frozen
  snapshot that must never get content edits.
- Starfield canvas extended to light mode (was dark-only) with a warm-gold
  star palette instead of white.
- Contact form layout fixed, favicon + Resume header photo swapped to the
  octopus mark, light/dark bug chased down to the **Dark Reader browser
  extension**, not a code bug (see memory `feedback-incognito-works-extension-suspect`).
- Theme default fixed: first-time visitors (no stored preference) now land on
  **Auto** (follows OS light/dark), not hardcoded dark. Explicit Light/Dark
  picks still override and persist as before.

**2. New 5th page: Observability** (`/observability/`), added to the nav
between Resume and Contact
- **GitHub Activity** — most recently pushed repos, public GitHub REST API,
  client-side fetch.
- **GitLab Activity** — same idea via GitLab's public API. Currently always
  shows "no public projects" for the account given (`christopher.fickess20`)
  — confirmed via direct API check that whatever project they meant isn't
  public under that namespace. Not a bug, just no data to show.
- **GitHub Contributions** — a GitHub-style contribution calendar, built from
  a public third-party proxy (`github-contributions-api.jogruber.de`) since
  GitHub's own contribution calendar isn't in their public REST/GraphQL API
  without an auth token. Confirmed its numbers match the real GitHub profile
  exactly. Stretches to fill the card width without growing cell size (CSS
  grid `justify-content: space-between`); a scrollbar bug (1px rounding +
  month-label text overflow) is fixed.
- **Uptime** — the big one. Architecture: a Netlify Function
  (`netlify/functions/uptime.js`) proxies UptimeRobot's v3 API, so the real
  API key stays server-side and the browser only ever calls our own
  `/api/uptime`. Cards show: status (big glowing ring + spelled-out word,
  not a tiny dot+badge), 30-day uptime %, up/down duration, check interval,
  region checked from, expected HTTP status codes, monitor type, timeout,
  monitoring-since date, SSL/domain cert expiry (populates once you enable
  those checks per-monitor in UptimeRobot), last incident, 30-day incident
  count, mean-time-between-failures, tags and maintenance-window count
  (conditional, only shown if non-empty). Cached server-side via **Netlify
  Blobs** (150s TTL, stale-on-error fallback) — this was necessary, not just
  nice-to-have: direct testing proved the function had zero caching
  originally and re-hit UptimeRobot on every single request, which is how we
  hit real 429 rate limits mid-session.

**3. Git practice**: started making regular local commits partway through
this session (explicit ask), then had to start *pushing* to `origin` too
once Netlify needed to build from GitHub. Nothing has touched `main` or the
real production site.

## Session update — 2026-11-02: mobile layout fixes

Done directly on `redesign/rails-nav-theme` (it's the dev branch; still
nothing on `main` or production). Verified headless at 320/360/390px and
1280px, light and dark, with sample contribution data (the calendar's
third-party API isn't reachable from the build sandbox).

**Root cause of most of it:** `legacy-styles.css` drops the root
font-size to 62.5% → 53% → **45%** as the viewport narrows, so anything
sized in `rem` shrinks on phones (at 45%, `1rem` ≈ 7.2px) while fixed-px
things don't. Fixes below switch the affected mobile pieces to px.

- **Burger overlapping the avatar** — burger offsets were rem
  (`top/left: 1.25rem`) and the top bar's left padding was `4.5rem`
  (≈32px) while the burger itself is 42px wide. Now px: burger at
  `top: 13px; left: 16px` (vertically centered in the 68px bar), top bar
  `padding-left: 72px`. Page title ellipsizes instead of crowding.
- **Mobile drawer offset from the screen edge** — the drawer is a
  `<nav>`, so legacy's bare `nav { margin: 2rem; width: 90% }` rules hit
  it. Reset `margin: 0`; width 270px (max 85vw), full `100dvh`, scrolls
  internally if tall.
- **Drawer had no way to close except tapping the dim overlay** — added
  an X close button, Escape key, focus moves to the X on open and back to
  the burger on close, `aria-expanded` on the burger, body scroll lock
  while open, and it auto-closes if the viewport grows past 850px.
  Drawer links are 16px with 44px tap targets (were `1.4rem` ≈ 10px).
- **Contribution calendar on phones** — it scrolls sideways (53 weeks
  can't fit), but it opened on the *oldest* months, cells ran together
  (`space-between` collapsed the gaps to 0), and month/day labels were
  ~5px. Now: opens scrolled to the newest weeks, 3px gaps, 10px labels
  aligned to the week columns, Mon/Wed/Fri pinned while scrolling.
  Desktop layout unchanged. Note: the mobile CSS block must stay
  *after* the base `.gh-contrib-*` rules — same specificity, so source
  order decides (first attempt failed for exactly that reason).
- **Anchor jumps** — `html { scroll-padding-top: 76px }` so in-page
  links land below the fixed bar.
- The "Live Signal heading cut off" in the reported screenshot was just
  the page scrolled under the fixed header — expected, not a bug.

Files touched: `src/components/MobileDrawer.astro`,
`src/scripts/site.js`, `src/scripts/github-contributions.js`,
`src/styles/rails.css`.

**Follow-up same session — Theme + Display on mobile.** Under 850px the
top bar hides its Theme switch (Light/Auto/Dark) and Display preset menu
for lack of room, and nothing replaced them, so phones had no way to
change either. The drawer now has **Theme** and **Display** sections
below the links. They reuse the same `.theme-opt` / `.display-option`
classes and `data-*` attributes, so `site.js` wires both copies; preset
"active" state is now matched by preset key (not by element) so picking
in the drawer also updates the desktop dropdown and vice versa. The
preset list moved to `src/data/presets.js`, imported by both `Topbar`
and `MobileDrawer`, so there's one list to edit. Choosing a theme or
preset keeps the drawer open so the change is visible. Verified: choice
applies, both copies stay in sync, persists across reload; drawer
scrolls on short screens (320×568); desktop dropdown unchanged.

**Follow-up same session — Display as a slide-in sub-panel.** The four
preset buttons in the drawer were replaced by one collapsed row,
**Display · <current preset> ›**, which slides in a full-width
sub-panel (Settings-app style: **‹ Back**, title, the four presets with a
check on the active one). A flyout to the right was considered and
rejected: the drawer is ~270px of a ~390px phone, leaving ~120px — too
narrow for the list. Details:
- Drawer is now two absolutely-positioned panels
  (`#drawer-panel-main`, `#drawer-panel-display`) that slide with
  `transform`; each scrolls independently. The hidden panel is `inert`.
- Escape steps back one level (sub-panel → main → closed); closing the
  drawer from the sub-panel always reopens on the main menu.
- Picking a preset applies immediately and stays on the sub-panel; the
  collapsed row's swatch + name update via `markActivePreset()`.
- Theme stays an inline 3-way switch (small enough not to need a panel).
- Respects `prefers-reduced-motion` (no slide animation).

**Follow-up same session — home hero illustration on phones.** Reported:
the hero art looked different on a phone (portrait and sideways) than
on desktop. Three causes:
1. Under 850px, `legacy-styles.css` hides the themed `.splash` blob and
   puts the raw blue/pink `/img/splash.png` behind `.intro-images` as a
   background — so phones got a differently colored, differently placed
   blob that ignored the Display preset.
2. The SVG kept its fixed `height="568"` box at every width; on narrow
   columns the artwork sat centered in lots of empty space.
3. The blob was a fixed `36rem` while the art scaled with the column, so
   their relationship changed with width (sideways phone: blob far too
   big relative to the art).
Fix (`rails.css`, "hero composition" block): SVG `height: auto`, and the
blob's size/offset are percentages of the illustration column measured
off the desktop layout, so the picture is the same shape everywhere and
just scales. Legacy PNG background removed under 850px; themed blob shown
instead. Desktop is visually unchanged (blob within a few px of before).
Verified at 1440, 1280, 915×412, 844×390, 390×844; no sideways scroll.

**Correction (same session):** that first pass *did* shift the desktop
hero (art ~35px lower, blob overlapping less) — the user flagged it as
off from the original design. Reworked: **desktop (>1100px) is back on
the original rules, untouched** — pixel-diffed against the pre-change
render at 1440px with zero differences. The proportional rebuild now
only applies **≤1100px**, with every value measured precisely off the
original 1440px render (art 90% of the column starting 22.77% of column
width down; blob 52.5% wide, top/right offsets −2.8%; vertical offsets
use margin percentages so they track width). Result: sideways and
portrait phones show the desktop composition, scaled. There's a small
step at the 1100px boundary because the original desktop rules aren't
proportional themselves (fixed 568px box + 36rem blob) — at 1101px you
get exactly what the original looked like at that width.

**Reference size changed to 1536px (user's pick).** The original desktop
rules aren't proportional, so the blob-to-art relationship differs by
monitor (at 1920 the blob is ~51% of the art's width and sits low; at
1366 it's ~62% and rides high). Shown the four common PC widths
side by side, the user chose the **1536px** look. The ≤1100px rules now
reproduce that exactly (verified: blob 64.3% of art width, top 25.7% of
art width above it, right edge 14.5% past it — identical numbers at
1536 desktop, 1100, 915×412 and 390×844). Desktop >1100px still uses
the original rules unchanged. Phones also get a 16px gap above the art
so the blob doesn't touch the last line of the bio.

**Reminder (bit us again this session):** the phone screenshot that
reported these bugs was from the pinned `6ae7fc79…--` deploy URL, which
never updates. Check fixes on the branch alias
`redesign-rails-nav-theme--starlight-dogfood-test-1.netlify.app`.

**Follow-up same session — Resume PDF not rendering inline on Netlify.**
Cause: `public/_headers` sent `X-Frame-Options: DENY` and CSP
`frame-ancestors 'none'` on *every* response, including the PDF itself.
The Resume page embeds the PDF with `<object>`, which browsers treat as
framing, so the PDF refused to load even inside our own page — the box
showed only the "can't display" fallback. It worked earlier only under
`astro dev`, which ignores `_headers`. Fix: `SAMEORIGIN` /
`frame-ancestors 'self'` globally (other sites still can't frame ours).
Verified with a local server that applies the headers: DENY → blank
fallback (console: "violates frame-ancestors 'none'"); SAMEORIGIN → PDF
renders. Changed globally rather than with a `/resume/*` override
because Netlify's handling of the same header from two matching rules
isn't something to rely on.

## Session update — 2026-11-03: Gredin Travel Advisor template

New `public/travel-advisor/` (served at `/travel-advisor/`), a modern
rebuild of Website3 (Travelly), which is left untouched. User asked for
it named "Gredin Travel Advisor" and built **OOP-style**: the header,
itinerary, steps, trip cards, included list and footer are JS classes
extending a shared `Component` base (`js/core.js`, itself a native
custom element), each rendering content from one `js/data.js` via a
`data-from` path; `TripGrid` composes `TripCard`s. Hero copy and the
Netlify contact form (`name="travel-advisor"`) stay as static HTML on
purpose — see `public/travel-advisor/README.md` for structure and why.
Fonts self-hosted (Bricolage Grotesque + Newsreader, OFL) because the
site CSP blocks font CDNs. Verified under the real CSP headers locally:
all components render, no console errors, fonts load, no sideways
scroll at 1440 / 844×390 / 390×844, phone Menu opens/closes.
Added to the **Projects** page under a new "Templates" heading (above
"Earlier practice builds"); `.projects-grid` switched `auto-fit` →
`auto-fill` so a lone card keeps normal width.

**Follow-up same session — Travel Advisor expanded to 8 destination
guides.** User asked to turn it into a platform covering London, Curaçao,
Antigua, Paris, Barcelona, Valencia, San Diego, and New York City; chose
"a guide page per city" and "designed, no photos" when asked.
- New `destinations/` index (grouped Europe / Caribbean / United States)
  and one guide per city: hero in the city's own colour with the name as
  the image, a 12-month "When to go" strip, a sample itinerary (reuses
  `ItineraryCard`), neighbourhoods, getting around, "Before you go", and
  a "Plan a trip to X" CTA that pre-fills the home contact form.
- Content is all in `js/destinations.js`. New classes: `GuidePage`
  (composes the rest), `SeasonChart` + `Seasons` model, `DestinationCard`
  / `DestinationGrid`, a `DefinitionList` base with `PlaceList`,
  `FactList`, `IncludedList` subclasses, and `ContactForm`. Removed
  `TripCard`/`TripGrid` and the Iceland/Tanzania photos (the home page's
  Sample trips became Destinations; the hero plan is now London → Paris).
- Guide pages are generated by `tools/build-guides.mjs`, wired as npm
  `prebuild` (and into `dev`), so Netlify regenerates them on every
  build. `npm run guides` runs it by hand.
- Entry/transit facts were web-checked Nov 2026 for US travellers: UK ETA
  £20; EU EES fully live since 10 Apr 2026 and ETIAS (€20) due Q4 2026
  with a 6-month grace period; Curaçao Digital Immigration Card per
  person per trip; ArriveAntigua within 72 h; Curaçao's currency is the
  Caribbean guilder (XCG) since 2025; NYC MetroCards no longer sold
  (OMNY). These go stale — re-check before publishing for real.
- City colours checked for ≥4.5:1 text contrast (San Diego darkened to
  pass). Verified under the real CSP: all 10 pages render at 1440 and
  390 wide, no console errors, no sideways scroll, every internal link
  returns 200, and `?to=` pre-fill is escaped (tested with markup).

**Follow-up same session — our own travel photos + Nomade-inspired
styling.** User pointed at nomaderealty.com as a style reference ("some of
the features, not all") and sent their own photos for London + Kew
Gardens (6), Valencia (13), and Barcelona (16). nomaderealty.com couldn't
be opened in a browser from the sandbox, only its page text, so the
borrowing is from its structure, not exact styling:
- **Full-bleed photo hero with a labelled scene index** (`PhotoHero`,
  `Slideshow`): London, Valencia, Barcelona guides. Cross-fades every
  6.5 s; pauses on hover/focus or when a scene is picked; never
  auto-advances with reduced motion or in a hidden tab. On phones (≤560px)
  the photo stacks above the text instead of sitting behind it.
- **Split image/text block** (`DayTrips`): London's "Worth the trip out"
  → Kew Gardens (District line ~40 min from Westminster, or train
  Waterloo → Kew Bridge ~30 min).
- **Large-type full-screen phone menu** (`SiteHeader`, body scroll lock,
  Menu/Close label).
- Plus: photo destination cards (`cardPhoto`) and a "From our trip"
  captioned mosaic (`PhotoGallery`) on Valencia and Barcelona.
Skipped from Nomade: numbered section markers, two-tone italic headlines,
and arrows on every link — they'd fight the existing design and are
common template tells.

Photos: `tools/photos/refine-photos.py` (per-channel levels to lift haze,
gentle contrast/colour, light sharpening; separate night and food modes;
crops; plate blurs) → 640/960/1600 WebP, all metadata stripped (one
Valencia original carried a capture date; none had GPS). Blurred readable
plates in the London taxi and Barcelona port shots; cropped the "Galaxy
S24 Ultra" watermark off the Barcelona photos that had it. Left out on
purpose: a blurry night plaza and an estate-agent window (Valencia); the
car-window and bus-window shots (Barcelona: glare, plates, dash). The wine
photo is captioned as the Barcelona → Valencia train (per user), and
Barcelona's sample plan gained a Day 5 train to Valencia. The New York
photo moved to `img/new-york/` and the new naming scheme.

Verified under the real CSP at 1440 and 390 wide: all 10 pages render
with no console errors or sideways scroll, every gallery image loads,
internal links return 200, autoplay advances and pauses.

### Paris photos (2026-11-03, later)

- Paris guide now has our own photos: 4-scene slideshow header (Eiffel Tower,
  Pont Alexandre III, Notre-Dame at night, view from the tower), a card photo
  (Eiffel from a terrace), a 14-photo "From our trip" gallery (Champ de Mars,
  Arc de Triomphe, Panthéon, Louvre inverted pyramid, Montmartre, catacombs,
  a croque monsieur, ...), and a Palace of Versailles day-trip section.
- Photos live in `public/travel-advisor/img/paris/` (3 WebP widths each),
  refined with `tools/photos/refine-photos.py`. Plates/faces blurred, EXIF
  stripped. Left out on purpose: a personal ring-box photo and duplicates.
- New "Catacombs" line in Paris "Before you go" (timed slots only, closed
  Mondays, 131 steps down / 112 up). Checked Nov 2026 against a third-party
  guide; re-check on the official catacombs site before relying on it.
- Verified under the real CSP at 1440 and 390 wide: no console errors, no
  sideways scroll, all 23 images load.
- Pending: the user just sent Curaçao photos (Willemstad waterfront and
  pontoon bridge, beach club, sunsets, dolphins, food, hotel pool). Not yet
  processed. Several have the phone watermark bottom-left (crop it) and some
  show people (blur or crop). Curaçao is still a plain-colour guide.

### Curaçao, Antigua photos; slide + zoom (2026-11-03, later)

- Curaçao and Antigua guides now have our own photos (slideshow header, card
  photo, gallery) in `img/curacao/` and `img/antigua/`. Left out on purpose:
  photos with identifiable people up close (beach-lounger legs, concert
  crowd) and the Galaxy-watermark screenshots.
- Photo hero (`photo-hero.js`) now slides between photos (instead of
  cross-fading), with prev/next arrows, swipe, the numbered index, and an
  "Enlarge" button. Direction-aware (wraps forward/back correctly).
- New `js/lib/lightbox.js`: every gallery and day-trip photo (and the hero via
  "Enlarge") opens in a full-screen viewer: grows from the clicked photo,
  click/tap/wheel/pinch zoom with drag-to-pan, arrows/swipe between photos,
  Esc to close. Photo.tag takes `zoom: true` (clickable + keyboard) or
  `full: true` (large file only). Uses a <dialog>; all motion is set via the
  CSSOM so it works under the strict CSP.
- London: only six London/Kew photos have reached the session so far, and all
  six are already used (3 header scenes, card, 2 Kew). If there are more,
  re-attach them.
- Unused Paris/Barcelona/Valencia photos still in the upload folder: Place de
  la République, Louvre pyramid, Montmartre street, Barcelona/Valencia night
  streets. Add if wanted.

### New York photos (2026-11-03, later)

- New York now has a 5-scene slideshow header (Midtown from above, Chrysler,
  Empire State, Rockefeller tree, Washington Square Arch), a card photo and a
  9-photo gallery (holiday bar, Madison Square tree, lit passage, mirror room,
  Harry Potter store, the Met, Central Park in autumn). Files in
  `img/new-york/nyc-*`. Old B&W skyline file remains but is unused.
- Added an "In winter" line to its "Before you go". Left out: the photo of a
  person dancing by the tree (personal) and others with people up close;
  passersby blurred/cropped in the rest.

## Washington D.C., Seattle, San Diego photos (travel-advisor)

- Added `washington-dc` (16 photos in `img/washington-dc/`) and `seattle` (4 photos in `img/seattle/`) to `js/destinations.js` and `destinationOrder`; now 10 guides. San Diego now has 3 photos (`img/san-diego/`): sea lions, succulent garden, cocktails.
- DC facts checked Nov 2026: Washington Monument timed tickets (recreation.gov, $1 fee; free same-day at 15th St lodge), Ford's Theatre $5 timed ticket, Metro tap fares. Re-check before relying on them; they change.
- Seattle facts from visitseattle.org: Link light rail, ORCA/tap pay, monorail. Washington State Ferries details were NOT verified, so the itinerary only says to check schedules.
- Left out on purpose: crowded Metro Center photo (strangers), Great Wheel portrait (personal photo). Strangers were cropped or blurred in the DC photos; the jellyfish top was cropped to remove silhouettes; the cocktail photo top was cropped for the same reason.
- The diamond and cocktail photos have generic captions (venues unknown). The sea lion photo is captioned without naming a place.
- Accents: DC #2f6b4f, Seattle #1d6a72, both about 6.3:1 against white.

## Nassau, The Bahamas (travel-advisor)

- Added `nassau` (region `caribbean`, 13 photos in `img/nassau/`); now 11 guides. Photos are of a Paradise Island resort; captions stay generic because the venue was not stated.
- Facts from nassauparadiseisland.com: airport taxi fares (approximate, two passengers), jitney about $1.50, water taxi about $7 / 10 minutes (the site gives two different departure points, so the guide says to confirm), no ride-sharing, US passport needed. Currency line (Bahamian dollar, USD widely accepted) and the hurricane-season note are general knowledge, not checked against a page this session.
- Left out: the corridor photo with three men walking (strangers are the subject). Bottom strip cropped on every photo to remove the phone watermark.
- Fixed width/height for all photo entries in `destinations.js`: they must be the 1600px export size (the refine script caps at 1600 wide), not the source size. San Diego and the Seattle jellyfish had source sizes; now corrected.
- Accent #0b7a86 gives about 5.1:1 against white.

## v2 look for the travel advisor (single commit, easy to undo)

- Restore point: commit 96faea9 (before v2). To undo everything: `git revert <v2 commit>` or ask Claude to revert it. All v2 CSS is one marked block at the end of `css/style.css`.
- Typography: smaller scale (16px base, 15.5px on phones). Headings, wordmark, city names, menu links use EB Garamond (self-hosted, `fonts/eb-garamond*.woff2`, SIL OFL); buttons, nav, labels stay Bricolage Grotesque; body stays Newsreader.
- New components in `js/components/home-extras.js`: `gta-proof` (figures counted from the guides), `gta-pills` (destination links, also on the destinations index), `gta-faq` (native `details`, no script), `gta-trips` (sample trips drawn from each guide's sample plan, no invented client data), `gta-quote` (closing call to action).
- Footer is now a full dark footer (destinations, quick links, elsewhere) and also renders the fixed phone action bar (`site.actionBar` in `data.js`; add `tel:`/`sms:` entries when there is a real number).
- Header: burger animates into an X; the phone menu is unnumbered, serif, with arrow marks; its top offset is measured from the header height.
- Home page now: hero (two buttons plus a "Scroll to explore" cue), proof strip, how it works, destinations with pills, sample trips, what's included, questions, quote block, contact form. Menu gained "Sample trips" and "Questions".
- Not done: section numbering (explicitly not wanted).

## v2 follow-ups (travel-advisor)

- Phone header: Menu/Close button now on the left, brand centred (grid in the 860px block of the v2 CSS).
- Destination pills: on phones they are one swipeable row (was four wrapped rows); desktop still wraps.
- Footer redesigned to be light, with the destinations as running serif links ("Where to next"), quick links and outside links as small inline rows, and a short saffron stroke above the brand. The earlier dark, italic-tagline, two-column-list footer was too close to the reference site. Restore point for the dark footer: commit 1ab34da.

## v2 follow-up 2 (travel-advisor)

- Phone menu: the arrow marks (too close to the reference site) were replaced by route-stop rings in saffron (same dots as the itinerary; filled on hover/current), with dashed dividers.
- Footer redesigned again around the route idea: "Next stops" shows each destination as a stop on a line (name plus country), then brand and small link lists, then the note. Light (white) band. Previous footers: dark version 1ab34da, running-text version 20b208d.

## v2.1 features (travel-advisor)

- Month picker ("Where to go in...") on the home page and destinations index: `gta-months` in `js/components/explore.js`, driven by each guide's `seasons` data.
- Next/previous stop links at the foot of every guide (wraps around `destinationOrder`).
- "What it costs" line per guide from `budget.amount` in `js/destinations.js`. Figures are traveller-reported daily averages per person from Budget Your Trip (undated; London and Paris in GBP, Valencia in EUR). Nassau has no budget and no flight times are shown because neither could be verified. Re-check before relying on them.
- Link previews: 1200x630 images in `img/og/` (home plus one per city). `tools/build-guides.mjs` writes og/twitter/canonical tags using `DEPLOY_PRIME_URL` or `URL` from the Netlify build; with neither set (local build) the tags are skipped. The home page's tags sit between `<!-- og:start -->` and `<!-- og:end -->` and are rewritten at build time. New city = add `img/og/<slug>.jpg`.
- Field notes: `js/notes.js` (3 notes, facts checked November 2026), pages at `field-notes/`, generated by build-guides. Nav item "Field notes" added.
- Testimonials: `js/testimonials.js` is intentionally empty and its home-page section stays hidden. Add real quotes as `{ quote, name, trip }`; never invent them.
- Nav fix: links no longer wrap at 861-1120px (tag hidden there). All v2.1 CSS is one marked block near the end of `css/style.css`.
- Print/PDF itinerary was deliberately not built.

## v2.2 travel details (travel-advisor)

- `js/travel-info.js` holds, per destination, `caution` (hurricane season), `advisory` (US State Department level), `airlines` and `shopping`; data.js merges them into the guides. Each field is optional and its section only renders when present. US cities have no advisory or airline list on purpose.
- Hurricane facts are from NOAA (season June 1 to Nov 30, busiest mid-August to mid-October, peak day Sept 10). Shown for Curacao, Antigua and Nassau only.
- Advisory levels, as of November 2026: France 2, Spain 2 (Barcelona, Valencia), Bahamas 2, Curacao 1, Antigua 1, UK 2. UK and Spain levels came from secondary sources because travel.state.gov pages would not load; some official pages returned old cached copies. Re-check all six on travel.state.gov and update `level`/`asOf`.
- Airlines are lists of who flies each route, not rankings. Paris and Barcelona have no per-airline city pairs because sources disagreed. Valencia: United Newark to Valencia planned from June 2, 2027.
- Shopping: UK has no VAT refund for visitors (since 2021); France refund over EUR 100 same shop same day; Spain kept generic (minimum not verified); Curacao areas from the tourism board. No shopping for Nassau, Antigua or US cities (nothing verified).
- New page `packing/` (travel essentials, from `essentials` in travel-info.js), linked from the footer and each guide. All v2.2 CSS is one block near the end of `css/style.css`.

## Photography-Studio template (new)

- `public/Photography-Studio/` is the improved rebuild of Website2 (Fox Photography), kept as a separate copy; Website2 is untouched. Purpose: a photographer's portfolio and booking site template, sold as a manageable site for small businesses.
- Same pattern as the Travel Advisor: content in `js/data.js`, components in `js/components/`, strict CSP (no inline styles/scripts), base path in `site.base`. See its README.md.
- Kept from Website2: fox and palm-leaf hero, Great Vibes wordmark, charcoal and mauve, dark About panel. Fixed: lorem ipsum, 13 MB images (now responsive WebP), non-working form (now a named Netlify form with honeypot and a thanks page), gallery overlay box (now filter chips + lightbox), burger menu, footer.
- Placeholder gallery images are original illustrations from `tools/photos/make-placeholders.py` (no stock or scraped photos). Packages, prices and copy are placeholders. Fox and leaf artwork was copied from Website2 and its source is unknown; confirm you have rights before using it for a client.
- Test results: no console errors or sideways scroll at 1440, 960 and 390 wide; filter and lightbox checked. The Netlify form itself can only be confirmed after a deploy.
- Projects page has a new card ("Fox & Fern Photography") with a screenshot at `src/assets/img/PhotographyStudio.png`.

## Known gaps / things to watch

- **Travel Advisor guide facts will go stale** (added 2026-11-03) —
  entry rules especially (ETIAS launch, ETA fee). Each guide says
  "checked November 2026".
- **Seven of eight guides have no photo** (added 2026-11-03) — by design
  for now; add `photo` to an entry in `js/destinations.js` to use one
  (New York shows how).

- **Travel Advisor photos are carried over from Website3** (added
  2026-11-03) — two show photographer credits (Mike Mezeul II, Russ
  Burden). Replace with own or licensed photos before real use.
  - **Update (same session):** the two credited photos (Iceland,
    Tanzania) were removed when Sample trips became Destinations; only
    the uncredited New York photo remains.
- **Travel Advisor needs JS for its components** (added 2026-11-03) —
  with JS off, header/itinerary/trips/footer don't render (hero copy and
  form still do).

- **Inline PDF on phones** (added 2026-11-02) — most mobile browsers
  (Android Chrome, iOS Safari) don't render a PDF inside `<object>` at
  all; phones get the "Download it instead" fallback. A phone-friendly
  preview would mean rendering the PDF pages to images at build time —
  not done.
  - **Update (same session): addressed.** User confirmed on a sideways
    Android phone that only the fallback link showed. The `<object>`'s
    fallback content is now the resume's two pages as images
    (`public/resume/pages/page-{1,2}.webp`, 1400px wide) plus
    "Open the PDF · Download" links. `site.js` adds `.is-image-preview`
    to the frame when `navigator.pdfViewerEnabled === false` so it grows
    to fit the pages instead of a fixed-height box. Desktop keeps the
    real PDF viewer; the images are `loading="lazy"` inside the object,
    so desktop never downloads them. **When the PDF changes, run
    `tools/render-resume-pages.sh` and commit the new images** (needs
    poppler + Pillow locally; not part of the Netlify build).

- **Body text is small on phones site-wide** (added 2026-11-02) — same
  45%-root-font cause as above; only the pieces fixed in the session
  update were switched to px. A proper fix is removing the legacy
  root-font shrink and re-tuning sizes, which touches every page — not
  done yet.
- **Calendar month labels scroll under the pinned day labels** on phones
  (added 2026-11-02) — cosmetic; the day-label column is sticky, the
  month row isn't.

- **Response-time data isn't wired in.** It exists (`GET
  /monitors/{id}/stats/response-time`, confirmed via UptimeRobot's official
  OpenAPI spec at `cdn.uptimerobot.com/api/openapi.yaml`), but adding it
  per-monitor alongside uptime % would mean `1 + 2` API calls per monitor —
  at 5 monitors that's 16 calls in one refresh, over the free tier's 10
  req/min cap. Needs a lighter design before adding (see Next steps).
- **Only 1 UptimeRobot monitor exists**, and it's pointed at an old
  hash-pinned test-deploy URL with an auto-generated ugly name. Needs
  renaming + the rest of the monitors added (see Next steps).
- **No custom 404 page** (`public/404.html` doesn't exist) — not requested
  yet, just noting the gap.
- SSL cert / domain expiry card fields will stay empty until SSL/domain
  checking is turned on per-monitor in UptimeRobot's own settings (not
  something the API/our code can enable).

## Next steps — suggested features discussed but not yet built

In roughly the order they came up:

1. **Finish UptimeRobot monitor setup**: rename the existing monitor to
   something clean (e.g. "Portfolio — Home"), add monitors for the 3 practice
   sites (`/Website1/index.html`, `/Website2/index.html`,
   `/Website3/index.html` — note these are sub-paths of the *same* host as
   the portfolio, not independent infrastructure) and for Starlight (need the
   actual public URL — wasn't provided yet).
2. **Recent Incidents feed** — one `GET /incidents` call for the whole
   account (not per-monitor, so it's cheap on the rate limit) showing
   `reason`/`duration`/which monitor/when, across all monitors. This was the
   suggested path to both "show incident detail" and "add response-time"
   without blowing the call budget — a shared feed instead of N per-monitor
   calls.
3. **Response-time stats**, once there's a call-budget plan (e.g. alternating
   which stat refreshes, or only fetching it for 1-2 "primary" monitors
   instead of all of them).
4. **Decide and execute the real domain cutover** — point
   `main--fickess.netlify.app` (or a real custom domain) at `Portfolio-astro`
   instead of the old `Portfolio/` site, once everything above is verified.
   The `starlight-dogfood.me` domain was discussed purely as a hypothetical
   (it's branded to the Starlight homelab project, not this portfolio) and
   wasn't acted on.
5. **Optional / lower priority, discussed but not committed to:**
   - Lighthouse/performance scores via a GitHub Actions workflow on deploy.
   - Real traffic analytics via a privacy-friendly service with a public
     dashboard feature (GoatCounter was the specific suggestion) — flagged as
     "neat to have" rather than clearly valuable for a low-traffic personal
     site.
   - The original seed of the whole Observability page: a "smart icon" right
     rail (Mattermost-plugin style) — see memory
     `project-portfolio-rail-smart-icon`. Largely superseded by the
     Observability page now existing, but the memory is still there if the
     original framing is wanted.
