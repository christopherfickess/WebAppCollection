// Brings Stripe, Resend, Netlify and GitHub into the state services.config.json describes.
// Safe to run repeatedly: it looks first, then only changes what differs.
//   node tools/configure-services.mjs            apply
//   node tools/configure-services.mjs --dry      only read, print what would change
// Credentials come from the environment (GitHub Actions secrets). Secret values are never printed.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { sync } from "./sync-netlify-env.mjs";

const STRIPE = "https://api.stripe.com/v1";
const RESEND = "https://api.resend.com";
const NETLIFY = "https://api.netlify.com/api/v1";
const form = (o) => { const p = new URLSearchParams(); for (const [k, v] of Object.entries(o)) Array.isArray(v) ? v.forEach((x) => p.append(`${k}[]`, x)) : p.set(k, v); return p.toString(); };

// ---- Stripe -----------------------------------------------------------
export async function stripeWebhook({ key, url, events, description, existingSecret, dry, fetchFn, log, label }) {
  const call = async (method, path, body) => {
    const res = await fetchFn(STRIPE + path, { method, headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" }, body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Stripe ${label} ${method} ${path}: ${data?.error?.message || res.status}`);
    return data;
  };
  const list = await call("GET", "/webhook_endpoints?limit=100");
  const found = (list.data || []).find((e) => e.url === url);
  if (found) {
    const have = [...(found.enabled_events || [])].sort().join();
    const want = [...events].sort().join();
    if (have !== want || found.status === "disabled") {
      log(`${dry ? "would update" : "updating"} ${label} webhook events: ${events.join(", ")}`);
      if (!dry) await call("POST", `/webhook_endpoints/${found.id}`, form({ enabled_events: events, disabled: "false", description }));
    } else log(`ok ${label} webhook already listens to ${events.join(", ")}`);
    if (existingSecret) return { secret: existingSecret, changed: have !== want };
    // Stripe shows a signing secret only when an endpoint is created, so without a stored one the endpoint is replaced.
    log(`${dry ? "would replace" : "replacing"} ${label} webhook (its signing secret is not stored)`);
    if (dry) return { secret: "", changed: true };
    await call("DELETE", `/webhook_endpoints/${found.id}`);
  } else log(`${dry ? "would create" : "creating"} ${label} webhook for ${url}`);
  if (dry) return { secret: "", changed: true };
  const made = await call("POST", "/webhook_endpoints", form({ url, enabled_events: events, description }));
  return { secret: made.secret, changed: true };
}

export async function stripePaymentMethods({ key, off, dry, fetchFn, log, label }) {
  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" };
  try {
    const res = await fetchFn(`${STRIPE}/payment_method_configurations?limit=20`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const cfgs = (await res.json()).data || [];
    const target = cfgs.find((c) => c.is_default) || cfgs[0];
    if (!target) { log(`warn ${label}: no payment method configuration found`); return; }
    const todo = off.filter((m) => target[m] && target[m].display_preference?.value !== "off" && target[m].display_preference?.preference !== "none");
    if (!todo.length) { log(`ok ${label} payment methods already off: ${off.join(", ")}`); return; }
    log(`${dry ? "would turn" : "turning"} off in ${label}: ${todo.join(", ")}`);
    if (dry) return;
    const p = new URLSearchParams();
    for (const m of todo) p.set(`${m}[display_preference][preference]`, "none");
    const r = await fetchFn(`${STRIPE}/payment_method_configurations/${target.id}`, { method: "POST", headers, body: p.toString() });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
  } catch (e) { log(`warn ${label} payment methods not changed (${e.message}); set them in the Stripe dashboard`); }
}

// ---- Resend -----------------------------------------------------------
export async function resendDomain({ key, name, region, dry, fetchFn, log }) {
  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const get = async (path, init) => { const r = await fetchFn(RESEND + path, { headers, ...init }); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(`Resend ${path}: ${d.message || r.status}`); return d; };
  const all = await get("/domains");
  let d = (all.data || []).find((x) => x.name === name);
  if (!d) {
    log(`${dry ? "would add" : "adding"} Resend domain ${name}`);
    if (dry) return { status: "not_started", records: [] };
    d = await get("/domains", { method: "POST", body: JSON.stringify({ name, region }) });
  }
  const full = await get(`/domains/${d.id}`);
  if (full.status !== "verified" && !dry) { try { await get(`/domains/${d.id}/verify`, { method: "POST" }); } catch (e) { log(`warn ${e.message}`); } }
  log(`resend domain ${name}: ${full.status}`);
  return { status: full.status, records: full.records || [] };
}

// ---- Netlify ----------------------------------------------------------
export async function netlifySite({ token, siteId, domain, forceHttps, dry, fetchFn, log }) {
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const r = await fetchFn(`${NETLIFY}/sites/${siteId}`, { headers });
  if (!r.ok) throw new Error(`Netlify site read failed (HTTP ${r.status})`);
  const site = await r.json();
  const patch = {};
  if (domain && site.custom_domain !== domain) patch.custom_domain = domain;
  if (forceHttps && site.force_ssl !== true) patch.force_ssl = true;
  if (Object.keys(patch).length) {
    log(`${dry ? "would set" : "setting"} Netlify site: ${Object.keys(patch).join(", ")}`);
    if (!dry) { const u = await fetchFn(`${NETLIFY}/sites/${siteId}`, { method: "PATCH", headers, body: JSON.stringify(patch) }); if (!u.ok) log(`warn Netlify site update failed (HTTP ${u.status})`); }
  } else log("ok Netlify site settings already match");
  return site;
}

// Adds DNS records at Netlify, only when Netlify hosts the zone. Records already there are left alone.
export async function netlifyDns({ token, zoneName, records, dry, fetchFn, log }) {
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const zr = await fetchFn(`${NETLIFY}/dns_zones`, { headers });
  const zones = zr.ok ? await zr.json() : [];
  const zone = zones.find((z) => z.name === zoneName);
  if (!zone) { log(`note no Netlify DNS zone for ${zoneName}: add the records below at your DNS host`); return false; }
  const have = (await (await fetchFn(`${NETLIFY}/dns_zones/${zone.id}/dns_records`, { headers })).json()) || [];
  for (const rec of records) {
    const hostname = !rec.name || rec.name === "@" ? zoneName : `${rec.name}.${zoneName}`;
    if (have.some((h) => h.type === rec.type && h.hostname === hostname && h.value === rec.value)) continue;
    log(`${dry ? "would add" : "adding"} DNS ${rec.type} ${hostname}`);
    if (dry) continue;
    const body = { type: rec.type, hostname, value: rec.value, ttl: rec.ttl && Number(rec.ttl) ? Number(rec.ttl) : 3600, ...(rec.priority != null ? { priority: Number(rec.priority) } : {}) };
    const res = await fetchFn(`${NETLIFY}/dns_zones/${zone.id}/dns_records`, { method: "POST", headers, body: JSON.stringify(body) });
    if (!res.ok) log(`warn DNS ${rec.type} ${hostname} failed (HTTP ${res.status})`);
  }
  return true;
}

// ---- GitHub (optional) --------------------------------------------------
export const ghSetSecret = (name, value, repo, token) => execFileSync("gh", ["secret", "set", name, "--repo", repo, "--body", value], { env: { ...process.env, GH_TOKEN: token }, stdio: "pipe" });

// ---- orchestration ------------------------------------------------------
export async function configure(env, cfg, { fetchFn = fetch, log = console.log, dry = false, setSecret = ghSetSecret } = {}) {
  const live = env.GO_LIVE === "true" && /^sk_live_/.test(env.LIVE_STRIPE_SECRET_KEY || "");
  const url = `${(cfg.siteUrl || "").replace(/\/$/, "")}/api/stripe-webhook`;
  if (!/^https:\/\//.test(url)) throw new Error("services.config.json: siteUrl must be an https address");
  log(`mode: ${live ? "live (production gets live keys)" : "test"}${dry ? ", dry run: nothing is changed" : ""}`);
  const derived = {};
  const s = cfg.stripe || {};

  if (env.STRIPE_SECRET_KEY) {
    if (/^sk_live_/.test(env.STRIPE_SECRET_KEY)) throw new Error("STRIPE_SECRET_KEY must be a test key. Live keys go in LIVE_STRIPE_SECRET_KEY.");
    const w = await stripeWebhook({ key: env.STRIPE_SECRET_KEY, url, events: s.webhookEvents, description: s.webhookDescription, existingSecret: env.STRIPE_WEBHOOK_SECRET, dry, fetchFn, log, label: "test" });
    if (w.secret && w.secret !== env.STRIPE_WEBHOOK_SECRET) derived.STRIPE_WEBHOOK_SECRET = w.secret;
    await stripePaymentMethods({ key: env.STRIPE_SECRET_KEY, off: s.disablePaymentMethods || [], dry, fetchFn, log, label: "test" });
  } else log("skip Stripe test mode (no STRIPE_SECRET_KEY)");

  if (live) {
    const w = await stripeWebhook({ key: env.LIVE_STRIPE_SECRET_KEY, url, events: s.webhookEvents, description: s.webhookDescription, existingSecret: env.LIVE_STRIPE_WEBHOOK_SECRET, dry, fetchFn, log, label: "live" });
    if (w.secret && w.secret !== env.LIVE_STRIPE_WEBHOOK_SECRET) derived.LIVE_STRIPE_WEBHOOK_SECRET = w.secret;
    await stripePaymentMethods({ key: env.LIVE_STRIPE_SECRET_KEY, off: s.disablePaymentMethods || [], dry, fetchFn, log, label: "live" });
  }

  const domain = cfg.resend?.domain;
  if (domain && env.RESEND_API_KEY) {
    const r = await resendDomain({ key: env.RESEND_API_KEY, name: domain, region: cfg.resend.region || "us-east-1", dry, fetchFn, log });
    if (r.status !== "verified" && r.records.length) {
      const placed = cfg.netlify?.manageDnsRecords && env.NETLIFY_AUTH_TOKEN ? await netlifyDns({ token: env.NETLIFY_AUTH_TOKEN, zoneName: domain.split(".").slice(-2).join("."), records: r.records, dry, fetchFn, log }) : false;
      if (!placed) { log("DNS records to add at your DNS host:"); for (const rec of r.records) log(`  ${rec.type} ${rec.name} -> ${rec.value}${rec.priority != null ? ` (priority ${rec.priority})` : ""}`); }
    }
  } else log("skip Resend domain (no resend.domain in services.config.json, or no RESEND_API_KEY)");

  if (env.NETLIFY_AUTH_TOKEN && env.NETLIFY_SITE_ID) {
    await netlifySite({ token: env.NETLIFY_AUTH_TOKEN, siteId: env.NETLIFY_SITE_ID, domain: cfg.customDomain?.replace(/^https?:\/\//, ""), forceHttps: cfg.netlify?.forceHttps, dry, fetchFn, log });
  } else log("skip Netlify site settings (no NETLIFY_AUTH_TOKEN / NETLIFY_SITE_ID)");

  // Keep what we learned: GitHub secrets (if a token that can write them is supplied), then Netlify variables.
  if (Object.keys(derived).length) {
    if (env.GH_ADMIN_TOKEN && env.GITHUB_REPOSITORY && !dry) { for (const [k, v] of Object.entries(derived)) { setSecret(k, v, env.GITHUB_REPOSITORY, env.GH_ADMIN_TOKEN); log(`saved GitHub secret ${k}`); } }
    else log(`new secrets not stored in GitHub (${dry ? "dry run" : "no GH_ADMIN_TOKEN"}): ${Object.keys(derived).join(", ")}${dry ? "" : ". They are still sent to Netlify now, but re-running will replace the webhook again until GH_ADMIN_TOKEN is set."}`);
  }
  if (!dry && env.NETLIFY_AUTH_TOKEN && env.NETLIFY_SITE_ID) {
    await sync({ ...env, ...derived, SYNC_MODE: live ? "live" : "test" }, fetchFn, log);
  } else log(dry ? "dry run: Netlify variables not changed" : "skip Netlify variables");
  return { derived: Object.keys(derived), live };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const cfg = JSON.parse(readFileSync(new URL("../services.config.json", import.meta.url), "utf8"));
  configure(process.env, cfg, { dry: process.argv.includes("--dry") }).catch((e) => { console.error(e.message); process.exit(1); });
}
