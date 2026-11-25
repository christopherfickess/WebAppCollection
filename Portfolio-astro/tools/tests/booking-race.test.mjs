// Two people at the same moment, and the money paths around them. The store here behaves like Netlify Blobs:
// conditional writes (onlyIfMatch / onlyIfNew) that fail when someone else wrote first.
import assert from "node:assert/strict";
import { catalog } from "../../netlify/functions/lib/catalog.mjs";
catalog.packages = { "Half day": { amount: 600, deposit: 150 } };
Object.assign(catalog.booking, { minLeadDays: 7, closedWeekdays: [], blockedDates: [], refundFullDays: 14, slots: [] });
import { createCheckout, handleStripeEvent, manageAct, manageToken, handleRefund, update } from "../../netlify/functions/lib/studio.mjs";

const NOW = Date.parse("2026-11-06T12:00:00Z");
const ok = (m) => console.log("ok " + m);
const blobs = () => {
  const m = new Map(); let v = 0;
  return {
    get: async (k) => { await tick(); return m.has(k) ? structuredClone(m.get(k).data) : null; },
    getWithMetadata: async (k) => { await tick(); return m.has(k) ? { data: structuredClone(m.get(k).data), etag: String(m.get(k).v) } : null; },
    setJSON: async (k, data, o = {}) => {
      await tick();
      const cur = m.get(k);
      if (o.onlyIfNew && cur) return { modified: false };
      if (o.onlyIfMatch !== undefined && (!cur || String(cur.v) !== o.onlyIfMatch)) return { modified: false };
      m.set(k, { data: structuredClone(data), v: ++v }); return { modified: true };
    },
    raw: m,
  };
};
const tick = () => new Promise((r) => setTimeout(r, Math.random() * 3));
const env = { STRIPE_SECRET_KEY: "sk_test", RESEND_API_KEY: "re", EMAIL_FROM: "a@b.co", OWNER_EMAIL: "o@b.co", STATS_TOKEN: "x".repeat(20) };
const mails = [], refunds = [];
let sessions = 0;
const fetchMock = async (url, opt) => {
  if (url.includes("checkout/sessions")) { await tick(); return { ok: true, json: async () => ({ id: "cs_" + ++sessions, url: "https://pay.test/" + sessions }) }; }
  if (url.includes("/refunds")) { refunds.push(new URLSearchParams(opt.body).get("payment_intent")); return { ok: true, json: async () => ({}) }; }
  mails.push(JSON.parse(opt.body)); return { ok: true, json: async () => ({}) };
};
const deps = (store) => ({ store, env, fetch: fetchMock, now: NOW, origin: "https://s.test" });
const body = (email, date = "2026-12-12") => ({ name: "Pat", email, package: "Half day", date, message: "" });

// update(): ten simultaneous changes to one value all land
{
  const store = blobs();
  await Promise.all(Array.from({ length: 10 }, (_, i) => update(store, "n", (o) => ({ ...o, [i]: true }))));
  assert.equal(Object.keys(await store.get("n")).length, 10);
  ok("simultaneous updates all land");
}

// two people check out the same date at the same moment: exactly one gets it
{
  const store = blobs();
  const r = await Promise.all([createCheckout(body("a@x.co"), deps(store)), createCheckout(body("b@x.co"), deps(store)), createCheckout(body("c@x.co"), deps(store))]);
  assert.deepEqual(r.map((x) => x.status).sort(), [200, 409, 409]);
  const holds = await store.get("holds");
  assert.equal(Object.keys(holds).length, 1); assert.ok(holds["2026-12-12"].session, "winner's Stripe session is recorded on the hold");
  ok("same date, same moment: one checkout wins");
}

