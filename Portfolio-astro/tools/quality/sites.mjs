// The three sites worked on in this repo, for the quality, security and review checks.
// Until they move to separate repos, every check that loops over "the sites" reads this list, and
// tools/tests/pipeline.test.mjs fails if a site here has no pages or a site folder is left out.
import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

export const SITES = [
  { id: "portfolio", name: "Main portfolio", pages: ["/", "/projects/", "/contact/", "/observability/", "/resume/"], lighthouse: "/", minimum: { performance: 0.8 } }, // measured 86-87 locally; the lower floor leaves room for slower CI machines
  { id: "fox-and-fern", name: "Fox & Fern photography studio", prefix: "/Photography-Studio/", skip: ["/Photography-Studio/admin/"], lighthouse: "/Photography-Studio/" },
  { id: "travel-advisor", name: "Gredin Travel Advisor", prefix: "/travel-advisor/", lighthouse: "/travel-advisor/" },
];
// Not one of the three, but it ships on the same site and has always been checked.
export const EXTRA_PAGES = ["/showcase/"];

// Every built page (a folder with index.html) under a prefix, as URL paths like /travel-advisor/packing/
function pagesUnder(root, prefix, skip = []) {
  const out = [];
  const walk = (rel) => {
    const dir = join(root, rel);
    if (existsSync(join(dir, "index.html"))) out.push(`/${rel ? rel + "/" : ""}`);
    for (const e of readdirSync(dir)) if (statSync(join(dir, e)).isDirectory() && e !== "_astro") walk(rel ? `${rel}/${e}` : e);
  };
  walk(prefix.replace(/^\/|\/$/g, ""));
  return out.filter((p) => !skip.includes(p)).sort();
}

// Pages of one site that exist in the built output (root is dist/ in CI).
export const pagesOf = (site, root) => (site.pages ? site.pages : pagesUnder(root, site.prefix, site.skip));
export const allPages = (root) => [...SITES.flatMap((s) => pagesOf(s, root)), ...EXTRA_PAGES];
