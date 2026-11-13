import assert from "node:assert/strict";
import { configure } from "../configure-services.mjs";

const cfg = { siteUrl: "https://s.test", customDomain: "https://studio.example", stripe: { webhookEvents: ["checkout.session.completed", "charge.refunded"], webhookDescription: "d", disablePaymentMethods: ["klarna", "affirm"] }, resend: { domain: "mail.studio.example", region: "us-east-1" }, netlify: { forceHttps: true, manageDnsRecords: true } };
const base = { NETLIFY_AUTH_TOKEN: "nt", NETLIFY_SITE_ID: "S1", STRIPE_SECRET_KEY: "sk_test_a", RESEND_API_KEY: "re_k", STATS_TOKEN: "x" };

function world(over = {}) {
  const calls = [];
  const w = { endpoints: [], resendDomains: [], dns: [], site: { custom_domain: "", force_ssl: false, name: "n", account_id: "A1", account_slug: "me" }, zones: [{ id: "Z1", name: "studio.example" }], pmcs: [{ id: "pmc_1", is_default: true, klarna: { display_preference: { value: "on" } }, affirm: { display_preference: { value: "off" } } }], ...over };
  const J = (b, status = 200) => ({ ok: status < 300, status, json: async () => b, text: async () => JSON.stringify(b) });
  const f = async (url, o = {}) => {
    const m = o.method || "GET"; calls.push({ m, url, body: o.body });
    if (url.includes("stripe.com/v1/webhook_endpoints")) {
      if (m === "GET") return J({ data: w.endpoints });
      if (m === "DELETE") { w.endpoints = []; return J({}); }
      if (url.endsWith("/webhook_endpoints")) { w.endpoints = [{ id: "we_new", url: "https://s.test/api/stripe-webhook", enabled_events: new URLSearchParams(o.body).getAll("enabled_events[]"), status: "enabled" }]; return J({ id: "we_new", secret: "whsec_NEW" }); }
      w.endpoints[0].enabled_events = new URLSearchParams(o.body).getAll("enabled_events[]"); return J({});
    }
    if (url.includes("payment_method_configurations")) return m === "GET" ? J({ data: w.pmcs }) : J({});
    if (url.startsWith("https://api.resend.com/domains") && m === "GET" && url.endsWith("/domains")) return J({ data: w.resendDomains });
    if (url === "https://api.resend.com/domains" && m === "POST") { w.resendDomains.push({ id: "d1", name: "mail.studio.example" }); return J({ id: "d1" }); }
    if (url.endsWith("/domains/d1")) return J({ status: "pending", records: [{ type: "TXT", name: "send.mail", value: "v=spf1", ttl: "Auto" }, { type: "MX", name: "send.mail", value: "feedback", priority: 10 }] });
    if (url.endsWith("/verify")) return J({});
    if (url.endsWith("/dns_zones")) return J(w.zones);
    if (url.includes("/dns_records")) return m === "GET" ? J(w.dns) : (w.dns.push(JSON.parse(o.body)), J({}, 201));
    if (url.endsWith("/sites/S1")) return m === "PATCH" ? (Object.assign(w.site, JSON.parse(o.body)), J({})) : J(w.site);
    if (url.includes("/accounts/A1/env")) return { ok: true, status: m === "DELETE" ? 404 : 201, text: async () => "" };
    throw new Error(`unexpected ${m} ${url}`);
  };
  return { f, calls, w };
}
const run = async (env, c = cfg, opts = {}) => { const out = []; const gh = []; const wd = world(opts.world); const r = await configure(env, c, { fetchFn: wd.f, log: (m) => out.push(m), dry: opts.dry, setSecret: (...a) => gh.push(a) }); return { r, out, gh, ...wd }; };