// a Stripe failure releases the hold so the date is not locked for half an hour
{
  const store = blobs();
  const bad = { ...deps(store), fetch: async (u) => (u.includes("checkout/sessions") ? { ok: false, status: 500, json: async () => ({ error: { message: "down" } }) } : { ok: true, json: async () => ({}) }) };
  await assert.rejects(createCheckout(body("a@x.co"), bad));
  assert.deepEqual((await store.get("holds")) || {}, {});
  assert.equal((await createCheckout(body("b@x.co"), deps(store))).status, 200);
  ok("failed checkout releases the hold");
}

// two paid sessions for one date (a hold that expired mid-payment): the second is refunded, the first booking is untouched
{
  const store = blobs(); mails.length = 0; refunds.length = 0;
  const paid = (id, pi, email) => handleStripeEvent({ id, type: "checkout.session.completed", data: { object: { payment_intent: pi, customer_details: { email }, metadata: { kind: "session", package: "Half day", date: "2026-12-12", name: "Pat", message: "" } } } }, deps(store));
  await paid("evt_1", "pi_first", "a@x.co");
  const second = await paid("evt_2", "pi_second", "b@x.co");
  assert.equal(second.clash, true);
  assert.deepEqual(refunds, ["pi_second"]);
  assert.equal((await store.get("bookings"))["2026-12-12"].pi, "pi_first");
  assert.ok(mails.some((m) => /Double booking prevented/.test(m.subject)) && mails.some((m) => m.to[0] === "b@x.co"));
  // a repeat of the first event for the same payment is not a clash
  assert.ok(!(await paid("evt_3", "pi_first", "a@x.co")).clash);
  ok("double payment for a date: second one refunded");
}

// cancelling after paying the balance early refunds both payments; a refunded balance alone keeps the date
{
  const store = blobs(); mails.length = 0; refunds.length = 0;
  const d = "2026-12-22";
  await handleStripeEvent({ id: "e1", type: "checkout.session.completed", data: { object: { payment_intent: "pi_dep", customer_details: { email: "a@x.co" }, metadata: { kind: "session", package: "Half day", date: d, name: "Pat", message: "" } } } }, deps(store));
  await handleStripeEvent({ id: "e2", type: "checkout.session.completed", data: { object: { payment_intent: "pi_bal", amount_total: 45000, customer_details: { email: "a@x.co" }, metadata: { kind: "balance", date: d } } } }, deps(store));
  const b = (await store.get("bookings"))[d]; assert.equal(b.balancePi, "pi_bal"); assert.ok(b.balancePaidAt);
  await handleRefund({ payment_intent: "pi_bal", amount: 45000, amount_refunded: 45000 }, deps(store));
  assert.ok((await store.get("bookings"))[d], "refunding only the balance does not free the date");
  const res = await manageAct({ date: d, t: manageToken(env, d, "a@x.co"), action: "cancel" }, deps(store));
  assert.equal(res.status, 200); assert.deepEqual(refunds.sort(), ["pi_bal", "pi_dep"]);
  assert.ok(mails.some((m) => /deposit and the balance were refunded/.test(m.text)));
  ok("cancel refunds the deposit and the balance");
}

// a refund that Stripe says is already done counts as done, so a cancel can be retried safely
{
  const store = blobs();
  const d = "2026-12-23";
  await handleStripeEvent({ id: "e9", type: "checkout.session.completed", data: { object: { payment_intent: "pi_x", customer_details: { email: "a@x.co" }, metadata: { kind: "session", package: "Half day", date: d, name: "Pat", message: "" } } } }, deps(store));
  const f = async (u) => (u.includes("/refunds") ? { ok: false, status: 400, json: async () => ({ error: { code: "charge_already_refunded" } }) } : { ok: true, json: async () => ({}) });
  const res = await manageAct({ date: d, t: manageToken(env, d, "a@x.co"), action: "cancel" }, { ...deps(store), fetch: f });
  assert.equal(res.status, 200);
  ok("already-refunded payment does not block a cancel");
}

