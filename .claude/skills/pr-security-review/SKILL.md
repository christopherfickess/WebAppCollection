---
name: pr-security-review
description: Review changes in the WebAppCollection repo (Portfolio-astro): logic, security, tests, site load. Report first, fix after approval, then re-check PR comments.
---

# PR security review (WebAppCollection)

Review a branch or PR in `christopherfickess/WebAppCollection` (site code in `Portfolio-astro/`). The repo is a mono repo for now with three sites that all get reviewed: the **main portfolio** (`src/pages`: home, projects, contact, observability, resume), **Fox & Fern** (`public/Photography-Studio`, with the Netlify functions) and **Gredin Travel Advisor** (`public/travel-advisor`). They will be split into separate repos later; `tools/quality/sites.mjs` is the one list of sites and pages. The top-level `Portfolio/` and `Website1-3/` folders look like older copies of what ships from `public/`; they are not covered by the checks, so flag any change to them. Phases run in order. Stop at the report and wait for approval before changing anything.

## Ground rules

- Never commit directly to `main`. Changes reach it through a PR, and merging happens only when the user explicitly says to.
- Stay on the branch already being worked on. Do not cut a second branch unless told to; cut a new one only when starting from `main`.
- Never force-push or change repo settings unless asked.
- Stripe stays in test mode. Never print or commit secrets.
- `Portfolio-astro/HANDOFF.md` is the briefing for the next agent. Keep a short "Current state" section accurate (rewrite it, don't pile on), and move finished history to `HANDOFF-archive.md` instead of deleting it.
- GitHub GraphQL has been blocked in some cloud sessions. Try `gh api graphql` first; if refused, use REST (`gh api repos/christopherfickess/WebAppCollection/...`).

## Phase 1: Gather

- Identify base and head, then read the full diff and the files around it, not just the hunks.
- List open PR comments and review threads (REST: pulls/{n}/comments, pulls/{n}/reviews, issues/{n}/comments). Note which are resolved.
- Run the checks yourself from `Portfolio-astro/`. `npm run check:all` runs the whole set: build, `npm test` (unit, security and pipeline tests), `npm run test:e2e`, `npm run security:site` (built pages of all three sites), `npm run quality` (every page in a real browser: console and CSP errors, broken images, sideways scroll, axe accessibility) and `npm run integrity` (links, anchors, sitemap, canonicals, robots), `npm run themes` (contrast in every preset, light and dark), `npm run behavior` (theme, uptime widget, contact form, viewer, slideshow, manage page in a real browser) and `npm run lighthouse` (several page types per site, with per-site score floors). `npm test` also runs every Netlify function handler test and the bad-content tests for the editor files. A green CI badge is necessary, not sufficient. Check CI with `gh run list --branch <branch>`. If something cannot run here (no secrets, network, browser), say what was not run and why.
- Check the PR touches only what it should: if a page was added to `src/pages`, it must be listed in `tools/quality/sites.mjs` (`tools/tests/pipeline.test.mjs` fails otherwise).

## Phase 2: Review (deepest blast radius first)

Derive the order from the diff. Default order for this repo:

1. Money and booking: `netlify/functions/lib/studio.mjs`, Stripe webhook, refunds, holds, manage links.
2. Config that changes live services: `tools/configure-services.mjs`, `tools/sync-netlify-env.mjs`, `.github/workflows/*`.
3. Content and editor: `public/Photography-Studio/content/*.json`, `admin/config.yml`, `tools/build-content.mjs`.
4. Front end: `public/Photography-Studio/js`, CSS, pages.

Logic checklist (money and state):
- Concurrency: every read-modify-write of a Blobs key (`holds`, `bookings`, `booked`) goes through `update()` (compare-and-swap). What if two requests land in the same millisecond?
- Idempotency and retries: Stripe webhooks arrive more than once and out of order. A repeat delivery, a retry after partial failure, or an already-refunded payment must not double-act.
- Every payment has a refund path. Deposit and balance are separate payment intents; anything that frees a date or cancels must handle both.
- Partial failure: what is left if step 2 of 3 throws? A claimed hold with Stripe down must be released.
- Time: expiry, time zones, and `now` injected rather than `Date.now()` in logic tests must control.
- Content vs schema: every field `admin/config.yml` can write matches what the code and `build-content.mjs` read.
- Pipeline ordering: DNS record before certificate request; flags mean what the code assumes (`site.ssl` is about the netlify.app name, not the custom domain).

Security: secrets in code, logs, or workflow output; webhook signature checks; input validation and rate limits on public endpoints; unauthenticated routes that mutate state; CSP and headers; third-party calls without timeouts; PII in logs and emails.

Tests: new behavior has a test that fails without the change; concurrency and failure paths are tested, not just the happy path; mocks match real API shapes.

Strain on the site: external calls on the request path (timeouts, caching, fallbacks), blob read/write counts per request, page weight and image sizes, rate limiting.

Per-site checklists (review every site the diff touches, and say which of the three were not touched):

- Main portfolio: theme and preset switching keep AA contrast in every preset and in dark mode (axe only checks the default); the resume PDF viewer and its fallback; the GitHub activity widget handles a slow or failing third-party call; no inline scripts or styles (the CSP forbids them); every new page has one `<h1>`, a title and a description.
- Fox & Fern: everything in the logic, security and strain checklists above, plus the editor config against the content schema, the manage-link flows, and the emails sent.
- Travel Advisor: client scripts and images (weight, `alt`, lazy loading), outbound links (`rel="noopener"`, https), content accuracy of destinations and field notes, and no secrets or third-party scripts.

## Phase 3: Coverage gaps

Separately from findings, list behavior this change touches that no test or pipeline job exercises. `Portfolio-astro/tools/tests/coverage-gaps.json` is the register: its `_sites` entry says what each site's checks cover and what they don't, and each untested pipeline script has an entry. Update it when you close or add a gap. Examples: (live Stripe, Cloudflare, Resend delivery, geocoding and routing services, real payment in a browser, Netlify deploy previews). For each gap say how to check it manually or what test or CI job would close it. Never present "CI is green" as proof of an uncovered area.

## Phase 4: REPORT (stop here)

Report most severe first: file and line, what is wrong, a concrete failing scenario, proposed fix. Then open PR comments and what each asks, the coverage gaps, and what was and wasn't run. Ask which fixes to apply. Change nothing yet.

## Phase 5: Fix and verify (after approval)

Fix only what was approved. Add or update tests. Re-run the Phase 1 checks. Commit to the working branch and push.

## Phase 6: Reply to and resolve PR threads

After pushing, re-read PR comments and review threads, including new bot reviews, and handle each one:

1. Open comment that was fixed and verified: reply on the thread with the commit short sha, what changed, and which test now covers it (REST: `gh api -X POST repos/christopherfickess/WebAppCollection/pulls/{n}/comments/{comment_id}/replies -f body=...`). Then resolve the thread, only once the fix is pushed and the Phase 5 checks passed. Resolve with GraphQL `resolveReviewThread` if it works; if GraphQL is blocked, use the session's review-thread endpoint (see `~/.ccr/README.md`). If neither can resolve it, say so in the report and list the threads for the user to resolve.
2. Comment that is wrong, already handled, or a judgment call: reply with the reason and leave it open for the user (or the author) to close. Never resolve a thread whose fix was not applied.
3. New comment that appears after the push: report the issue and discuss the fix with the user before acting. Do not auto-fix new findings.
4. Re-read the thread list at the end and confirm which are resolved and which remain.

## Phase 7: Report back

Summarize what changed, what was verified and how, what remains open, and any coverage gaps still unaddressed.
