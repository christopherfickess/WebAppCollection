// Booking, payment, email, and visitor-count logic for the studio site.
// Every function takes its outside world (store, fetch, env, clock) as
// arguments, so tests can run them without Stripe, email, or Netlify.
import { createHmac, timingSafeEqual } from "node:crypto";
import { catalog } from "./catalog.mjs";

export const json = (status, body) => new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HOLD_MS = 31 * 60 * 1000; // Stripe's shortest checkout lifetime is 30 minutes
const clip = (v, n) => String(v ?? "").trim().slice(0, n);
const iso = (d) => d.toISOString().slice(0, 10);
const money = (n) => `$${Number(n).toLocaleString("en-US")}`;

// ---- availability -------------------------------------------------------

export async function unavailable(store, now, rules = catalog.booking) {
  const booked = (await store.get("booked", { type: "json" })) || [];
  const holds = (await store.get("holds", { type: "json" })) || {};
  const held = Object.entries(holds).filter(([, v]) => v.expires > now).map(([d]) => d);
  return { booked, held, blocked: rules.blockedDates || [] };
}

export function dayProblem(date, now, taken, rules = catalog.booking) {
  if (!DATE.test(date)) return "invalid-date";
  const d = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(d.getTime()) || iso(d) !== date) return "invalid-date";
  const earliest = new Date(now + (rules.minLeadDays || 0) * 864e5);
  if (date < iso(earliest)) return "too-soon";
  if ((rules.closedWeekdays || []).includes(d.getUTCDay())) return "closed";
  if (taken.blocked.includes(date)) return "blocked";
  if (taken.booked.includes(date)) return "booked";
  if (taken.held.includes(date)) return "held";
  return null;
}

export async function availability({ store, env, now }) {
  const taken = await unavailable(store, now);
  return {
    configured: true,
    payments: Boolean(env.STRIPE_SECRET_KEY),
    minLeadDays: catalog.booking.minLeadDays || 0,
    closedWeekdays: catalog.booking.closedWeekdays || [],
    unavailable: [...new Set([...taken.booked, ...taken.held, ...taken.blocked])].sort(),
    depositNote: catalog.booking.depositNote || "",
  };
}

// ---- checkout -----------------------------------------------------------

async function stripe(env, fetchFn, params) {
  const res = await fetchFn("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data?.error?.message || "stripe error"), { status: 502 });
  return data;
}

export async function createCheckout(body, { origin, env, store, fetch: fetchFn, now }) {
  if (!env.STRIPE_SECRET_KEY) return json(503, { error: "payments-not-configured" });
  const base = `${origin}/Photography-Studio/`;
  const p = new URLSearchParams();
  p.set("mode", "payment");
  p.set("line_items[0][quantity]", "1");
  p.set("line_items[0][price_data][currency]", "usd");

  if (body?.kind === "print") {
    const photo = catalog.photos.find((x) => x.id === body.photo);
    const size = catalog.printSizes[body.size];
    if (!photo || !size) return json(400, { error: "unknown-print" });
    p.set("line_items[0][price_data][unit_amount]", String(size.price * 100));
    p.set("line_items[0][price_data][product_data][name]", `Print: ${photo.title}, ${body.size}`);
    p.set("shipping_address_collection[allowed_countries][0]", "US");
    p.set("success_url", `${base}thanks/?order=1`);
    p.set("cancel_url", `${base}#wall`);
    p.set("metadata[kind]", "print");
    p.set("metadata[photo]", photo.id);
    p.set("metadata[size]", body.size);
    const s = await stripe(env, fetchFn, p);
    return json(200, { url: s.url });
  }

  const name = clip(body?.name, 100), email = clip(body?.email, 200), message = clip(body?.message, 400), date = clip(body?.date, 10);
  const pkg = catalog.packages[body?.package];
  if (!name || !EMAIL.test(email)) return json(400, { error: "invalid-contact" });
  if (!pkg) return json(400, { error: "unknown-package" });
  const taken = await unavailable(store, now);
  const problem = dayProblem(date, now, taken);
  if (problem) return json(409, { error: problem });

  const expires = Math.floor((now + HOLD_MS) / 1000);
  p.set("line_items[0][price_data][unit_amount]", String(pkg.deposit * 100));
  p.set("line_items[0][price_data][product_data][name]", `${body.package} deposit for ${date}`);
  p.set("customer_email", email);
  p.set("expires_at", String(expires));
  p.set("success_url", `${base}thanks/?paid=1`);
  p.set("cancel_url", `${base}#contact`);
  p.set("metadata[kind]", "session");
  p.set("metadata[package]", body.package);
  p.set("metadata[date]", date);
  p.set("metadata[name]", name);
  p.set("metadata[message]", message);
  const s = await stripe(env, fetchFn, p);
  const holds = (await store.get("holds", { type: "json" })) || {};
  for (const [d, v] of Object.entries(holds)) if (v.expires <= now) delete holds[d];
  holds[date] = { expires: now + HOLD_MS, session: s.id };
  await store.setJSON("holds", holds);
  return json(200, { url: s.url });
}

// ---- email --------------------------------------------------------------

export async function sendEmail({ env, fetch: fetchFn }, { to, subject, text, replyTo }) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM || !to) return { skipped: true };
  // Phone keyboards capitalise the first letter and add spaces; providers can treat that as a different address.
  to = String(to).trim().toLowerCase();
  if (replyTo) replyTo = String(replyTo).trim().toLowerCase();
  const res = await fetchFn("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  return { ok: res.ok, status: res.status, detail: res.ok ? "" : String(await res.text().catch(() => "")).slice(0, 200) };
}

