// Copies secrets from the environment (GitHub Actions secrets) into the
// Netlify site's environment variables, using Netlify's API directly.
// Run by .github/workflows/netlify-env.yml. Prints names and status codes only.
const API = "https://api.netlify.com/api/v1";
const NAMES = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "RESEND_API_KEY", "EMAIL_FROM", "OWNER_EMAIL", "STATS_TOKEN"];
const CONTEXTS = ["production", "deploy-preview", "branch-deploy"]; // secrets cannot use "dev"
// Only these differ between test and live. Everything else (email, token) is the same on both.
const LIVE_NAMES = new Set(["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]);
const SCOPES = ["builds", "functions", "runtime"];
// Addresses are not secrets. Netlify fails a build when a secret's value appears in the code, and a contact
// address legitimately does (it is on the site). These two are stored as plain variables.
const PLAIN = new Set(["EMAIL_FROM", "OWNER_EMAIL"]);

export async function sync(env, fetchFn = fetch, log = console.log) {
  const { NETLIFY_AUTH_TOKEN: token, NETLIFY_SITE_ID: siteId } = env;
  if (!token || !siteId) throw new Error("NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID are required.");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const call = async (method, path, body) => {
    const res = await fetchFn(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, ok: res.ok, text: (await res.text()).slice(0, 300) };
  };

  const siteRes = await fetchFn(`${API}/sites/${siteId}`, { headers });
  if (!siteRes.ok) throw new Error(`Could not read the site (HTTP ${siteRes.status}). Check NETLIFY_SITE_ID and that the token can see this site.`);
  const site = await siteRes.json();
  log(`site: ${site.name}, account: ${site.account_slug}`);
  const account = site.account_id;
  if (!account) throw new Error("The site has no account_id.");

  // SYNC_MODE=test (default): every context gets the test values.
  // SYNC_MODE=live: production gets LIVE_STRIPE_* values, previews and branch deploys keep the test values.
  const mode = env.SYNC_MODE || "test";
  if (mode !== "test" && mode !== "live") throw new Error(`SYNC_MODE must be test or live, not "${mode}".`);
  if (mode === "live") {
    if (!/^sk_live_/.test(env.LIVE_STRIPE_SECRET_KEY || "")) throw new Error("Live mode needs LIVE_STRIPE_SECRET_KEY starting with sk_live_.");
    if (!/^whsec_/.test(env.LIVE_STRIPE_WEBHOOK_SECRET || "")) throw new Error("Live mode needs LIVE_STRIPE_WEBHOOK_SECRET starting with whsec_.");
    if (/^sk_live_/.test(env.STRIPE_SECRET_KEY || "")) throw new Error("STRIPE_SECRET_KEY (used for previews) must stay a test key.");
  } else if (/^sk_live_/.test(env.STRIPE_SECRET_KEY || "")) throw new Error("Test mode refuses a live Stripe key. Use SYNC_MODE=live and the LIVE_ secrets.");

  let failed = 0;
  for (const name of NAMES) {
    const value = env[name];
    if (!value) { log(`skip ${name} (empty)`); continue; }
    const liveValue = mode === "live" && LIVE_NAMES.has(name) ? env[`LIVE_${name}`] : value;
    const q = `?site_id=${siteId}`;
    // Replace any existing value: delete (a missing one is fine), then create.
    const del = await call("DELETE", `/accounts/${account}/env/${name}${q}`);
    if (!del.ok && del.status !== 404) { log(`FAILED ${name}: delete returned HTTP ${del.status} ${del.text}`); failed++; continue; }
    // Plain variables use Netlify's defaults (all scopes, all contexts): choosing specific scopes needs a paid plan.
    const payload = PLAIN.has(name)
      ? { key: name, is_secret: false, values: [{ context: "all", value }] }
      : { key: name, scopes: SCOPES, is_secret: true, values: CONTEXTS.map((context) => ({ context, value: context === "production" ? liveValue : value })) };
    const add = await call("POST", `/accounts/${account}/env${q}`, [payload]);
    if (add.ok) log(`set ${name} (${CONTEXTS.join(", ")}${liveValue !== value ? "; production uses the live value" : ""})`);
    else { log(`FAILED ${name}: HTTP ${add.status} ${add.text}`); failed++; }
  }
  if (failed) throw new Error(`${failed} variable(s) failed.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  sync(process.env).catch((e) => { console.error(e.message); process.exit(1); });
}
