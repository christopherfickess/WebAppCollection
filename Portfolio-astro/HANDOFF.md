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

**Reminder (bit us again this session):** the phone screenshot that
reported these bugs was from the pinned `6ae7fc79…--` deploy URL, which
never updates. Check fixes on the branch alias
`redesign-rails-nav-theme--starlight-dogfood-test-1.netlify.app`.

## Known gaps / things to watch

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
