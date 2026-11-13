// Checks a deployed site before it takes real bookings:
//   node tools/launch-check.mjs https://your-site.example [--live]
// --live also requires Stripe to be in live mode. Exits 1 and lists every problem if anything is wrong.
const args = process.argv.slice(2);
const site = (args.find((a) => a.startsWith("http")) || "").replace(/\/$/, "");
const live = args.includes("--live");
if (!site) { console.error("Usage: node tools/launch-check.mjs https://your-site.example [--live]"); process.exit(2); }

const problems = [], passes = [];
const check = (ok, good, bad) => (ok ? passes.push(good) : problems.push(bad));
const get = async (path, init) => { try { return await fetch(site + path, { redirect: "manual", ...init }); } catch (e) { return { ok: false, status: 0, headers: new Headers(), text: async () => "", json: async () => ({}), error: e.message }; } };

const a = await get("/api/availability?setup=1");
const info = a.ok ? await a.json() : {};
check(a.ok, "booking API answers", `booking API did not answer (status ${a.status}). Functions may not be deployed.`);
check(info.payments === true, "payments are on", "payments are off: STRIPE_SECRET_KEY is missing in this deploy");
const s = info.setup || {};
for (const n of ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "RESEND_API_KEY", "EMAIL_FROM", "OWNER_EMAIL", "STATS_TOKEN"]) check(s[n] === true, `${n} set`, `${n} is missing in this deploy`);
check(s.stripeKeyLooksRight === true, "Stripe key has a valid prefix", "STRIPE_SECRET_KEY does not start with sk_test_ or sk_live_");
if (live) check(s.stripeMode === "live", "Stripe is in live mode", `Stripe is in ${s.stripeMode} mode, expected live`);
else check(s.stripeMode !== "live", "Stripe is in test mode", "Stripe is LIVE: use test keys for this check, or pass --live on purpose");
check(typeof s.context === "string" && s.context !== "unknown", `deploy context: ${s.context}`, "deploy context unknown");

const h = await get("/Photography-Studio/");
check(h.status === 200, "home page loads", `home page returned ${h.status}`);
check(/max-age=\d{7,}/.test(h.headers.get("strict-transport-security") || ""), "HSTS header present", "Strict-Transport-Security header missing");
check(/default-src 'self'/.test(h.headers.get("content-security-policy") || ""), "CSP header present", "Content-Security-Policy header missing");
check(h.headers.get("x-content-type-options") === "nosniff", "nosniff header present", "X-Content-Type-Options missing");

for (const path of ["/Photography-Studio/privacy/", "/Photography-Studio/terms/", "/Photography-Studio/manage/"]) check((await get(path)).status === 200, `${path} loads`, `${path} is missing`);
const sec = await (await get("/.well-known/security.txt")).text();
check(/^Contact: mailto:(?!security@example\.com)/m.test(sec), "security.txt has a real contact", "security.txt still has the placeholder contact");
const robots = await (await get("/robots.txt")).text();
check(!/example\.com/.test(robots), "robots.txt has the real domain", "robots.txt still mentions example.com (set SITE_URL or the site URL in Netlify)");
const map = await (await get("/sitemap.xml")).text();
check(!/example\.com/.test(map) && map.includes("<loc>"), "sitemap has the real domain", "sitemap.xml still mentions example.com");

const bad = await get("/api/stripe-webhook", { method: "POST", headers: { "stripe-signature": "t=1,v1=00" }, body: "{}" });
check(bad.status === 400, "webhook refuses unsigned calls", `webhook returned ${bad.status} to a forged call (expected 400)`);
const xs = await get("/api/request", { method: "POST", headers: { Origin: "https://evil.example", "Content-Type": "application/json" }, body: "{}" });
check(xs.status === 403, "forms refuse other sites", `request form returned ${xs.status} to a foreign origin (expected 403)`);
const ex = await get("/api/export");
check(ex.status === 401, "export needs the token", `export returned ${ex.status} without a token (expected 401)`);

for (const p of passes) console.log("ok  ", p);
for (const p of problems) console.log("FAIL", p);
console.log(problems.length ? `\n${problems.length} problem(s). Not ready.` : "\nAll checks passed.");
process.exit(problems.length ? 1 : 0);
