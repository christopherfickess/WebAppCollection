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
    // One method per request, so a method Stripe rejects does not block the others.
    for (const m of todo) {
      const p = new URLSearchParams();
      p.set(`${m}[display_preference][preference]`, target.parent ? "none" : "off"); // "none" is only valid on child configurations
      const r = await fetchFn(`${STRIPE}/payment_method_configurations/${target.id}`, { method: "POST", headers, body: p.toString() });
      if (!r.ok) { const d = await r.json().catch(() => ({})); log(`warn ${label}: could not turn off ${m} (HTTP ${r.status}: ${d?.error?.message || "no detail"}). Turn it off in the Stripe dashboard.`); }
    }
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
  // Separate requests: Netlify rejects the whole update if force_ssl is refused, which would also drop the domain.
  const patch = async (what, body, soft) => {
    log(`${dry ? "would set" : "setting"} Netlify site: ${what}`);
    if (dry) return true;
    const u = await fetchFn(`${NETLIFY}/sites/${siteId}`, { method: "PATCH", headers, body: JSON.stringify(body) });
    if (!u.ok) log(`${soft ? "note" : "warn"} Netlify ${what} not set yet (HTTP ${u.status}: ${(await u.text().catch(() => "")).slice(0, 160)})${soft ? ". The HTTPS certificate is probably still being issued; run this again in a few minutes." : ""}`);
    return u.ok;
  };
  let changed = false;
  if (domain && site.custom_domain !== domain) { changed = true; if (await patch("custom_domain", { custom_domain: domain })) site.custom_domain = domain; }
  // A custom domain needs a certificate before HTTPS can be forced (and the DNS record must exist first).
  if (domain && site.custom_domain === domain && !dry && !site.ssl) {
    const c = await fetchFn(`${NETLIFY}/sites/${siteId}/ssl`, { method: "POST", headers }).catch(() => null);
    log(c?.ok ? "requested an HTTPS certificate for the custom domain" : `note certificate not issued yet${c ? ` (HTTP ${c.status})` : ""}: it needs the DNS record to resolve; run this again later`);
  }
  if (forceHttps && site.custom_domain && site.custom_domain === domain && site.force_ssl !== true) { changed = true; await patch("force_ssl", { force_ssl: true }, true); }
  if (!changed) log("ok Netlify site settings already match");
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

// Points a subdomain at the Netlify site, when Netlify hosts the zone. Otherwise says which record to add.
export async function netlifyCname({ token, host, target, dry, fetchFn, log }) {
  const parts = host.split(".");
  if (parts.length < 3) { log(`note ${host} is an apex domain: add it in Netlify's domain settings (it gives you the records)`); return; }
  const zoneName = parts.slice(-2).join(".");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const zr = await fetchFn(`${NETLIFY}/dns_zones`, { headers });
  const zone = (zr.ok ? await zr.json() : []).find((z) => z.name === zoneName);
  if (!zone) { log(`DNS record to add at your DNS host:  CNAME ${host} -> ${target}`); return; }
  const have = (await (await fetchFn(`${NETLIFY}/dns_zones/${zone.id}/dns_records`, { headers })).json()) || [];
  if (have.some((h) => h.hostname === host && h.type === "CNAME" && String(h.value).replace(/\.$/, "") === target)) { log(`ok DNS ${host} already points to ${target}`); return; }
  log(`${dry ? "would add" : "adding"} DNS CNAME ${host} -> ${target}`);
  if (dry) return;
  const res = await fetchFn(`${NETLIFY}/dns_zones/${zone.id}/dns_records`, { method: "POST", headers, body: JSON.stringify({ type: "CNAME", hostname: host, value: target, ttl: 3600 }) });
  if (!res.ok) log(`warn DNS CNAME ${host} failed (HTTP ${res.status})`);
}

