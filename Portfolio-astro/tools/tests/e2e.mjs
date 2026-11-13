// End-to-end booking test. Runs the real function handlers behind a local server, with a fake
// Stripe and email provider, and drives the page in a real browser:
// fill the form, start a deposit payment, receive Stripe's "paid" notice, and confirm the date
// is then taken and both emails went out. Fails loudly if any step breaks.
import { createServer } from "node:http";
import { createHmac } from "node:crypto";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const ROOT = fileURLToPath(new URL("../../public/", import.meta.url));
const PORT = 4499, BASE = `http://localhost:${PORT}`;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".jpg": "image/jpeg", ".webp": "image/webp", ".png": "image/png" };

// ---- fakes ----
const mem = new Map();
const store = { get: async (k) => (mem.has(k) ? structuredClone(mem.get(k)) : null), setJSON: async (k, v) => void mem.set(k, structuredClone(v)) };
const mails = [];
const env = { STRIPE_SECRET_KEY: "sk_test_fake", STRIPE_WEBHOOK_SECRET: "whsec_fake", RESEND_API_KEY: "re_fake", EMAIL_FROM: "studio@example.com", OWNER_EMAIL: "owner@example.com", STATS_TOKEN: "t".repeat(24) };
let session = null;
const fakeFetch = async (url, opt) => {
  if (url.startsWith("https://api.stripe.com/v1/checkout/sessions")) {
    const body = new URLSearchParams(opt.body);
    session = { id: "cs_test_1", url: `${BASE}/Photography-Studio/thanks/?paid=1`, metadata: Object.fromEntries([...body].filter(([k]) => k.startsWith("metadata[")).map(([k, v]) => [k.slice(9, -1), v])), email: body.get("customer_email") };
    return { ok: true, status: 200, json: async () => session };
  }
  if (url.startsWith("https://api.resend.com/")) { mails.push(JSON.parse(opt.body)); return { ok: true, status: 200, text: async () => "" }; }
  throw new Error(`unexpected outbound call ${url}`);
};
globalThis.__studioDeps = { store, env, fetch: fakeFetch };

const fn = async (name) => (await import(`../../netlify/functions/${name}.mjs`));
const routes = {};
for (const name of ["studio-availability", "studio-checkout", "studio-request", "studio-webhook", "studio-manage", "studio-collect"]) { const m = await fn(name); routes[m.config.path] = m.default; }

const server = createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c);
  const path = req.url.split("?")[0];
  if (routes[path]) {
    const r = await routes[path](new Request(BASE + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks) }));
    res.writeHead(r.status, Object.fromEntries(r.headers)).end(Buffer.from(await r.arrayBuffer()));
    return;
  }
  let f = join(ROOT, decodeURIComponent(path));
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
  if (!f.startsWith(ROOT) || !existsSync(f)) return res.writeHead(404).end("not found");
  res.writeHead(200, { "Content-Type": TYPES[extname(f)] || "application/octet-stream" }).end(readFileSync(f));
}).listen(PORT);

const day = new Date(Date.now() + 20 * 864e5);
while (day.getUTCDay() === 0) day.setUTCDate(day.getUTCDate() + 1);
const date = day.toISOString().slice(0, 10);

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ["--no-sandbox"] });
let failed = null;
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${BASE}/Photography-Studio/#contact`);
  await page.waitForSelector("text=Reserve date with deposit");
  console.log("ok 1 booking form offers a deposit button");

  await page.fill("#name", "Test Client");
  await page.fill("#email", "client@example.com");
  await page.selectOption("#session", "Half day");
  await page.fill("#date", date);
  await page.fill("#message", "Automated test booking");
  await Promise.all([page.waitForURL("**/thanks/?paid=1"), page.click("text=Reserve date with deposit")]);
  assert.equal(session.metadata.date, date);
  console.log("ok 2 checkout started for the chosen date");

  let avail = await (await fetch(`${BASE}/api/availability`)).json();
  assert.ok(avail.unavailable.includes(date), "date should be held while paying");
  console.log("ok 3 date is held during payment");

  // Stripe's signed "paid" notice
  const event = JSON.stringify({ id: "evt_e2e", type: "checkout.session.completed", data: { object: { id: session.id, payment_intent: "pi_e2e", customer_details: { email: "client@example.com" }, metadata: session.metadata } } });
  const t = Math.floor(Date.now() / 1000);
  const sig = `t=${t},v1=${createHmac("sha256", env.STRIPE_WEBHOOK_SECRET).update(`${t}.${event}`).digest("hex")}`;
  const bad = await fetch(`${BASE}/api/stripe-webhook`, { method: "POST", headers: { "stripe-signature": "t=1,v1=00" }, body: event });
  assert.equal(bad.status, 400);
  const good = await fetch(`${BASE}/api/stripe-webhook`, { method: "POST", headers: { "stripe-signature": sig }, body: event });
  assert.equal(good.status, 200);
  console.log("ok 4 signed webhook accepted, forged one refused");

  assert.deepEqual(await store.get("booked"), [date]);
  assert.equal(mails.filter((m) => m.to[0] === "owner@example.com").length, 1);
  const clientMail = mails.find((m) => m.to[0] === "client@example.com");
  assert.ok(clientMail, "client confirmation sent");
  assert.ok(/manage\/\?d=/.test(clientMail.text), "confirmation has a manage link");
  assert.equal(clientMail.attachments?.[0]?.filename, "session.ics");
  console.log("ok 5 both emails sent, with manage link and calendar invite");

  const link = clientMail.text.match(/https?:\/\/\S+manage\/\?\S+/)[0].replace(/^https?:\/\/[^/]+/, BASE);
  await page.goto(link);
  await page.waitForSelector("#manage-actions:not([hidden])");
  console.log("ok 6 manage link opens the booking");

  const page2 = await browser.newPage();
  await page2.goto(`${BASE}/Photography-Studio/#contact`);
  await page2.waitForSelector("#date");
  await page2.fill("#date", date);
  await page2.dispatchEvent("#date", "input");
  const msg = await page2.textContent(".book-msg");
  assert.match(msg, /not available/);
  console.log("ok 7 a second visitor cannot pick the booked date");

  assert.deepEqual(errors, [], `page errors: ${errors}`);
} catch (e) { failed = e; }
await browser.close();
server.close();
if (failed) { console.error("E2E FAILED:", failed.message); process.exit(1); }
console.log("e2e passed");
process.exit(0);
