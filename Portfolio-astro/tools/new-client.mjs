// Turns this template into a client's site:
//   node tools/new-client.mjs client.json          apply and run every check
//   node tools/new-client.mjs client.json --dry    list what would change, touch nothing
// client.json (all fields optional except name and brand):
//   { "name": "Harbor Light Photography", "brand": "Harbor Light", "tagline": "Photography",
//     "place": "Portland, Maine", "lat": 43.66, "lon": -70.26, "timeZone": "America/New_York",
//     "region": "ME", "country": "US", "phone": "", "accent": "#2b7fd9",
//     "domain": "https://harborlight.example", "securityContact": "hello@harborlight.example", "emailDomain": "mail.harborlight.example" }
// Photos, prices, FAQ and the rest are changed in the content editor or in public/Photography-Studio/content/.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const studio = `${root}public/Photography-Studio/`;
const args = process.argv.slice(2);
const dry = args.includes("--dry");
const file = args.find((a) => !a.startsWith("--"));
if (!file || !existsSync(file)) { console.error("Usage: node tools/new-client.mjs client.json [--dry]"); process.exit(2); }

const c = JSON.parse(readFileSync(file, "utf8"));
const problems = [];
if (!c.name || !c.brand) problems.push("name and brand are required");
if (c.accent && !/^#[0-9a-f]{6}$/i.test(c.accent)) problems.push("accent must look like #2b7fd9");
if (c.domain && !/^https:\/\/[^/\s]+$/.test(c.domain)) problems.push("domain must look like https://example.com (no trailing slash)");
if (c.securityContact && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.securityContact)) problems.push("securityContact must be an email address");
if (problems.length) { console.error("Problems:\n- " + problems.join("\n- ")); process.exit(1); }

const changed = [];
const put = (path, text) => { if (readFileSync(path, "utf8") !== text) { changed.push(path.replace(root, "")); if (!dry) writeFileSync(path, text); } };

// site.json
const sitePath = `${studio}content/site.json`;
const site = JSON.parse(readFileSync(sitePath, "utf8"));
const old = { name: site.name, brand: site.brand };
site.name = c.name; site.brand = c.brand;
if (c.tagline !== undefined) site.tagline = c.tagline;
if (c.place) site.location.place = c.place;
if (c.lat !== undefined) site.location.lat = c.lat;
if (c.lon !== undefined) site.location.lon = c.lon;
if (c.timeZone) site.location.timeZone = c.timeZone;
if (c.accent) site.theme.accent = c.accent;
for (const k of ["phone", "region", "country"]) if (c[k] !== undefined) site.business[k] = c[k];
put(sitePath, JSON.stringify(site, null, 2) + "\n");

// The old business name appears in page titles and legal pages. Replace exact spellings only.
const swaps = [[`${old.name}`, c.name], [old.name.replace("&", "&amp;"), c.name.replace("&", "&amp;")], [old.brand, c.brand], [old.brand.replace("&", "&amp;"), c.brand.replace("&", "&amp;")]];
if (old.name !== c.name || old.brand !== c.brand) {
  for (const f of ["index.html", "thanks/index.html", "manage/index.html", "terms/index.html", "privacy/index.html", "content/about.json", "README.md"]) {
    const p = studio + f; if (!existsSync(p)) continue;
    let t = readFileSync(p, "utf8");
    for (const [a, b] of swaps) if (a) t = t.split(a).join(b);
    put(p, t);
  }
}

// Site address and security contact
if (c.domain) {
  const toml = `${root}netlify.toml`;
  let t = readFileSync(toml, "utf8");
  if (/^SITE_URL\s*=/m.test(t)) t = t.replace(/^SITE_URL\s*=.*$/m, `SITE_URL = "${c.domain}"`);
  else t = t.replace(/(\[build\.environment\]\n)/, `$1SITE_URL = "${c.domain}"\n`);
  put(toml, t);
}
if (c.domain || c.securityContact) {
  const p = `${root}public/.well-known/security.txt`;
  let t = readFileSync(p, "utf8");
  if (c.securityContact) t = t.replace(/^Contact:.*$/m, `Contact: mailto:${c.securityContact}`);
  if (c.domain) t = t.replace(/^Canonical:.*$/m, `Canonical: ${c.domain}/.well-known/security.txt`);
  const next = new Date(); next.setUTCFullYear(next.getUTCFullYear() + 1);
  t = t.replace(/^Expires:.*$/m, `Expires: ${next.toISOString()}`);
  t = t.replace(/^# Replace the contact.*\n/m, "");
  put(p, t);
}

// Service settings (Stripe webhook address, Netlify domain, Resend sending domain)
if (c.domain || c.emailDomain) {
  const sp = `${root}services.config.json`;
  const cfg = JSON.parse(readFileSync(sp, "utf8"));
  if (c.domain) { cfg.siteUrl = c.domain; cfg.customDomain = c.domain; }
  if (c.emailDomain) cfg.resend.domain = c.emailDomain;
  put(sp, JSON.stringify(cfg, null, 2) + "\n");
}

console.log(`${dry ? "Would change" : "Changed"} ${changed.length} file(s):\n- ${changed.join("\n- ") || "(nothing)"}`);
if (dry) process.exit(0);

console.log("\nRunning checks...");
const run = (cmd, label) => { try { execSync(cmd, { cwd: root, stdio: "pipe", env: { ...process.env } }); console.log(`ok   ${label}`); return true; } catch (e) { console.log(`FAIL ${label}\n${String(e.stdout || e.stderr).split("\n").slice(-12).join("\n")}`); return false; } };
const results = [
  run("node tools/build-content.mjs", "content is valid"),
  run("node tools/build-seo.mjs", "search and sharing files built"),
  run("npm test", "booking logic tests"),
  run("npm run test:e2e", "booking test in a browser"),
  run("node tools/quality/check.mjs", "page, accessibility and console checks"),
];
console.log("\nStill to do by hand: photos, prices, About text, Terms review, Resend domain, Stripe, and `npm run launch-check -- <site>`. See CLIENT-LAUNCH.md.");
process.exit(results.every(Boolean) ? 0 : 1);