const paidEvent = (id, pi, date, email = "a@x.co") => ({ id, type: "checkout.session.completed", data: { object: { payment_intent: pi, customer_details: { email }, metadata: { kind: "session", package: "Half day", date, name: "Pat", message: "" } } } });

// the same payment delivered again under a NEW event id changes nothing and sends no second email
{
  const store = blobs(); mails.length = 0;
  const d = "2026-12-26";
  await handleStripeEvent(paidEvent("r1", "pi_r", d), deps(store));
  await handleStripeEvent({ id: "r2", type: "checkout.session.completed", data: { object: { payment_intent: "pi_bal2", amount_total: 45000, customer_details: { email: "a@x.co" }, metadata: { kind: "balance", date: d } } } }, deps(store));
  await update(store, "bookings", (bk) => { bk[d].reminded = true; return bk; });
  const before = await store.get("bookings"); mails.length = 0;
  const again = await handleStripeEvent(paidEvent("r3", "pi_r", d), deps(store));
  assert.equal(again.duplicate, true);
  assert.deepEqual(await store.get("bookings"), before, "stored booking (balance, reminder) is untouched");
  assert.equal(mails.length, 0, "no second confirmation email");
  ok("same payment replayed under a new event id is a no-op");
}

// a first attempt that died before the confirmation email is finished by the retry, once
{
  const store = blobs(); mails.length = 0;
  const d = "2026-12-27";
  await update(store, "bookings", (bk) => ({ ...bk, [d]: { name: "Pat", email: "a@x.co", package: "Half day", slot: "", location: "", paidAt: NOW, reminded: false, pi: "pi_half", notified: false } }), {});
  await handleStripeEvent(paidEvent("h1", "pi_half", d), deps(store));
  assert.ok((await store.get("booked")).includes(d), "date is blocked after the retry");
  assert.ok(mails.length >= 1, "confirmation sent by the retry");
  assert.equal((await store.get("bookings"))[d].notified, true);
  const n = mails.length;
  await handleStripeEvent(paidEvent("h2", "pi_half", d), deps(store));
  assert.equal(mails.length, n, "and only once");
  ok("interrupted booking is finished by a retry, once");
}

// reschedule onto a date where a payment has just landed must not overwrite that booking
{
  const store = blobs(); mails.length = 0;
  const from = "2026-12-28", to = "2026-12-29";
  await handleStripeEvent(paidEvent("s1", "pi_from", from), deps(store));
  // the webhook for another client has written "bookings" but not yet "booked"
  await update(store, "bookings", (bk) => ({ ...bk, [to]: { name: "Sam", email: "s@x.co", package: "Half day", paidAt: NOW, reminded: false, pi: "pi_sam", notified: false } }), {});
  const res = await manageAct({ date: from, t: manageToken(env, from, "a@x.co"), action: "reschedule", newDate: to }, deps(store));
  assert.equal(res.status, 409);
  const bk = await store.get("bookings");
  assert.equal(bk[to].pi, "pi_sam", "the paying client's booking is intact");
  assert.equal(bk[from].pi, "pi_from", "the original booking stays where it was");
  assert.ok((await store.get("booked")).includes(from), "the original date is still blocked");
  ok("reschedule cannot overwrite a booking that is being paid");
}

// the travel lookup runs before the date is held, so a timeout or crash during it cannot lock the date
{
  const store = blobs();
  let heldDuringLookup = null;
  const spy = async (u, o) => {
    if (/nominatim|osrm/.test(u)) { heldDuringLookup = Object.keys((await store.get("holds")) || {}).length; throw new Error("slow service"); }
    return fetchMock(u, o);
  };
  const res = await createCheckout({ ...body("a@x.co", "2026-12-30"), location: "Tulsa, OK" }, { ...deps(store), fetch: spy });
  assert.equal(res.status, 200);
  assert.equal(heldDuringLookup, 0, "no hold exists while the lookup is running");
  ok("travel lookup happens before the hold");
}
