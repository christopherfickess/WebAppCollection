import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { handleRequest, sendReminders, exportData, alertOwner, availability, createCheckout, verifySignature, handleStripeEvent, collect, stats, tokenOk, dayProblem } from "../../netlify/functions/lib/studio.mjs";

const memStore = () => { const m = new Map(); return { get: async (k) => (m.has(k) ? structuredClone(m.get(k)) : null), setJSON: async (k, v) => void m.set(k, structuredClone(v)) }; };
const NOW = Date.parse("2026-11-06T12:00:00Z");
const sent = [];
const fetchMock = async (url, opt) => {
  if (url.includes("stripe")) return { ok: true, json: async () => ({ id: "cs_1", url: "https://pay.test/cs_1" }), _body: opt.body };
  sent.push(JSON.parse(opt.body)); return { ok: true };
};
const env = { STRIPE_SECRET_KEY: "sk_test", RESEND_API_KEY: "re", EMAIL_FROM: "a@b.co", OWNER_EMAIL: "o@b.co", STATS_TOKEN: "x".repeat(20) };
const deps = (store) => ({ store, env, fetch: fetchMock, now: NOW, origin: "https://s.test" });
let n = 0; const ok = (name) => console.log("ok", ++n, name);

const store = memStore();
assert.equal((await availability({ store, env, now: NOW })).payments, true); ok("availability");

const good = { kind: "session", name: "Ana", email: "ana@x.co", package: "Half day", date: "2026-12-01", message: "hi" };
let r = await createCheckout(good, deps(store)); assert.equal(r.status, 200); ok("checkout creates session");
r = await createCheckout(good, deps(store)); assert.equal(r.status, 409); assert.equal((await r.json()).error, "held"); ok("same date is held");
r = await createCheckout({ ...good, date: "2026-11-08" }, deps(store)); assert.equal(r.status, 409); ok("too soon rejected");
r = await createCheckout({ ...good, date: "2026-02-30" }, deps(store)); assert.equal(r.status, 409); ok("impossible date rejected");
r = await createCheckout({ ...good, package: "Free" }, deps(store)); assert.equal(r.status, 400); ok("unknown package");
r = await createCheckout({ ...good, email: "nope" }, deps(store)); assert.equal(r.status, 400); ok("bad email");
r = await createCheckout({ kind: "print", photo: "nope", size: "12x18" }, deps(store)); assert.equal(r.status, 400); ok("unknown print");
r = await createCheckout(good, { ...deps(store), env: {} }); assert.equal(r.status, 503); ok("no stripe key");

// a hold expires
assert.equal(dayProblem("2026-12-01", NOW + 40 * 60 * 1000, { booked: [], blocked: [], held: [] }), null); ok("expired hold frees date");

// webhook
const ev = { id: "evt_1", type: "checkout.session.completed", data: { object: { customer_details: { email: "ana@x.co" }, metadata: { kind: "session", package: "Half day", date: "2026-12-01", name: "Ana", message: "" } } } };
await handleStripeEvent(ev, deps(store));
assert.deepEqual(await store.get("booked"), ["2026-12-01"]); assert.equal(sent.length, 2); ok("webhook books date, emails both");
assert.equal((await handleStripeEvent(ev, deps(store))).duplicate, true); assert.equal(sent.length, 2); ok("duplicate event ignored");
assert.ok((await availability({ store, env, now: NOW })).unavailable.includes("2026-12-01")); ok("booked date unavailable");

// signature
const raw = JSON.stringify(ev), t = Math.floor(NOW / 1000), sec = "whsec_x";
const v1 = createHmac("sha256", sec).update(`${t}.${raw}`).digest("hex");
assert.equal(verifySignature(raw, `t=${t},v1=${v1}`, sec, t), true); ok("valid signature");
assert.equal(verifySignature(raw + " ", `t=${t},v1=${v1}`, sec, t), false); ok("tampered body");
assert.equal(verifySignature(raw, `t=${t},v1=${v1}`, sec, t + 1000), false); ok("stale timestamp");
assert.equal(verifySignature(raw, `t=${t},v1=${v1}`, "", t), false); ok("no secret");

// counts
const req = (h = {}) => new Request("https://s.test/api/collect", { headers: { "user-agent": "Mozilla/5.0", ...h } });
await collect(req(), { path: "/Photography-Studio/?x=1", ref: "https://google.com/q" }, { store, now: NOW });
await collect(req({ dnt: "1" }), { path: "/a" }, { store, now: NOW });
await collect(req({ "user-agent": "Googlebot" }), { path: "/a" }, { store, now: NOW });
const s = await stats(2, { store, now: NOW });
assert.equal(s.totalViews, 1); assert.deepEqual(s.topPages, { "/Photography-Studio/": 1 }); assert.deepEqual(s.topReferrers, { "google.com": 1 }); ok("counts respect DNT and bots, strip queries");
assert.equal(tokenOk(new Request("https://s.test", { headers: { authorization: "Bearer " + "x".repeat(20) } }), env), true);
assert.equal(tokenOk(new Request("https://s.test", { headers: { authorization: "Bearer wrong" } }), env), false);
assert.equal(tokenOk(new Request("https://s.test"), { STATS_TOKEN: "" }), false); ok("stats token");

