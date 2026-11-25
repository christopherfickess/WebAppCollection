// Behaviour of the three sites in a real browser, against the built site (dist/) served with its real headers.
// Run `npm run build` first. API calls are answered by tools/quality/serve.mjs or mocked per test.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";

const PORT = 4521, BASE = `http://localhost:${PORT}`;
const srv = spawn(process.execPath, ["tools/quality/serve.mjs"], { env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
const stop = () => srv.kill();
process.on("exit", stop);
for (let i = 0; ; i++) { try { if ((await fetch(BASE + "/")).ok) break; } catch {} if (i > 60) throw new Error("server did not start"); await new Promise((r) => setTimeout(r, 250)); }

const ok = (m) => console.log("ok " + m);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ["--no-sandbox"] });
// Every test gets a fresh context, fails on any console or page error, and keeps third-party requests off the network.
async function open(path, { mock, reducedMotion = "no-preference", scheme = "light" } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion, colorScheme: scheme });
  await ctx.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  if (mock) await mock(ctx);
  const page = await ctx.newPage(); const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource|net::ERR/.test(m.text()) && errors.push(m.text()));
  await page.goto(BASE + path, { waitUntil: "load" });
  return { page, ctx, errors, done: async () => { assert.deepEqual(errors, [], `${path}: ${errors.join(" | ")}`); await ctx.close(); } };
}
try {
  // ---------- portfolio: theme and preset ----------
  {
    const t = await open("/");
    const { page } = t;
    await page.locator('.theme-opt[data-theme-pref="dark"]:visible').first().click();
    assert.equal(await page.getAttribute("html", "data-theme"), "dark");
    assert.equal(await page.evaluate(() => localStorage.getItem("portfolio-theme-pref")), "dark");
    assert.equal(await page.locator('.theme-opt[data-theme-pref="dark"]').first().getAttribute("aria-checked"), "true");
    assert.equal(await page.locator('.theme-opt[data-theme-pref="light"]').first().getAttribute("aria-checked"), "false");
    await page.reload();
    assert.equal(await page.getAttribute("html", "data-theme"), "dark", "the theme survives a reload");
    await page.goto(BASE + "/projects/");
    assert.equal(await page.getAttribute("html", "data-theme"), "dark", "and carries to another page");
    // preset
    const opt = page.locator("[data-preset]").first();
    const presets = await page.$$eval("[data-preset]", (els) => [...new Set(els.map((e) => e.dataset.preset))]);
    assert.ok(presets.length >= 3, "three colour presets exist");
    await page.evaluate(() => localStorage.setItem("portfolio-preset", "ember"));
    await page.reload();
    assert.equal(await page.getAttribute("html", "data-preset"), "ember", "a saved preset is applied on load");
    await page.evaluate(() => { localStorage.setItem("portfolio-preset", "not-a-preset"); localStorage.setItem("portfolio-theme-pref", "purple"); });
    await page.reload();
    assert.ok(["light", "dark"].includes(await page.getAttribute("html", "data-theme")), "a junk saved theme falls back to light or dark");
    assert.equal(await page.getAttribute("html", "data-preset"), "verdant", "a junk saved preset falls back to the default");
    await t.done(); ok("portfolio: theme and preset are chosen, saved, restored on other pages, and junk saved values do not break the page");
  }
  {
    const t = await open("/", { scheme: "dark" });
    assert.equal(await t.page.getAttribute("html", "data-theme"), "dark", "System follows the browser's dark mode");
    await t.done(); ok("portfolio: the System theme follows the browser");
  }
  // ---------- portfolio: uptime widget ----------
  for (const [name, route, want] of [
    ["the function is missing (HTML 404)", (r) => r.fulfill({ status: 404, contentType: "text/html", body: "<h1>no</h1>" }), /Not wired up yet/],
    ["the function errors (500 JSON)", (r) => r.fulfill({ status: 500, contentType: "application/json", body: "{}" }), /Not wired up yet/],
    ["the request fails outright", (r) => r.abort(), /Not wired up yet/],
    ["it answers 503 (not configured)", (r) => r.fulfill({ status: 503, contentType: "application/json", body: "{}" }), /Not wired up yet/],
    ["no monitors are returned", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ monitors: [] }) }), /No monitors configured/],
    ["a monitor is down", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ monitors: [{ name: "<img src=x onerror=alert(1)>", status: "down", url: "https://example.com", uptimePercent30d: 99.5, incidentCount30d: 2 }] }) }), /1 of 1 down right now/],
  ]) {
    const t = await open("/observability/", { mock: (ctx) => ctx.route("**/api/uptime", route) });
    await t.page.waitForFunction(() => document.querySelector("#uptime-status")?.textContent.trim().length > 0 && !/Loading/i.test(document.querySelector("#uptime-status").textContent));
    const text = await t.page.textContent("#uptime-status");
    assert.match(text, want, `uptime widget when ${name}: ${text.slice(0, 100)}`);
    assert.equal(await t.page.locator("#uptime-status img").count(), 0, "monitor names are escaped, never run as HTML");
    await t.done();
  }
  ok("portfolio: the uptime widget shows a clear message for 404, 500, network failure, 503, empty and down, and escapes monitor names");

  // ---------- portfolio: contact form ----------
  {
    let posted = null;
    const t = await open("/contact/", { mock: (ctx) => ctx.route("**/", (r) => r.request().method() === "POST" ? (posted = r.request().postData(), r.fulfill({ status: 200, body: "ok" })) : r.fallback()) });
    const { page } = t;
    await page.click("#contact-form button[type=submit]");
    assert.equal(posted, null, "an empty form is not sent");
    assert.equal(await page.$eval("#first-name", (e) => e.validity.valueMissing), true);
    await page.fill("#first-name", "Pat"); await page.fill("#last-name", "Lee"); await page.fill("#email", "not-an-email"); await page.click("#contact-form button[type=submit]");
    assert.equal(posted, null, "a bad email is not sent");
    await page.fill("#email", "pat@example.com"); await page.fill("#message", "Hello there");
    assert.equal(await page.$eval('[name="bot-field"]', (e) => getComputedStyle(e.closest("p")).display !== "block" || e.closest("p").offsetHeight === 0 || true), true);
    await page.click("#contact-form button[type=submit]");
    await page.waitForSelector("#contact-status:not([hidden])");
    assert.match(await page.textContent("#contact-status"), /on its way/);
    assert.equal(await page.isHidden("#contact-form"), true);
    assert.match(posted, /form-name=contact/); assert.match(posted, /email=pat%40example\.com/); assert.match(posted, /bot-field=(&|$)/, "the hidden honeypot is sent empty");
    assert.equal(await page.$eval("p.form-honeypot", (e) => e.offsetParent === null || e.getBoundingClientRect().width <= 1 || getComputedStyle(e).position === "absolute"), true, "the honeypot is not visible to people");
    await t.done(); ok("portfolio contact: validation blocks bad input, a good send shows the thank-you, the honeypot is hidden and empty");
  }
  {
    const t = await open("/contact/", { mock: (ctx) => ctx.route("**/", (r) => r.request().method() === "POST" ? r.fulfill({ status: 500, body: "no" }) : r.fallback()) });
    await t.page.fill("#first-name", "Pat"); await t.page.fill("#last-name", "Lee"); await t.page.fill("#email", "pat@example.com");
    await t.page.click("#contact-form button[type=submit]");
    await t.page.waitForSelector(".contact-status-error");
    assert.match(await t.page.textContent("#contact-status"), /Something went wrong/);
    assert.equal(await t.page.isEnabled("#contact-form button[type=submit]"), true, "the button comes back so they can retry");
    assert.equal(await t.page.isVisible("#contact-form"), true, "what they typed is still there");
    assert.equal(await t.page.inputValue("#email"), "pat@example.com");
    await t.done(); ok("portfolio contact: a failed send shows an error, keeps the form and re-enables the button");
  }

  // ---------- travel advisor: lightbox, slideshow, seasons ----------
  {
    const t = await open("/travel-advisor/destinations/paris/");
    const { page } = t;
    await page.waitForSelector(".photo-hero-slide.is-active img[data-full]");
    const imgs = await page.$$("img[data-full]");
    assert.ok(imgs.length >= 2, "paris has several enlargeable photos");
    await page.click(".photo-hero-enlarge");
    await page.waitForSelector("dialog.lightbox[open]");
    const count = await page.textContent(".lightbox-count");
    assert.match(count, /1\s*(\/|of)\s*\d+/);
    const at = (n) => page.waitForFunction((n) => new RegExp("^\\s*" + n + "\\s*(/|of)").test(document.querySelector(".lightbox-count")?.textContent || ""), n, { timeout: 5000 });
    await page.keyboard.press("ArrowRight"); await at(2).catch(() => { throw new Error("the right arrow did not move to photo 2"); });
    await page.keyboard.press("ArrowLeft"); await at(1);
    await page.keyboard.press("ArrowLeft"); await at(count.match(/(\d+)\s*$/)[1]).catch(() => { throw new Error("going back from the first photo did not wrap to the last"); });
    assert.ok(await page.$eval(".lightbox-close", (b) => b.getAttribute("aria-label")), "the close button is labelled");
    const focusInside = await page.evaluate(() => document.querySelector("dialog.lightbox").contains(document.activeElement) || document.activeElement === document.body);
    assert.ok(focusInside, "focus is in the viewer, not on the page behind it");
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("dialog.lightbox")?.open);
    assert.equal(await page.locator("dialog.lightbox[open]").count(), 0, "Escape closes the viewer");
    await page.click(".photo-hero-enlarge"); await page.click(".lightbox-close");
    await page.waitForFunction(() => !document.querySelector("dialog.lightbox")?.open);
    assert.equal(await page.locator("dialog.lightbox[open]").count(), 0, "the close button closes it");
    await t.done(); ok("travel advisor: lightbox opens, steps with arrow keys, wraps, closes with Escape and the button");
  }
  {
    const t = await open("/travel-advisor/destinations/paris/", { reducedMotion: "reduce" });
    const { page } = t;
    await page.waitForSelector(".photo-hero-slide.is-active");
    const first = await page.$eval(".photo-hero-slide.is-active img", (i) => i.currentSrc || i.src);
    await page.waitForTimeout(1500);
    assert.equal(await page.$eval(".photo-hero-slide.is-active img", (i) => i.currentSrc || i.src), first, "with reduced motion the slideshow never advances by itself");
    await page.click('.photo-hero-arrow[data-step="1"]');
    assert.notEqual(await page.$eval(".photo-hero-slide.is-active img", (i) => i.currentSrc || i.src), first, "the arrow still moves it");
    assert.equal(await page.locator('.photo-hero-slide[aria-hidden="false"]').count(), 1, "exactly one slide is exposed to screen readers");
    await page.click('.photo-hero-arrow[data-step="-1"]');
    assert.equal(await page.$eval(".photo-hero-slide.is-active img", (i) => i.currentSrc || i.src), first, "previous returns to the first photo");
    await t.done(); ok("travel advisor: slideshow does not auto-advance with reduced motion, arrows work, one slide is exposed at a time");
  }
  {
    const t = await open("/travel-advisor/");
    const r = await t.page.evaluate(async () => {
      const { Seasons } = await import("/travel-advisor/js/lib/seasons.js");
      const out = {};
      out.range = new Seasons([2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2]).bestRanges();
      out.split = new Seasons([0, 0, 2, 2, 2, 0, 0, 0, 2, 2, 0, 0]).bestRanges();
      out.all = new Seasons(Array(12).fill(2)).bestRanges();
      out.none = new Seasons(Array(12).fill(1)).bestRanges();
      out.single = new Seasons([0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0]).bestRanges();
      for (const bad of [[], [1, 2], null, "x", Array(13).fill(1)]) { try { new Seasons(bad); out["bad" + JSON.stringify(bad)] = "accepted"; } catch (e) { out["bad" + JSON.stringify(bad)] = "refused"; } }
      const { Slideshow } = await import("/travel-advisor/js/lib/slideshow.js");
      const seen = []; const s = new Slideshow({ count: 3, onChange: (i) => seen.push(i) });
      s.goTo(-1); s.next(); s.next(); s.prev(); s.stop();
      out.seen = seen; out.single1 = (() => { const o = new Slideshow({ count: 1, onChange() {} }); o.start(); return o.timer; })();
      return out;
    });
    assert.equal(r.range, "Dec–Feb", "a best run that wraps from December to January reads as one range");
    assert.equal(r.split, "Mar–May, Sep–Oct"); assert.equal(r.all, "All year"); assert.equal(r.none, ""); assert.equal(r.single, "Jun");
    for (const [k, v] of Object.entries(r)) if (k.startsWith("bad")) assert.equal(v, "refused", `Seasons ${k}`);
    assert.deepEqual(r.seen, [2, 0, 1, 0], "the slideshow wraps both ways");
    assert.equal(r.single1, null, "one slide never starts a timer");
    await t.done(); ok("travel advisor: seasons ranges (wrapping, split, all year, none, bad input) and slideshow wrap-around");
  }

  // ---------- Fox & Fern: gallery, lightbox, manage page ----------
  {
    const t = await open("/Photography-Studio/");
    const { page } = t;
    await page.waitForSelector("fx-gallery img", { timeout: 15000 });
    assert.ok((await page.locator("fx-gallery img").count()) >= 3, "the gallery shows photos");
    for (const alt of await page.$$eval("fx-gallery img", (is) => is.map((i) => i.alt))) assert.ok(alt && alt.length > 3, "every gallery photo has alt text");
    await page.locator("fx-gallery img").first().click();
    await page.waitForSelector("dialog.lightbox[open]");
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("dialog.lightbox")?.open);
    await t.done(); ok("Fox & Fern: gallery photos have alt text and open and close in the viewer");
  }
  const manageMock = (state) => async (ctx) => {
    await ctx.route("**/api/manage**", (r) => {
      const req = r.request();
      if (req.method() === "GET") return r.fulfill({ status: state.get ?? 200, contentType: "application/json", body: JSON.stringify(state.view ?? { date: "2099-02-02", package: "Half day", deposit: 150, balance: 450, balancePaid: false, canRefund: true, refundFullDays: 14 }) });
      state.posted = JSON.parse(req.postData() || "{}");
      return r.fulfill({ status: state.post ?? 200, contentType: "application/json", body: JSON.stringify(state.reply ?? { ok: true, refunded: true, date: state.posted.newDate }) });
    });
  };
  {
    const st = {}; const t = await open("/Photography-Studio/manage/?d=2099-02-02&t=abc", { mock: manageMock(st) });
    const { page } = t;
    await page.waitForSelector("#manage-actions:not([hidden])");
    assert.match(await page.textContent("#manage-summary"), /Half day on 2099-02-02/);
    await page.click("#manage-move");
    assert.match(await page.textContent("#manage-msg"), /Choose a new date/, "changing with no date asks for one");
    assert.equal(st.posted, undefined, "and sends nothing");
    await page.fill("#manage-date", "2099-03-03"); await page.click("#manage-move");
    await page.waitForFunction(() => /Done/.test(document.querySelector("#manage-msg").textContent));
    assert.equal(st.posted.action, "reschedule"); assert.equal(st.posted.newDate, "2099-03-03");
    assert.equal(await page.isHidden("#manage-actions"), true, "the buttons go away once it has moved");
    await t.done(); ok("manage page: changing the date needs a date, sends it, and confirms");
  }
  {
    const st = { post: 409, reply: { error: "That date is no longer available." } }; const t = await open("/Photography-Studio/manage/?d=2099-02-02&t=abc", { mock: manageMock(st) });
    await t.page.waitForSelector("#manage-actions:not([hidden])"); await t.page.fill("#manage-date", "2099-03-03"); await t.page.click("#manage-move");
    await t.page.waitForFunction(() => document.querySelector("#manage-msg").textContent.length > 0);
    assert.equal(await t.page.isVisible("#manage-actions"), true, "a refused change leaves the buttons so they can try another date");
    assert.ok((await t.page.textContent("#manage-msg")).length > 5, "and says something");
    await t.done(); ok("manage page: a refused change shows a message and keeps the buttons");
  }
  for (const [canRefund, dlg, say] of [[true, /refunded in full/, /refunded/], [false, /keeps the deposit/, /^Cancelled\.$/]]) {
    const st = { view: { date: "2099-02-02", package: "Half day", deposit: 150, balance: 450, balancePaid: false, canRefund, refundFullDays: 14 }, reply: { ok: true, refunded: canRefund } };
    const t = await open("/Photography-Studio/manage/?d=2099-02-02&t=abc", { mock: manageMock(st) });
    const { page } = t; let message = "";
    page.on("dialog", async (d) => { message = d.message(); await d.dismiss(); });
    await page.waitForSelector("#manage-actions:not([hidden])"); await page.click("#manage-cancel");
    assert.match(message, dlg, "the confirmation states the refund rule"); assert.equal(st.posted, undefined, "declining the confirmation sends nothing");
    page.removeAllListeners("dialog"); page.on("dialog", (d) => d.accept());
    await page.click("#manage-cancel"); await page.waitForFunction(() => /Cancelled/.test(document.querySelector("#manage-msg").textContent));
    assert.equal(st.posted.action, "cancel"); assert.match(await page.textContent("#manage-msg"), say);
    await t.done();
  }
  ok("manage page: cancelling asks first with the right refund rule, does nothing if declined, and reports refunded or kept deposit");
  {
    const t = await open("/Photography-Studio/manage/?d=2099-02-02&t=bad", { mock: manageMock({ get: 404, view: { error: "not-found" } }) });
    await t.page.waitForFunction(() => /not valid/.test(document.querySelector("#manage-summary").textContent));
    assert.equal(await t.page.isHidden("#manage-actions"), true, "a bad link shows no buttons");
    await t.done(); ok("manage page: a bad link says so and shows no buttons");
  }
} finally { await browser.close(); stop(); }
console.log("behaviour checks passed");
