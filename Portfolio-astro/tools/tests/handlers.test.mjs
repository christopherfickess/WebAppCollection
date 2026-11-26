// The real Netlify function handlers (netlify/functions/*.mjs), with a fake store, Stripe, email and geocoder swapped in through
// globalThis.__studioDeps: HTTP method, origin, size and JSON checks, rate limits, tokens, signatures and the exact status codes.
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { catalog } from "../../netlify/functions/lib/catalog.mjs";
catalog.packages = { "Half day": { amount: 600, deposit: 150 } };
Object.assign(catalog.booking, { minLeadDays: 7, closedWeekdays: [], blockedDates: [], refundFullDays: 14, slots: [] });

const ok = (m) => console.log("ok " + m);
const NOW = Date.now();
const mem = new Map();
const store = { get: async (k) => (mem.has(k) ? structuredClone(mem.get(k)) : null), setJSON: async (k, v) => void mem.set(k, structuredClone(v)) };
const SECRETS = { STRIPE_SECRET_KEY: "sk_test_" + "k".repeat(24), STRIPE_WEBHOOK_SECRET: "whsec_" + "w".repeat(24), RESEND_API_KEY: "re_" + "r".repeat(26), EMAIL_FROM: "Studio <hello@mail.example.com>", OWNER_EMAIL: "owner@example.com", STATS_TOKEN: "t".repeat(24), OAUTH_GITHUB_CLIENT_ID: "cid", OAUTH_GITHUB_CLIENT_SECRET: "csecret-" + "s".repeat(10) };
const mails = [];
let fetchMock;
const setDeps = (env = SECRETS, f = null) => { fetchMock = f || (async (url, opt) => { if (String(url).includes("api.stripe.com")) return { ok: true, json: async () => ({ id: "cs_1", url: "https://pay.test/1" }) }; mails.push(JSON.parse(opt?.body || "{}")); return { ok: true, json: async () => ({}) }; }); globalThis.__studioDeps = { store, env, fetch: (...a) => fetchMock(...a), origin: "https://s.test" }; };
const load = async (n) => (await import(`../../netlify/functions/${n}.mjs`));
const req = (url, { method = "GET", headers = {}, body } = {}) => new Request(url, { method, headers, body });
const BASE = "https://s.test";
const post = (path, body, headers = {}) => req(BASE + path, { method: "POST", headers: { "x-nf-client-connection-ip": "1.1.1." + Math.floor(Math.random() * 250), origin: BASE, "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
const status = async (p) => (await p).status;
const bearer = (t) => ({ authorization: `Bearer ${t}` });
setDeps();

// ---- checkout ----
{
  const { default: h } = await load("studio-checkout");
  assert.equal(await status(h(req(BASE + "/api/checkout"))), 405);
  assert.equal(await status(h(post("/api/checkout", {}, { origin: "https://evil.example" }))), 403);
  assert.equal(await status(h(post("/api/checkout", "{not json"))), 400);
  assert.equal(await status(h(post("/api/checkout", { name: "", email: "x" }))), 400);
  const ip = { "x-nf-client-connection-ip": "9.9.9.9" };
  let last; for (let i = 0; i < 21; i++) last = await status(h(post("/api/checkout", { kind: "print", photo: "none", size: "x" }, ip)));
  assert.equal(last, 429, "the 21st checkout from one address in an hour is refused");
  ok("checkout: method, origin, JSON, validation and rate limit");
}
// ---- request ----
{
  const { default: h } = await load("studio-request");
  assert.equal(await status(h(req(BASE + "/api/request"))), 405);
  assert.equal(await status(h(post("/api/request", {}, { origin: "https://evil.example" }))), 403);
  assert.equal(await status(h(post("/api/request", "nope"))), 400);
  const ip = { "x-nf-client-connection-ip": "8.8.8.8" };
  let last; for (let i = 0; i < 11; i++) last = await status(h(post("/api/request", { name: "", email: "" }, ip)));
  assert.equal(last, 429);
  ok("request: method, origin, JSON and rate limit");
}
// ---- client errors ----
{
  const { default: h } = await load("studio-error");
  assert.equal(await status(h(req(BASE + "/api/client-error"))), 405);
  assert.equal(await status(h(post("/api/client-error", {}, { origin: "https://evil.example" }))), 403);
  assert.equal(await status(h(post("/api/client-error", "x".repeat(4001)))), 413);
  assert.equal(await status(h(post("/api/client-error", "{bad"))), 400);
  assert.equal(await status(h(post("/api/client-error", { message: "boom", source: "/a.js" }, { "user-agent": "Mozilla/5.0" }))), 204);
  assert.equal(await status(h(post("/api/client-error", { message: "boom" }, { dnt: "1" }))), 204, "Do Not Track visitors are not recorded");
  const ip = { "x-nf-client-connection-ip": "7.7.7.7" };
  for (let i = 0; i < 31; i++) await h(post("/api/client-error", { message: "m" }, ip));
  assert.equal(await status(h(post("/api/client-error", { message: "m" }, ip))), 204, "over the limit it still answers quietly");
  ok("client errors: method, origin, size, JSON, Do Not Track, rate limit");
}
// ---- analytics collect ----
{
  const { default: h } = await load("studio-collect");
  assert.equal(await status(h(req(BASE + "/api/collect"))), 405);
  assert.equal(await status(h(post("/api/collect", { path: "/Photography-Studio/" }, { dnt: "1" }))), 204);
  assert.equal(await status(h(post("/api/collect", { path: "no-slash" }, { "user-agent": "Mozilla/5.0" }))), 400);
  ok("collect: method, Do Not Track, bad path");
}
// ---- token-protected: export and stats ----
{
  const exp = (await load("studio-export")).default, st = (await load("studio-stats")).default;
  for (const [name, h, path] of [["export", exp, "/api/export"], ["stats", st, "/api/stats"]]) {
    assert.equal(await status(h(req(BASE + path))), 401, `${name} without a token`);
    assert.equal(await status(h(req(BASE + path, { headers: bearer("wrong") }))), 401, `${name} with a wrong token`);
    assert.equal(await status(h(req(BASE + path, { headers: bearer("t".repeat(23) + "x") }))), 401, `${name} with a token of the right length but wrong value`);
    assert.equal(await status(h(req(BASE + path, { headers: bearer(SECRETS.STATS_TOKEN) }))), 200, `${name} with the right token`);
  }
  setDeps({ ...SECRETS, STATS_TOKEN: "short" });
  assert.equal(await status(exp(req(BASE + "/api/export", { headers: bearer("short") }))), 401, "a configured token under 16 characters is never accepted");
  setDeps({ ...SECRETS, STATS_TOKEN: "" });
  assert.equal(await status(exp(req(BASE + "/api/export", { headers: bearer("") }))), 401, "an unset token never matches an empty one");
  setDeps();
  assert.equal(await status(st(req(BASE + "/api/stats?days=100000", { headers: bearer(SECRETS.STATS_TOKEN) }))), 200, "a huge days value is clamped");
  ok("export and stats: 401 for no, wrong, near-miss, short and unset tokens; 200 for the right one");
}
// ---- manage ----
{
  const { default: h } = await load("studio-manage");
  assert.equal(await status(h(req(BASE + "/api/manage?d=2026-12-12&t=bad", { headers: { "x-nf-client-connection-ip": "6.6.6.6" } }))), 404);
  assert.equal(await status(h(req(BASE + "/api/manage", { method: "PUT", headers: { "x-nf-client-connection-ip": "6.6.6.7" } }))), 405);
  assert.equal(await status(h(post("/api/manage", {}, { origin: "https://evil.example" }))), 403);
  assert.equal(await status(h(post("/api/manage", "{bad"))), 400);
  const ip = { "x-nf-client-connection-ip": "6.6.6.8" };
  let last; for (let i = 0; i < 61; i++) last = await status(h(req(BASE + "/api/manage?d=x&t=y", { headers: ip })));
  assert.equal(last, 429);
  ok("manage: bad link 404, method, origin, JSON, rate limit");
}
// ---- Stripe webhook ----
{
  const { default: h } = await load("studio-webhook");
  const raw = JSON.stringify({ id: "evt_h1", type: "ping", data: { object: {} } });
  const sig = (t, secret = SECRETS.STRIPE_WEBHOOK_SECRET, body = raw) => `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;
  const t = Math.floor(Date.now() / 1000);
  const send = (header, body = raw) => h(req(BASE + "/api/stripe-webhook", { method: "POST", headers: header ? { "stripe-signature": header } : {}, body }));
  assert.equal(await status(send(null)), 400, "no signature");
  assert.equal(await status(send(sig(t, "whsec_wrong"))), 400, "signed with the wrong secret");
  assert.equal(await status(send(sig(t), raw + " ")), 400, "body changed after signing");
  assert.equal(await status(send(sig(t - 3600))), 400, "an old signature is not replayable");
  assert.equal(await status(send(sig(t))), 200, "a valid signature");
  mails.length = 0;
  const bad = JSON.stringify({ id: "evt_h2", type: "checkout.session.completed", data: null });
  assert.equal(await status(send(sig(t, SECRETS.STRIPE_WEBHOOK_SECRET, bad), bad)), 500, "a payment notice that cannot be processed returns 500 so Stripe retries");
  assert.ok(mails.some((m) => /could not be processed/.test(m.subject || "")), "and the owner is alerted");
  setDeps({ ...SECRETS, STRIPE_WEBHOOK_SECRET: "" });
  assert.equal(await status(send(sig(t, ""))), 400, "with no secret configured nothing is accepted");
  setDeps();
  ok("webhook: missing, wrong, tampered and old signatures refused; failures return 500 and alert the owner");
}
// ---- reminders ----
{
  const { default: h } = await load("studio-reminders");
  await h();
  mem.set("bookings", { "2999-01-01": null }); // a broken record must not crash the daily job
  mails.length = 0;
  await h();
  ok("reminders: runs, and a broken record does not crash the job");
}
// ---- availability and the setup report ----
{
  const { default: h } = await load("studio-availability");
  const plain = await (await h(req(BASE + "/api/availability"))).json();
  assert.equal(plain.setup, undefined, "no setup report unless asked");
  const res = await h(req("https://x.netlify.app/api/availability?setup=1")); const text = await res.text();
  assert.equal(res.status, 200);
  for (const v of Object.values(SECRETS)) assert.ok(!text.includes(v), "the setup report never contains a secret value");
  const body = JSON.parse(text);
  assert.equal(body.setup.STRIPE_SECRET_KEY, true); assert.equal(body.setup.stripeMode, "test");
  assert.ok(!text.includes("owner@example.com"), "addresses are masked");
  ok("availability: no setup report by default; the report never shows secrets or full addresses");
}
// ---- travel quote ----
{
  const { default: h } = await load("studio-travel");
  setDeps(SECRETS, async (url) => ({ ok: true, status: 200, json: async () => (String(url).includes("nominatim") ? [{ lat: "36.15", lon: "-95.99", display_name: "Tulsa, OK" }] : { routes: [{ distance: 105 * 1609.344, duration: 1.7 * 3600 }] }) }));
  const ip = (n) => ({ "x-nf-client-connection-ip": n });
  assert.equal(await status(h(post("/api/travel-quote", {}))), 405);
  assert.equal(await status(h(req(BASE + "/api/travel-quote?to=ab", { headers: ip("5.5.5.1") }))), 422);
  assert.equal(await status(h(req(BASE + "/api/travel-quote?to=Tulsa", { headers: ip("5.5.5.2") }))), 200);
  let last; for (let i = 0; i < 31; i++) last = await status(h(req(BASE + "/api/travel-quote?to=Tulsa", { headers: ip("5.5.5.3") })));
  assert.equal(last, 429);
  const was = catalog.booking.travel; catalog.booking.travel = { ...was, enabled: false };
  assert.equal(await status(h(req(BASE + "/api/travel-quote?to=Tulsa", { headers: ip("5.5.5.4") }))), 404, "switched off in the editor");
  catalog.booking.travel = was; setDeps();
  ok("travel quote: method, too short, ok, rate limit, switched off");
}
// ---- Netlify Forms submission ----
{
  const { handler } = await load("submission-created");
  const ev = (data) => ({ body: JSON.stringify({ payload: { data } }) });
  mails.length = 0;
  assert.equal((await handler(ev({ name: "A" }))).body, "ignored", "no email");
  assert.equal((await handler(ev({ email: "a@x.co", "bot-field": "spam" }))).body, "ignored", "honeypot filled in");
  assert.equal((await handler({ body: "{}" })).body, "ignored");
  assert.equal((await handler({})).body, "ignored", "empty event");
  assert.equal(mails.length, 0, "nothing is sent for ignored submissions");
  assert.equal((await handler(ev({ name: "Pat", email: "pat@x.co", date: "2026-12-12", message: "hi" }))).statusCode, 200);
  assert.ok(mails.length >= 1, "a real submission sends email");
  ok("form submission: honeypot, missing email and empty events ignored; a real one sends email");
}
// ---- GitHub sign-in for the editor ----
{
  Object.assign(process.env, { OAUTH_GITHUB_CLIENT_ID: "cid", OAUTH_GITHUB_CLIENT_SECRET: SECRETS.OAUTH_GITHUB_CLIENT_SECRET, URL: BASE });
  const auth = (await load("oauth-auth")).default, cb = (await load("oauth-callback")).default;
  const r = await auth(req(BASE + "/api/oauth/auth?provider=github&site_id=s.test"));
  assert.ok([200, 302].includes(r.status), `sign-in starts (${r.status})`);
  const out = await cb(req(BASE + "/api/oauth/callback?code=abc&state=forged"));
  const page = await out.text();
  assert.equal(out.status, 200, "the editor's pop-up gets a page, not a crash");
  assert.match(page, /Sign-in failed/); assert.match(page, /authorization:github:error/); assert.ok(!/authorization:github:success/.test(page) && !/access_token|"token"/.test(page), "a forged callback never hands out a token");
  ok("editor sign-in: starts, and a forged callback is refused");
}