// reminders, export, alerts
const bk = await store.get("bookings"); assert.equal(bk["2026-12-01"].email, "ana@x.co"); ok("booking details remembered");
sent.length = 0;
const DEC = Date.parse("2026-11-29T15:00:00Z");
assert.deepEqual((await sendReminders({ store, env, fetch: fetchMock, now: Date.parse("2026-11-20T15:00:00Z") })).sent, []); assert.equal(sent.length, 0); ok("no reminder too early");
assert.deepEqual((await sendReminders({ store, env, fetch: fetchMock, now: DEC })).sent, ["2026-12-01"]); assert.equal(sent.length, 1); assert.match(sent[0].text, /\$450/); ok("reminder sent two days ahead with balance");
assert.deepEqual((await sendReminders({ store, env, fetch: fetchMock, now: DEC })).sent, []); assert.equal(sent.length, 1); ok("reminder sent only once");
assert.equal((await exportData({ store })).booked[0], "2026-12-01"); ok("export includes booked dates");
sent.length = 0; await alertOwner({ env, fetch: fetchMock }, "x failed", new Error("boom")); assert.equal(sent[0].to[0], "o@b.co"); assert.match(sent[0].text, /boom/); ok("owner alert");
const failing = async () => { throw new Error("network down"); };
await alertOwner({ env, fetch: failing }, "x failed", new Error("boom")); ok("alert never throws");

// plain request form
sent.length = 0;
let rq = await handleRequest({ name: "Ben", email: "ben@x.co", session: "Half day", message: "hello" }, { store, env, fetch: fetchMock, now: NOW });
assert.equal(rq.status, 200); assert.equal(sent.length, 2); assert.equal(sent[0].to[0], "o@b.co"); assert.equal(sent[1].to[0], "ben@x.co"); ok("request emails owner and sender");
sent.length = 0; rq = await handleRequest({ name: "Bot", email: "b@x.co", message: "x", "bot-field": "spam" }, { store, env, fetch: fetchMock, now: NOW });
assert.equal(rq.status, 200); assert.equal(sent.length, 0); ok("honeypot sends nothing");
rq = await handleRequest({ name: "", email: "bad", message: "" }, { store, env, fetch: fetchMock, now: NOW }); assert.equal(rq.status, 400); ok("invalid request rejected");
sent.length = 0; for (let i = 0; i < 25; i++) await handleRequest({ name: "N", email: "n@x.co", message: "m" }, { store, env, fetch: fetchMock, now: NOW + 1 });
assert.equal(sent.filter((m) => m.to[0] === "n@x.co").length <= 20, true); assert.equal(sent.filter((m) => m.to[0] === "o@b.co").length >= 25, true); ok("sender copies are capped per day, owner always notified");

// failures are visible, not swallowed
const refused = async (url, opt) => (url.includes("stripe") ? fetchMock(url, opt) : { ok: false, status: 403, text: async () => "You can only send testing emails to your own email address" });
rq = await handleRequest({ name: "Cy", email: "cy@x.co", message: "m" }, { store, env, fetch: refused, now: NOW + 5, expose: true });
assert.equal(rq.status, 502); assert.match((await rq.json()).reason, /only send testing emails/); ok("email refusal reported with reason on test deploys");
rq = await handleRequest({ name: "Cy", email: "cy@x.co", message: "m" }, { store, env, fetch: refused, now: NOW + 5 });
assert.equal(rq.status, 502); assert.equal((await rq.json()).reason, undefined); ok("reason hidden on real sites");
rq = await handleRequest({ name: "Cy", email: "cy@x.co", message: "m" }, { store, env: {}, fetch: fetchMock, now: NOW + 5 });
assert.equal(rq.status, 503); ok("unconfigured email is an error, not a fake success");

// addresses are normalised before sending
sent.length = 0;
await handleRequest({ name: "Di", email: "  Di@X.co ", message: "m" }, { store, env: { ...env, OWNER_EMAIL: " Owner@Example.COM " }, fetch: fetchMock, now: NOW + 3 * 864e5 });
assert.equal(sent[0].to[0], "owner@example.com"); assert.equal(sent[0].reply_to, "di@x.co"); assert.equal(sent[1].to[0], "di@x.co"); ok("addresses are trimmed and lowercased");
