// Copies secrets from the environment (GitHub Actions secrets) into the
// Netlify site's environment variables, using Netlify's API directly.
// Run by .github/workflows/netlify-env.yml. Prints names and status codes only.
const API = "https://api.netlify.com/api/v1";
const NAMES = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "RESEND_API_KEY", "EMAIL_FROM", "OWNER_EMAIL", "STATS_TOKEN"];
const CONTEXTS = ["production", "deploy-preview", "branch-deploy"]; // secrets cannot use "dev"
const SCOPES = ["builds", "functions", "runtime"];

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

  let failed = 0;
  for (const name of NAMES) {
    const value = env[name];
    if (!value) { log(`skip ${name} (empty)`); continue; }
    const q = `?site_id=${siteId}`;
    // Replace any existing value: delete (a missing one is fine), then create.
    const del = await call("DELETE", `/accounts/${account}/env/${name}${q}`);
    if (!del.ok && del.status !== 404) { log(`FAILED ${name}: delete returned HTTP ${del.status} ${del.text}`); failed++; continue; }
    const add = await call("POST", `/accounts/${account}/env${q}`, [{ key: name, scopes: SCOPES, is_secret: true, values: CONTEXTS.map((context) => ({ context, value })) }]);
    if (add.ok) log(`set ${name} (${CONTEXTS.join(", ")})`);
    else { log(`FAILED ${name}: HTTP ${add.status} ${add.text}`); failed++; }
  }
  if (failed) throw new Error(`${failed} variable(s) failed.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  sync(process.env).catch((e) => { console.error(e.message); process.exit(1); });
}
