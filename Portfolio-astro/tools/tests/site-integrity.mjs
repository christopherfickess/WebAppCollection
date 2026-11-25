// Internal links, anchors, sitemap, canonical URLs, robots.txt, unique titles and page images, for every page of the three
// sites in the BUILT output (dist/). Needs no browser and no network. Run after `npm run build`.
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, resolve, posix } from "node:path";
import { allPages } from "../quality/sites.mjs";

const ROOT = resolve(process.env.SITE_ROOT || "dist");
if (!existsSync(join(ROOT, "index.html"))) { console.error(`${ROOT} has no built site. Run "npm run build" first.`); process.exit(2); }
const problems = [];
const add = (page, msg) => problems.push(`${page}: ${msg}`);
const pages = allPages(ROOT);
const htmlOf = (p) => readFileSync(join(ROOT, p, "index.html"), "utf8");
const cache = new Map();
const idsOf = (p) => { if (!cache.has(p)) cache.set(p, new Set([...htmlOf(p).matchAll(/\s(?:id|name)=["']([^"']+)["']/g)].map((m) => m[1]))); return cache.get(p); };
const fileFor = (urlPath) => { // a built file for a URL path, or null
  const f = join(ROOT, decodeURIComponent(urlPath));
  if (!f.startsWith(ROOT)) return null;
  if (existsSync(f) && statSync(f).isFile()) return f;
  if (existsSync(join(f, "index.html"))) return join(f, "index.html");
  return null;
};

let linkCount = 0;
for (const page of pages) {
  const html = htmlOf(page);
  const refs = [...html.matchAll(/<(a|link|img|script|source|iframe|object|video|audio|use)\b[^>]*>/gi)].flatMap((m) => {
    const tag = m[0];
    const out = [];
    for (const a of ["href", "src", "data", "poster", "xlink:href"]) { const v = (tag.match(new RegExp(`\\s${a}=["']([^"']*)["']`, "i")) || [])[1]; if (v) out.push([m[1], v]); }
    const ss = (tag.match(/\ssrcset=["']([^"']*)["']/i) || [])[1];
    if (ss) for (const part of ss.split(",")) { const u = part.trim().split(/\s+/)[0]; if (u) out.push([m[1], u]); }
    return out;
  });
  for (const [tag, raw] of refs) {
    const v = raw.trim();
    if (!v || /^(mailto:|tel:|sms:|data:|blob:|javascript:|https?:|\/\/)/i.test(v)) continue;
    if (/^\/(api|\.netlify)\//.test(v)) continue;
    if (tag.toLowerCase() === "link" && /rel=["']?(preconnect|dns-prefetch)/i.test(raw)) continue;
    linkCount++;
    const [pathPart, hash] = v.split("#");
    const [noQuery] = pathPart.split("?");
    const base = page; // pages are folders: relative URLs resolve against /<folder>/
    const target = noQuery === "" ? page : noQuery.startsWith("/") ? noQuery : posix.normalize(posix.join(base, noQuery));
    const file = fileFor(target);
    if (!file) { add(page, `<${tag}> points to ${v}, which does not exist in the built site`); continue; }
    if (hash && /<a$/i.test("<" + tag) && file.endsWith("index.html")) {
      const tp = target.endsWith("/") ? target : target + "/";
      if (pages.includes(tp) && !idsOf(tp).has(decodeURIComponent(hash))) add(page, `link ${v} has no element with id "${hash}" on ${tp}`);
    }
  }
}

// ---- sitemap, canonicals, titles ----
const sitemap = existsSync(join(ROOT, "sitemap.xml")) ? readFileSync(join(ROOT, "sitemap.xml"), "utf8") : "";
if (!sitemap) problems.push("sitemap.xml is missing");
const mapped = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => { try { return new URL(m[1]).pathname; } catch { return m[1]; } });
const noindex = (h) => /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(h);
const titles = new Map();
for (const page of pages) {
  const html = htmlOf(page);
  const canon = (html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i) || [])[0];
  const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1]?.trim();
  if (title) { if (titles.has(title)) add(page, `same <title> as ${titles.get(title)}: "${title.slice(0, 50)}"`); else titles.set(title, page); }
  if (noindex(html)) { if (mapped.includes(page)) add(page, "is marked noindex but is listed in sitemap.xml"); continue; }
  if (!mapped.includes(page)) add(page, "is indexable but missing from sitemap.xml");
  if (!canon) add(page, "has no canonical link");
  else {
    const href = (canon.match(/href=["']([^"']+)/i) || [])[1] || "";
    let path; try { path = new URL(href, "https://x.invalid").pathname; } catch { path = href; }
    if (path !== page) add(page, `canonical points to ${path}, not to itself`);
  }
}
for (const m of mapped) if (!existsSync(join(ROOT, m === "/" ? "index.html" : posix.join(m, "index.html"))) && !fileFor(m)) problems.push(`sitemap.xml lists ${m}, which does not exist`);

// ---- robots.txt ----
const robots = existsSync(join(ROOT, "robots.txt")) ? readFileSync(join(ROOT, "robots.txt"), "utf8") : "";
if (!/^Sitemap:\s*https:\/\//im.test(robots)) problems.push("robots.txt has no Sitemap line");
if (/^Disallow:\s*\/\s*$/im.test(robots)) problems.push("robots.txt blocks the whole site");

console.log(`Checked ${linkCount} internal links and anchors, ${pages.length} pages, ${mapped.length} sitemap entries.`);
if (problems.length) { console.error(problems.map((p) => "FAIL " + p).join("\n")); process.exit(1); }
console.log("ok links, anchors, sitemap, canonicals, titles and robots.txt");