const sign = (n) => `${catalog.business.name}`;

export async function notifyBooking(deps, form, { paid } = {}) {
  const { env } = deps;
  const owner = env.OWNER_EMAIL;
  const lines = [`Name: ${form.name}`, `Email: ${form.email}`, `Session: ${form.session || form.package || "not chosen"}`, `Date: ${form.date || "not chosen"}`, `Message: ${form.message || ""}`];
  const out = [];
  out.push(await sendEmail(deps, { to: owner, subject: `${paid ? "Deposit paid" : "New request"}: ${form.name}`, text: lines.join("\n"), replyTo: form.email }));
  const pkg = catalog.packages[form.package || form.session];
  const text = paid
    ? `Hi ${form.name},\n\nThank you. Your ${money(pkg?.deposit ?? 0)} deposit for ${form.package} on ${form.date} is received and the date is yours.\n${catalog.booking.depositNote || ""}\n\nReply to this email with any questions.\n\n${sign()}`
    : `Hi ${form.name},\n\nThanks for your request. I reply within two business days.\n\nWhat you sent:\n${lines.join("\n")}\n\n${sign()}`;
  out.push(await sendEmail(deps, { to: form.email, subject: paid ? `Your date is booked, ${form.date}` : "We received your request", text }));
  return out;
}

// ---- Stripe webhook -----------------------------------------------------

export function verifySignature(raw, header, secret, nowSec, toleranceSec = 300) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=")));
  const t = Number(parts.t);
  if (!t || Math.abs(nowSec - t) > toleranceSec) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
  const given = header.split(",").filter((kv) => kv.startsWith("v1=")).map((kv) => kv.slice(3));
  return given.some((g) => g.length === expected.length && timingSafeEqual(Buffer.from(g), Buffer.from(expected)));
}

export async function handleStripeEvent(event, deps) {
  const { store, env, now } = deps;
  if (await store.get(`event:${event.id}`, { type: "json" })) return { duplicate: true };
  if (event.type === "checkout.session.completed") {
    const s = event.data.object;
    const m = s.metadata || {};
    if (m.kind === "session") {
      const booked = (await store.get("booked", { type: "json" })) || [];
      if (!booked.includes(m.date)) booked.push(m.date);
      await store.setJSON("booked", booked.sort());
      const bookings = (await store.get("bookings", { type: "json" })) || {};
      bookings[m.date] = { name: m.name, email: s.customer_details?.email || s.customer_email, package: m.package, paidAt: now, reminded: false };
      await store.setJSON("bookings", bookings);
      const holds = (await store.get("holds", { type: "json" })) || {};
      delete holds[m.date];
      await store.setJSON("holds", holds);
      await notifyBooking(deps, { name: m.name, email: s.customer_details?.email || s.customer_email, package: m.package, date: m.date, message: m.message }, { paid: true });
    } else if (m.kind === "print") {
      const ship = s.shipping_details || s.collected_information?.shipping_details;
      const a = ship?.address || {};
      const to = s.customer_details?.email;
      const text = `Print order\n${m.photo}, ${m.size}\nTotal: ${money((s.amount_total || 0) / 100)}\nCustomer: ${s.customer_details?.name || ""} <${to || ""}>\nShip to: ${[ship?.name, a.line1, a.line2, a.city, a.state, a.postal_code, a.country].filter(Boolean).join(", ")}`;
      await sendEmail(deps, { to: env.OWNER_EMAIL, subject: `Print order: ${m.photo}, ${m.size}`, text, replyTo: to });
      await sendEmail(deps, { to, subject: "Your print order", text: `Thank you for your order of ${m.photo}, ${m.size}. I will email tracking details when it ships.\n\n${sign()}` });
    }
  }
  await store.setJSON(`event:${event.id}`, { at: now });
  return { handled: event.type };
}

// ---- visitor counts (no cookies, no IP addresses, no user ids) -----------

const BOTS = /bot|crawl|spider|slurp|headless|lighthouse|preview|curl|wget/i;

