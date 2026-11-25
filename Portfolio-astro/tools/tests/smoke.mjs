// Smoke test against a REAL deployed site (a branch deploy or pull-request preview):
//   node tools/tests/smoke.mjs https://deploy-preview-3--site.netlify.app
// Needs STRIPE_SECRET_KEY (test key) only to expire the test checkout it creates.
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
const base = (process.argv[2] || "").replace(/\/$/, "");
if (!/^https:\/\//.test(base)) { console.error("Usage: node tools/tests/smoke.mjs https://deploy-address"); process.exit(2); }
const studio = `${base}/Photography-Studio`;
// Netlify injects its own review toolbar into deploy-preview pages; it uses inline styles our policy rightly refuses.
const PREVIEW = /^https:\/\/deploy-preview-\d+--/.test(base);
const results = []; const ok = (m) => { results.push(m); console.log("ok  ", m); };
let browser;
try {
  // API
  const av = await (await fetch(`${base}/api/availability`)).json();
  assert.equal(av.configured, true, "email is not configured on this deploy"); assert.equal(av.payments, true, "payments are off on this deploy");
  ok("availability API answers with payments on");

  // pages in a real browser: no console errors (this catches Content-Security-Policy breakage), no failed requests
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ["--no-sandbox"] });
  for (const [name, path, wait] of [["home page", "/", "text=Reserve date with deposit"], ["manage page", "/manage/", "#manage-summary"], ["thank-you page", "/thanks/", "h1"], ["editor", "/admin/", "text=Login with GitHub"]]) {
    const page = await browser.newPage(); const errs = [];
    page.on("pageerror", (e) => errs.push(e.message));
    page.on("console", (m) => m.type() === "error" && !/Failed to load resource.*(404|401)/.test(m.text()) && !(PREVIEW && /Applying inline style violates|app\.netlify\.com/.test(m.text())) && errs.push(m.text()));
    const res = await page.goto(studio + path, { waitUntil: "load" });
    assert.equal(res.status(), 200, `${name} returned ${res.status()}`);
    await page.waitForSelector(wait, { timeout: 15000 }).catch(() => { throw new Error(`${name}: expected "${wait}" never appeared. Errors: ${errs.join(" | ")}`); });
    assert.deepEqual(errs, [], `${name} console errors: ${errs.join(" | ")}`);
    await page.close(); ok(`${name} loads with no errors`);
  }

  // security behaviour
  const forged = await fetch(`${base}/api/stripe-webhook`, { method: "POST", headers: { "stripe-signature": "t=1,v1=00" }, body: "{}" });
  assert.equal(forged.status, 400); ok("forged payment notice refused");
  const foreign = await fetch(`${base}/api/request`, { method: "POST", headers: { Origin: "https://evil.example", "Content-Type": "application/json" }, body: "{}" });
  assert.equal(foreign.status, 403); ok("form refuses other sites");
  const oauth = await fetch(`${base}/api/oauth/auth?provider=github`, { redirect: "manual" });
  assert.equal(oauth.status, 302); assert.ok(oauth.headers.get("location").startsWith("https://github.com/login/oauth/authorize")); ok("editor sign-in redirects to GitHub");
  assert.equal((await fetch(`${base}/api/export`)).status, 401); ok("export needs a token");
  const bad = await fetch(`${base}/api/request`, { method: "POST", headers: { Origin: base, "Content-Type": "application/json" }, body: JSON.stringify({ name: "", email: "nope" }) });
  assert.equal(bad.status, 400); ok("request form rejects incomplete input");

  // travel estimate: uses free public address and routing services with no uptime promise, so an outage there is a
  // warning, not a failure; when they do answer, the answer must be right.
  const quote = async (to) => (await fetch(`${base}/api/travel-quote?to=${encodeURIComponent(to)}`)).json();
  const near = await quote("Edmond, OK");
  if (near.ok) { assert.equal(near.mode, "none"); ok("travel estimate: nearby city has no fee"); } else console.log(`warn travel estimate skipped: lookup said ${near.error}`);
  const far = await quote("Seattle, WA");
  if (far.ok) { assert.equal(far.mode, "flight"); assert.ok(far.fee > 500); ok("travel estimate: distant city is quoted as a flight"); } else console.log(`warn travel estimate skipped: lookup said ${far.error}`);

  // payments: a real Stripe (test mode) checkout session is created for a far-off date, then expired
  const d = new Date(Date.now() + (250 + Math.floor(Math.random() * 300)) * 864e5); while ([0, 6].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1);
  const date = d.toISOString().slice(0, 10);
  const pkg = "Mini session"; // must exist in content/packages.json
  const co = await fetch(`${base}/api/checkout`, { method: "POST", headers: { Origin: base, "Content-Type": "application/json" }, body: JSON.stringify({ name: "CI Check", email: `ci-${Date.now()}@example.com`, package: pkg, date, message: "automated deploy check" }) });
  const body = await co.json();
  assert.equal(co.status, 200, `checkout failed: ${JSON.stringify(body)}`); assert.match(body.url, /^https:\/\/checkout\.stripe\.com\//);
  ok("Stripe checkout session created");
  const sid = /\/(cs_(?:test|live)_[A-Za-z0-9]+)/.exec(body.url)?.[1];
  if (sid && process.env.STRIPE_SECRET_KEY && sid.startsWith("cs_test_")) {
    const ex = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sid}/expire`, { method: "POST", headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` } });
    ok(ex.ok ? "test checkout expired" : "test checkout left to expire on its own");
  }
} catch (e) { console.error("SMOKE TEST FAILED:", e.message); await browser?.close(); process.exit(1); }
await browser?.close();
console.log(`smoke test passed (${results.length} checks)`);
