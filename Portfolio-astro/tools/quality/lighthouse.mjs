// Lighthouse (mobile) for one page of each kind on the three sites (see tools/quality/sites.mjs), served from the built dist/ over HTTP/2 with the real
// security headers. Fails if a score drops under its minimum. Writes lighthouse.json (all sites) for the report artifact.
//   node tools/quality/lighthouse.mjs            (needs `npm run build` first)
import { spawn, execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { SITES } from "./sites.mjs";

const require = createRequire(import.meta.url);
const MIN = { performance: 0.85, accessibility: 0.95, "best-practices": 0.95, seo: 0.95 };
const PORT = process.env.LH_PORT || "4490";
const server = spawn(process.execPath, ["tools/quality/serve.mjs"], { env: { ...process.env, H2: "1", PORT }, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 3000));
const chrome = process.env.CHROME_PATH || require("playwright-core").chromium.executablePath();
const results = {}; let bad = false;
try {
  for (const site of SITES) {
    const floor = { ...MIN, ...(site.minimum || {}) };
    for (const path of site.lighthouse) {
      const url = `https://localhost:${PORT}${path}`;
      const out = `lighthouse-${site.id}.json`;
      execFileSync("npx", ["lighthouse", url, "--chrome-flags=--headless=new --no-sandbox --ignore-certificate-errors", "--only-categories=performance,accessibility,best-practices,seo", "--output=json", `--output-path=${out}`, "--quiet"], { env: { ...process.env, CHROME_PATH: chrome }, stdio: "inherit" });
      const cats = JSON.parse(readFileSync(out, "utf8")).categories;
      rmSync(out);
      const scores = Object.fromEntries(Object.keys(MIN).map((k) => [k, Math.round(cats[k].score * 100)]));
      (results[site.id] ||= {})[path] = scores;
      console.log(`${site.name} ${path}: ${Object.entries(scores).map(([k, v]) => `${k} ${v}${v < floor[k] * 100 ? " (BELOW " + floor[k] * 100 + ")" : ""}`).join(", ")}`);
      if (Object.keys(MIN).some((k) => scores[k] < floor[k] * 100)) bad = true;
    }
  }
} finally { server.kill(); }
writeFileSync("lighthouse.json", JSON.stringify(results, null, 2));
process.exit(bad ? 1 : 0);