// ---- Cloudflare DNS (optional) -------------------------------------------
// Needs CLOUDFLARE_API_TOKEN: a token with "Zone > DNS > Edit" for just this zone. Records are created DNS-only
// (not proxied) so Netlify can issue the HTTPS certificate. Returns false when there is no token or no such zone.
const CF = "https://api.cloudflare.com/client/v4";
export async function cloudflareDns({ token, zoneName, records, dry, fetchFn, log }) {
  if (!token) return false;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const zr = await fetchFn(`${CF}/zones?name=${encodeURIComponent(zoneName)}`, { headers });
  const zj = zr.ok ? await zr.json() : {};
  const zone = (zj.result || [])[0];
  if (!zone) { log(`note Cloudflare token cannot see a zone named ${zoneName}${zr.ok ? "" : ` (HTTP ${zr.status})`}`); return false; }
  for (const rec of records) {
    const name = !rec.name || rec.name === "@" ? zoneName : rec.name.endsWith(zoneName) ? rec.name : `${rec.name}.${zoneName}`;
    const q = await (await fetchFn(`${CF}/zones/${zone.id}/dns_records?type=${rec.type}&name=${encodeURIComponent(name)}`, { headers })).json();
    const have = (q.result || [])[0];
    const content = String(rec.value).replace(/\.$/, "");
    if (have && String(have.content).replace(/\.$/, "") === content) { log(`ok Cloudflare ${rec.type} ${name} already set`); continue; }
    log(`${dry ? "would " : ""}${have ? "update" : "add"} Cloudflare ${rec.type} ${name} -> ${content}`);
    if (dry) continue;
    const body = { type: rec.type, name, content, ttl: 1, proxied: false, ...(rec.priority != null ? { priority: Number(rec.priority) } : {}) };
    const res = await fetchFn(`${CF}/zones/${zone.id}/dns_records${have ? `/${have.id}` : ""}`, { method: have ? "PUT" : "POST", headers, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`Cloudflare ${rec.type} ${name}: HTTP ${res.status} ${(await res.text().catch(() => "")).slice(0, 200)}`);
  }
  return true;
}

// ---- Cloudflare Email Routing (optional) -----------------------------------
// Forwards hello@<domain> to the owner's inbox. The token also needs "Zone > Email Routing Rules > Edit" and
// "Account > Email Routing Addresses > Edit". The destination inbox must confirm once by clicking a link Cloudflare emails.
export async function cloudflareEmailRouting({ token, zoneName, address, forwardTo, dry, fetchFn, log }) {
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const call = async (path, init) => {
    const r = await fetchFn(`${CF}${path}`, { headers, ...init });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.success === false) throw new Error(`Cloudflare ${path.split("?")[0]}: HTTP ${r.status} ${(j.errors || []).map((e) => e.message).join("; ")}`.trim());
    return j.result;
  };
  const zone = (await call(`/zones?name=${encodeURIComponent(zoneName)}`))?.[0];
  if (!zone) throw new Error(`Cloudflare token cannot see a zone named ${zoneName}`);
  const local = address.includes("@") ? address : `${address}@${zoneName}`;
  const dests = (await call(`/accounts/${zone.account.id}/email/routing/addresses`)) || [];
  let dest = dests.find((d) => d.email?.toLowerCase() === forwardTo.toLowerCase());
  if (!dest) {
    log(`${dry ? "would add" : "adding"} forwarding destination ${forwardTo.replace(/^(.).*(@.*)$/, "$1***$2")}`);
    if (!dry) dest = await call(`/accounts/${zone.account.id}/email/routing/addresses`, { method: "POST", body: JSON.stringify({ email: forwardTo }) });
  }
  if (dest && !dest.verified) log(`ACTION Cloudflare emailed ${forwardTo.replace(/^(.).*(@.*)$/, "$1***$2")} a confirmation link. Click it once; mail forwards after that.`);
  const status = await call(`/zones/${zone.id}/email/routing`);
  if (!status?.enabled) {
    log(`${dry ? "would enable" : "enabling"} Email Routing on ${zoneName}`);
    if (!dry) await call(`/zones/${zone.id}/email/routing/enable`, { method: "POST", body: "{}" });
  } else log(`ok Email Routing already enabled on ${zoneName}`);
  const rules = (await call(`/zones/${zone.id}/email/routing/rules`)) || [];
  const rule = rules.find((r) => (r.matchers || []).some((m) => m.field === "to" && String(m.value).toLowerCase() === local.toLowerCase()));
  const want = { name: `Forward ${local}`, enabled: true, matchers: [{ type: "literal", field: "to", value: local }], actions: [{ type: "forward", value: [forwardTo] }] };
  const same = rule && rule.enabled && (rule.actions || []).some((a) => a.type === "forward" && (a.value || []).map((v) => v.toLowerCase()).includes(forwardTo.toLowerCase()));
  if (same) log(`ok ${local} already forwards to the owner`);
  else {
    log(`${dry ? "would " : ""}${rule ? "update" : "create"} rule ${local} -> owner inbox`);
    if (!dry) await call(`/zones/${zone.id}/email/routing/rules${rule ? `/${rule.tag || rule.id}` : ""}`, { method: rule ? "PUT" : "POST", body: JSON.stringify(want) });
  }
}

