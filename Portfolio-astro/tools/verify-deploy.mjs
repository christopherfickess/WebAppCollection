// Waits for Netlify to finish deploying a commit, prints what happened, and writes the deploy address
// to $GITHUB_OUTPUT. Fails with Netlify's own error message if the build failed or never appeared.
//   NETLIFY_AUTH_TOKEN, NETLIFY_SITE_ID, SHA
import { appendFileSync } from "node:fs";
const { NETLIFY_AUTH_TOKEN: token, NETLIFY_SITE_ID: site, SHA: sha } = process.env;
if (!token || !site || !sha) { console.error("NETLIFY_AUTH_TOKEN, NETLIFY_SITE_ID and SHA are required."); process.exit(2); }
const headers = { Authorization: `Bearer ${token}` };
const api = async (p) => { const r = await fetch(`https://api.netlify.com/api/v1${p}`, { headers }); if (!r.ok) throw new Error(`Netlify ${p}: HTTP ${r.status}`); return r.json(); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const deadline = Date.now() + 15 * 60 * 1000;
let last = "";
while (Date.now() < deadline) {
  const deploys = await api(`/sites/${site}/deploys?per_page=30`);
  const d = deploys.find((x) => x.commit_ref === sha);
  const line = d ? `${d.state} (${d.context}, branch ${d.branch})` : "no deploy yet for this commit";
  if (line !== last) { console.log(line); last = line; }
  if (d && d.state === "ready") {
    // A production deploy answers on the site's main address; its branch address just redirects there.
    const url = d.context === "production" ? d.ssl_url || d.url : d.deploy_ssl_url;
    console.log(`deploy ready: ${url}`);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `url=${url}\n`);
    process.exit(0);
  }
  if (d && (d.state === "error" || d.state === "rejected")) {
    console.error(`::error::Netlify deploy ${d.state}: ${d.error_message || "no message"}`);
    console.error(`Log: https://app.netlify.com/sites/${d.name}/deploys/${d.id}`);
    process.exit(1);
  }
  await wait(10000);
}
console.error("::error::Timed out waiting for the Netlify deploy (15 minutes).");
process.exit(1);