export async function collect(req, body, { store, now }) {
  if (req.headers.get("dnt") === "1" || req.headers.get("sec-gpc") === "1") return json(204, null);
  if (BOTS.test(req.headers.get("user-agent") || "")) return json(204, null);
  let path = clip(body?.path, 120).split(/[?#]/)[0];
  if (!path.startsWith("/")) return json(400, { error: "bad-path" });
  let ref = "";
  try {
    const r = new URL(clip(body?.ref, 300));
    if (r.hostname !== new URL(req.url).hostname) ref = r.hostname;
  } catch {}
  const key = `day:${iso(new Date(now))}`;
  const day = (await store.get(key, { type: "json" })) || { views: 0, paths: {}, refs: {} };
  day.views += 1;
  if (Object.keys(day.paths).length < 200 || day.paths[path]) day.paths[path] = (day.paths[path] || 0) + 1;
  if (ref && (Object.keys(day.refs).length < 100 || day.refs[ref])) day.refs[ref] = (day.refs[ref] || 0) + 1;
  await store.setJSON(key, day);
  return json(204, null);
}

export async function stats(days, { store, now }) {
  const out = [];
  for (let i = 0; i < days; i++) {
    const d = iso(new Date(now - i * 864e5));
    const v = await store.get(`day:${d}`, { type: "json" });
    out.push({ date: d, views: v?.views || 0, paths: v?.paths || {}, refs: v?.refs || {} });
  }
  const total = (k) => out.reduce((acc, d) => { for (const [n, c] of Object.entries(d[k])) acc[n] = (acc[n] || 0) + c; return acc; }, {});
  return { days: out, totalViews: out.reduce((a, d) => a + d.views, 0), topPages: total("paths"), topReferrers: total("refs") };
}

export function tokenOk(req, env) {
  const given = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const want = env.STATS_TOKEN || "";
  return want.length >= 16 && given.length === want.length && timingSafeEqual(Buffer.from(given), Buffer.from(want));
}

// ---- reminders, backup, alerts ------------------------------------------

// Emails each client once, `daysAhead` days before their session. Run daily.
export async function sendReminders(deps, daysAhead = 2) {
  const { store, now } = deps;
  const bookings = (await store.get("bookings", { type: "json" })) || {};
  const target = iso(new Date(now + daysAhead * 864e5));
  const sent = [];
  for (const [date, b] of Object.entries(bookings)) {
    if (date !== target || b.reminded || !b.email) continue;
    const pkg = catalog.packages[b.package];
    const balance = pkg ? pkg.amount - pkg.deposit : null;
    const text = `Hi ${b.name},\n\nA reminder that your ${b.package} session is on ${date}.\n${balance ? `The remaining balance of ${money(balance)} is due on the day.\n` : ""}\nIf you need to change the date, reply to this email as soon as you can and we will find a new one.\n\n${sign()}`;
    const r = await sendEmail(deps, { to: b.email, subject: `Your session is on ${date}`, text });
    if (r.ok) { b.reminded = true; sent.push(date); }
  }
  if (sent.length) await store.setJSON("bookings", bookings);
  return { sent };
}

// Everything the site stores, for a backup. Contains client names and emails.
export async function exportData({ store }) {
  return {
    exportedAt: new Date().toISOString(),
    booked: (await store.get("booked", { type: "json" })) || [],
    bookings: (await store.get("bookings", { type: "json" })) || {},
    holds: (await store.get("holds", { type: "json" })) || {},
  };
}

// Tells the owner when something fails behind the scenes.
export async function alertOwner(deps, what, err) {
  try {
    await sendEmail(deps, { to: deps.env.OWNER_EMAIL, subject: `Site problem: ${what}`, text: `${what}\n\n${String(err?.message || err).slice(0, 500)}\n\nStripe retries failed payment notices for up to three days, so the booking will usually fix itself. If it does not, check the Netlify function logs.` });
  } catch {}
}

// ---- plain request form (no payment) --------------------------------------

const REQUESTS_PER_DAY = 20; // cap on confirmation copies, so the form cannot be used to mail strangers

export async function handleRequest(body, deps) {
  const { store, now } = deps;
  if (body?.["bot-field"]) return json(200, { ok: true }); // honeypot: look successful, do nothing
  const name = clip(body?.name, 100), email = clip(body?.email, 200).toLowerCase(), message = clip(body?.message, 2000);
  const session = clip(body?.session, 60), date = clip(body?.date, 10);
  if (!name || !EMAIL.test(email) || !message) return json(400, { error: "invalid-contact" });
  if (date && !DATE.test(date)) return json(400, { error: "invalid-date" });
  const form = { name, email, session, date, message };
  const lines = [`Name: ${name}`, `Email: ${email}`, `Session: ${session || "not chosen"}`, `Date: ${date || "not chosen"}`, `Message: ${message}`];
  const owner = await sendEmail(deps, { to: deps.env.OWNER_EMAIL, subject: `New request: ${name}`, text: lines.join("\n"), replyTo: email });
  if (owner.skipped) return json(503, { error: "email-not-configured" }); // never tell a visitor "sent" when nothing was
  if (!owner.ok) {
    console.error("request email failed", owner.status, owner.detail);
    return json(502, { error: "email-failed", ...(deps.expose ? { reason: owner.detail } : {}) });
  }
  const key = `reqs:${iso(new Date(now))}`;
  const count = (await store.get(key, { type: "json" })) || 0;
  if (count < REQUESTS_PER_DAY) {
    await store.setJSON(key, count + 1);
    await sendEmail(deps, { to: email, subject: "We received your request", text: `Hi ${name},\n\nThanks for your request. I reply within two business days.\n\nWhat you sent:\n${lines.join("\n")}\n\n${sign()}` });
  }
  return json(200, { ok: true });
}
