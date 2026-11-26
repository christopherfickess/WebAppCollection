// Proves site-integrity.mjs passes a sound site and fails each problem it is meant to find.
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { SITES, EXTRA_PAGES } from "../quality/sites.mjs";

const pagesAll = [...SITES.flatMap((s) => s.pages || [s.prefix]), ...EXTRA_PAGES];
const head = (p, extra = "") => `<!doctype html><html><head><title>Page ${p}</title><link rel="canonical" href="${p}">${extra}</head><body><a href="/">home</a><h1 id="top">x</h1>`;
const build = ({ pages = {}, sitemap, robots } = {}) => {
  const root = mkdtempSync(join(tmpdir(), "integ-"));
  const put = (p, html) => { mkdirSync(join(root, p), { recursive: true }); writeFileSync(join(root, p, "index.html"), html); };
  for (const p of new Set(["/", ...pagesAll])) put(p, pages[p] ?? head(p) + "</body></html>");
  writeFileSync(join(root, "sitemap.xml"), sitemap ?? `<urlset>${[...new Set(["/", ...pagesAll])].map((p) => `<url><loc>https://x.test${p}</loc></url>`).join("")}</urlset>`);
  writeFileSync(join(root, "robots.txt"), robots ?? "User-agent: *\nAllow: /\nSitemap: https://x.test/sitemap.xml\n");
  return root;
};
const run = (root) => spawnSync(process.execPath, ["tools/tests/site-integrity.mjs"], { env: { ...process.env, SITE_ROOT: root }, encoding: "utf8" });
const first = SITES.find((s) => s.prefix).prefix;

let root = build(); let r = run(root); assert.equal(r.status, 0, r.stderr + r.stdout); rmSync(root, { recursive: true });
console.log("ok a sound site passes");

const bad = {
  "broken link": { pages: { [first]: head(first) + `<a href="/nope/">x</a></body></html>` }, re: /does not exist/ },
  "broken anchor": { pages: { [first]: head(first) + `<a href="/#missing">x</a></body></html>` }, re: /no element with id "missing"/ },
  "broken image": { pages: { [first]: head(first) + `<img src="img/none.png" alt="">` }, re: /does not exist/ },
  "missing canonical": { pages: { [first]: `<!doctype html><title>t ${first}</title><body></body>` }, re: /no canonical/ },
  "wrong canonical": { pages: { [first]: head(first).replace(`href="${first}"`, `href="/other/"`) }, re: /canonical points to/ },
  "duplicate title": { pages: { [first]: head(first).replace(`Page ${first}`, "Page /") }, re: /same <title>/ },
  "page missing from sitemap": { sitemap: `<urlset><url><loc>https://x.test/</loc></url></urlset>`, re: /missing from sitemap/ },
  "sitemap lists a missing page": { sitemap: `<urlset><url><loc>https://x.test/ghost/</loc></url></urlset>`, re: /does not exist|missing from sitemap/ },
  "robots blocks everything": { robots: "User-agent: *\nDisallow: /\nSitemap: https://x.test/sitemap.xml\n", re: /blocks the whole site/ },
  "robots has no sitemap": { robots: "User-agent: *\nAllow: /\n", re: /no Sitemap line/ },
};
for (const [name, c] of Object.entries(bad)) {
  root = build(c); r = run(root);
  assert.equal(r.status, 1, `${name} should fail`); assert.match(r.stderr, c.re, `${name}: ${r.stderr.slice(0, 200)}`);
  rmSync(root, { recursive: true });
}
console.log(`ok the checker fails on ${Object.keys(bad).length} kinds of problem`);