// Places records at the first DNS host that manages the zone: Cloudflare, then Netlify. False means do it by hand.
export async function placeDns({ env, zoneName, records, dry, fetchFn, log }) {
  if (await cloudflareDns({ token: env.CLOUDFLARE_API_TOKEN, zoneName, records, dry, fetchFn, log })) return true;
  return env.NETLIFY_AUTH_TOKEN ? netlifyDns({ token: env.NETLIFY_AUTH_TOKEN, zoneName, records, dry, fetchFn, log }) : false;
}

// ---- GitHub (optional) --------------------------------------------------
export const ghSetSecret = (name, value, repo, token) => execFileSync("gh", ["secret", "set", name, "--repo", repo, "--body", value], { env: { ...process.env, GH_TOKEN: token }, stdio: "pipe" });

// ---- orchestration ------------------------------------------------------
export async function configure(env, cfg, { fetchFn = fetch, log = console.log, dry = false, setSecret = ghSetSecret } = {}) {
  const live = env.GO_LIVE === "true" && /^sk_live_/.test(env.LIVE_STRIPE_SECRET_KEY || "");
  const active = cfg.useCustomDomain && cfg.customDomain ? cfg.customDomain : cfg.siteUrl;
  const url = `${(active || "").replace(/\/$/, "")}/api/stripe-webhook`;
  if (!/^https:\/\//.test(url)) throw new Error("services.config.json: siteUrl must be an https address");
  log(`mode: ${live ? "live (production gets live keys)" : "test"}${dry ? ", dry run: nothing is changed" : ""}`);
  const derived = {};
  const s = cfg.stripe || {};

  // Each service is its own step: one failing (a restricted key, an outage) must not stop the others.
  const failures = [];
  const step = async (name, fn) => { try { await fn(); } catch (e) { failures.push(`${name}: ${e.message}`); log(`FAILED ${name}: ${e.message}`); } };

  if (/^sk_live_/.test(env.STRIPE_SECRET_KEY || "")) throw new Error("STRIPE_SECRET_KEY must be a test key. Live keys go in LIVE_STRIPE_SECRET_KEY.");
  const stripeModes = [["test", env.STRIPE_SECRET_KEY, env.STRIPE_WEBHOOK_SECRET, "STRIPE_WEBHOOK_SECRET"]];
  if (live) stripeModes.push(["live", env.LIVE_STRIPE_SECRET_KEY, env.LIVE_STRIPE_WEBHOOK_SECRET, "LIVE_STRIPE_WEBHOOK_SECRET"]);
  for (const [label, key, existing, secretName] of stripeModes) {
    if (!key) { log(`skip Stripe ${label} mode (no key)`); continue; }
    await step(`Stripe ${label} webhook`, async () => {
      const w = await stripeWebhook({ key, url, events: s.webhookEvents, description: s.webhookDescription, existingSecret: existing, dry, fetchFn, log, label });
      if (w.secret && w.secret !== existing) derived[secretName] = w.secret;
    });
    await step(`Stripe ${label} payment methods`, () => stripePaymentMethods({ key, off: s.disablePaymentMethods || [], dry, fetchFn, log, label }));
  }

  // Resend domain management needs a full-access key; the everyday RESEND_API_KEY may be send-only.
  const domain = cfg.resend?.domain;
  const resendKey = env.RESEND_ADMIN_API_KEY;
  if (domain && resendKey) {
    await step("Resend domain", async () => {
      const r = await resendDomain({ key: resendKey, name: domain, region: cfg.resend.region || "us-east-1", dry, fetchFn, log });
      if (r.status !== "verified" && r.records.length) {
        const placed = cfg.netlify?.manageDnsRecords ? await placeDns({ env, zoneName: domain.split(".").slice(-2).join("."), records: r.records, dry, fetchFn, log }) : false;
        if (!placed) { log("DNS records to add at your DNS host:"); for (const rec of r.records) log(`  ${rec.type} ${rec.name} -> ${rec.value}${rec.priority != null ? ` (priority ${rec.priority})` : ""}`); }
      }
    });
  } else log(`skip Resend domain (${domain ? "add a full-access key as the RESEND_ADMIN_API_KEY secret" : "no resend.domain in services.config.json"})`);

  if (cfg.emailRouting?.address && env.CLOUDFLARE_API_TOKEN && env.OWNER_EMAIL) {
    await step("Cloudflare email forwarding", () => cloudflareEmailRouting({ token: env.CLOUDFLARE_API_TOKEN, zoneName: (cfg.customDomain || "").replace(/^https?:\/\//, "").split(".").slice(-2).join("."), address: cfg.emailRouting.address, forwardTo: env.OWNER_EMAIL.trim(), dry, fetchFn, log }));
  } else if (cfg.emailRouting?.address) log("skip email forwarding (needs CLOUDFLARE_API_TOKEN and OWNER_EMAIL)");

  if (env.NETLIFY_AUTH_TOKEN && env.NETLIFY_SITE_ID) {
    await step("Netlify site settings", async () => {
      const host = cfg.customDomain?.replace(/^https?:\/\//, "");
      const site = await netlifySite({ token: env.NETLIFY_AUTH_TOKEN, siteId: env.NETLIFY_SITE_ID, domain: host, forceHttps: cfg.netlify?.forceHttps, dry, fetchFn, log });
      if (host && cfg.netlify?.manageDnsRecords) {
        const target = `${site.name}.netlify.app`;
        const placed = host.split(".").length >= 3 && await cloudflareDns({ token: env.CLOUDFLARE_API_TOKEN, zoneName: host.split(".").slice(-2).join("."), records: [{ type: "CNAME", name: host, value: target }], dry, fetchFn, log });
        if (!placed) await netlifyCname({ token: env.NETLIFY_AUTH_TOKEN, host, target, dry, fetchFn, log });
      } else if (host) log(`DNS record to add at your DNS host:  CNAME ${host} -> ${site.name}.netlify.app`);
    });
  } else log("skip Netlify site settings (no NETLIFY_AUTH_TOKEN / NETLIFY_SITE_ID)");

  // Keep what we learned: GitHub secrets (if a token that can write them is supplied), then Netlify variables.
  if (Object.keys(derived).length) {
    if (env.GH_ADMIN_TOKEN && env.GITHUB_REPOSITORY && !dry) {
      for (const [k, v] of Object.entries(derived)) await step(`save GitHub secret ${k}`, async () => { setSecret(k, v, env.GITHUB_REPOSITORY, env.GH_ADMIN_TOKEN); log(`saved GitHub secret ${k}`); });
    } else log(`new secrets not stored in GitHub (${dry ? "dry run" : "no GH_ADMIN_TOKEN"}): ${Object.keys(derived).join(", ")}${dry ? "" : ". They are still sent to Netlify now, but re-running will replace the webhook again until GH_ADMIN_TOKEN is set."}`);
  }
  if (!dry && env.NETLIFY_AUTH_TOKEN && env.NETLIFY_SITE_ID) {
    await step("Netlify variables", () => sync({ ...env, ...derived, SYNC_MODE: live ? "live" : "test" }, fetchFn, log));
  } else log(dry ? "dry run: Netlify variables not changed" : "skip Netlify variables");
  if (failures.length) throw new Error(`${failures.length} step(s) failed:\n- ${failures.join("\n- ")}`);
  return { derived: Object.keys(derived), live };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const cfg = JSON.parse(readFileSync(new URL("../services.config.json", import.meta.url), "utf8"));
  configure(process.env, cfg, { dry: process.argv.includes("--dry") }).catch((e) => { console.error(e.message); process.exit(1); });
}