// 1. fresh setup creates the webhook with both events, turns off methods, adds domain, sets DNS and Netlify
let t = await run({ ...base, GH_ADMIN_TOKEN: "gh", GITHUB_REPOSITORY: "o/r" });
assert.deepEqual(t.w.endpoints[0].enabled_events, ["checkout.session.completed", "charge.refunded"]);
assert.ok(t.calls.some((c) => c.url.includes("payment_method_configurations/pmc_1") && /klarna.*none/.test(decodeURIComponent(c.body))));
assert.equal(t.calls.some((c) => /affirm/.test(decodeURIComponent(c.body || ""))), false, "already-off method untouched");
assert.equal(t.w.dns.length, 2); assert.equal(t.w.dns[0].hostname, "send.mail.studio.example");
assert.equal(t.w.site.custom_domain, "studio.example");
assert.deepEqual(t.gh.map((x) => x[0]), ["STRIPE_WEBHOOK_SECRET"]); assert.equal(t.gh[0][1], "whsec_NEW");
const envPosts = t.calls.filter((c) => c.m === "POST" && c.url.includes("/accounts/A1/env")).map((c) => JSON.parse(c.body)[0]);
assert.equal(envPosts.find((e) => e.key === "STRIPE_WEBHOOK_SECRET").values[0].value, "whsec_NEW");
assert.ok(!t.out.join("\n").includes("whsec_NEW") && !t.out.join("\n").includes("sk_test_a")); console.log("ok fresh setup configures every service, never logs secrets");

// 2. second run with the stored secret changes nothing on Stripe
const again = await run({ ...base, STRIPE_WEBHOOK_SECRET: "whsec_KEEP" }, cfg, { world: { endpoints: [{ id: "we_1", url: "https://s.test/api/stripe-webhook", enabled_events: ["charge.refunded", "checkout.session.completed"], status: "enabled" }], site: { custom_domain: "studio.example", force_ssl: true, name: "n", account_id: "A1" }, resendDomains: [{ id: "d1", name: "mail.studio.example" }], pmcs: [] } });
assert.equal(again.calls.filter((c) => c.url.includes("webhook_endpoints") && c.m !== "GET").length, 0); assert.equal(again.calls.some((c) => c.m === "PATCH"), false); assert.deepEqual(again.r.derived, []); console.log("ok idempotent: nothing to change, secret kept");

// 3. missing event gets added without replacing the endpoint
const fix = await run({ ...base, STRIPE_WEBHOOK_SECRET: "whsec_KEEP" }, cfg, { world: { endpoints: [{ id: "we_1", url: "https://s.test/api/stripe-webhook", enabled_events: ["checkout.session.completed"], status: "enabled" }] } });
assert.deepEqual(fix.w.endpoints[0].enabled_events, ["checkout.session.completed", "charge.refunded"]); assert.equal(fix.calls.some((c) => c.m === "DELETE" && c.url.includes("webhook_endpoints")), false); console.log("ok adds charge.refunded to an existing webhook");

// 4. existing endpoint with no stored secret is replaced and the new secret reaches Netlify
const rot = await run({ ...base }, cfg, { world: { endpoints: [{ id: "we_1", url: "https://s.test/api/stripe-webhook", enabled_events: ["checkout.session.completed"], status: "enabled" }] } });
assert.deepEqual(rot.r.derived, ["STRIPE_WEBHOOK_SECRET"]); console.log("ok unknown secret: endpoint replaced");

// 5. dry run only reads
const dry = await run({ ...base }, cfg, { dry: true });
assert.deepEqual(dry.calls.filter((c) => c.m !== "GET"), []); console.log("ok dry run makes no changes");

// 6. live mode: live key used, previews stay test
const live = await run({ ...base, GO_LIVE: "true", LIVE_STRIPE_SECRET_KEY: "sk_live_b", STRIPE_WEBHOOK_SECRET: "whsec_T", LIVE_STRIPE_WEBHOOK_SECRET: "whsec_L" }, { ...cfg, resend: {} });
assert.equal(live.r.live, true); assert.ok(live.calls.some((c) => c.url.includes("webhook_endpoints")));
await assert.rejects(run({ ...base, STRIPE_SECRET_KEY: "sk_live_x" }), /must be a test key/);
await assert.rejects(run(base, { ...cfg, siteUrl: "http://x" }), /https/); console.log("ok live mode and guard rails");
