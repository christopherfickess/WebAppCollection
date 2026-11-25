// Scans the BUILT pages (dist/) of the three sites for things that break the site's Content-Security-Policy or leak:
// inline scripts and handlers, javascript: links, plain-http resources, links that open a new tab without rel="noopener",
// forms that post to another site, published source maps and secrets. Run after `npm run build`.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { allPages, SITES, pagesOf } from "../quality/sites.mjs";
import { findSecrets } from "../lib/secrets.mjs";

const ROOT = resolve(process.env.SITE_ROOT || "dist");
if (!existsSync(join(ROOT, "index.html"))) { console.error(`${ROOT} has no built site. Run "npm run build" first.`); process.exit(2); }
const problems = [];
const add = (page, msg) => problems.push(`${page}: ${msg}`);

for (const page of allPages(ROOT)) {
  const html = readFileSync(join(ROOT, page, "index.html"), "utf8");
  // inline <script> bodies are blocked by script-src 'self'; JSON data blocks are not executed, so they are fine
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc=/.test(m[1])) continue;
    if (/type=["']?(application\/(ld\+)?json|importmap|speculationrules)/i.test(m[1])) continue;
    if (m[2].trim()) add(page, "inline <script> (blocked by the site's CSP)");
  }
  if (/\son(click|load|error|submit|change|mouseover|focus|input)\s*=/i.test(html)) add(page, "inline event handler attribute (blocked by the site's CSP)");
  if (/\b(?:href|src|action)\s*=\s*["']\s*javascript:/i.test(html)) add(page, "javascript: URL");
  for (const m of html.matchAll(/<(?:a|img|script|link|iframe|source|form)\b[^>]*\b(?:href|src|action)\s*=\s*["'](http:\/\/[^"']+)/gi)) if (!/^http:\/\/(www\.w3\.org|localhost)/.test(m[1])) add(page, `plain http resource ${m[1].slice(0, 60)}`);
  for (const m of html.matchAll(/<a\b[^>]*>/gi)) if (/target=["']?_blank/i.test(m[0]) && !/rel=["'][^"']*\b(noopener|noreferrer)\b/i.test(m[0])) add(page, `target=_blank without rel="noopener": ${m[0].slice(0, 80)}`);
  for (const m of html.matchAll(/<form\b[^>]*>/gi)) { const a = (m[0].match(/\baction=["']([^"']*)/i) || [])[1]; if (a && /^(https?:)?\/\//i.test(a)) add(page, `form posts to another site: ${a.slice(0, 60)}`); }
  for (const m of html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)=["'](https?:\/\/[^"']+)/gi)) if (/<script|rel=["']?stylesheet/i.test(m[0])) add(page, `loads code from another site: ${m[1].slice(0, 60)}`);
}

// whole built output: source maps, env files, secrets
const walk = (dir) => readdirSync(dir).flatMap((e) => { const p = join(dir, e); return statSync(p).isDirectory() ? walk(p) : [p]; });
let scanned = 0;
for (const f of walk(ROOT)) {
  const rel = f.slice(ROOT.length);
  if (/\.map$/.test(f)) add(rel, "published source map");
  if (/(^|\/)\.env|\.pem$|id_rsa/.test(rel)) add(rel, "published key or env file");
  if (/\.(html|js|mjs|css|json|txt|xml|svg|md)$/i.test(f) && statSync(f).size < 3e6) { scanned++; for (const n of findSecrets(readFileSync(f, "utf8"))) add(rel, `looks like a ${n}`); }
}

console.log(`Scanned ${allPages(ROOT).length} pages across ${SITES.length} sites (${SITES.map((s) => `${s.name}: ${pagesOf(s, ROOT).length}`).join(", ")}) and ${scanned} published files.`);
if (problems.length) { console.error(problems.map((p) => "FAIL " + p).join("\n")); process.exit(1); }
console.log("ok built pages: no inline code, unsafe links, cross-site forms, source maps or secrets");
