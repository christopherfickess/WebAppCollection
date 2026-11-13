// Quality report for the template sites. For each page it checks, in a real
// browser behind the site's own security headers (public/_headers):
//   console errors and CSP violations, broken images, sideways scrolling at
//   phone / tablet / desktop widths, accessibility (axe-core), and page weight.
// Writes quality-report.md and exits 1 if anything fails.
//
//   node tools/quality/check.mjs            (set CHROME_PATH to use an installed Chrome)
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join, extname, resolve } from "node:path";
import { chromium } from "playwright-core";

const ROOT = resolve("public");
const PORT = 4488;
const PAGES = (process.env.PAGES || "/Photography-Studio/,/Photography-Studio/privacy/,/Photography-Studio/terms/,/Photography-Studio/thanks/,/travel-advisor/,/showcase/").split(",");
const WIDTHS = [390, 820, 1440];
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2", ".json": "application/json", ".xml": "application/xml", ".txt": "text/plain" };

// Use the same headers Netlify will send (the /* block of public/_headers).
const headers = {};
let inAll = false;
for (const line of readFileSync(join(ROOT, "_headers"), "utf8").split("\n")) {
  if (/^\/\*\s*$/.test(line)) inAll = true;
  else if (/^\S/.test(line) && !line.startsWith("#")) inAll = false;
  else if (inAll && /^\s+\S+:/.test(line)) {
    const i = line.indexOf(":");
    headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
}

const server = createServer((req, res) => {
  // The page's optional /api calls get quiet mock answers (no server functions here).
  if (req.url.startsWith("/api/")) {
    const body = req.url.startsWith("/api/availability") ? JSON.stringify({ configured: true, payments: false, minLeadDays: 7, closedWeekdays: [], unavailable: [], depositNote: "" }) : "";
    res.writeHead(body ? 200 : 204, { ...headers, "Content-Type": "application/json" }).end(body);
    return;
  }
  let p = decodeURIComponent(req.url.split("?")[0]);
  let f = join(ROOT, p);
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
  if (!f.startsWith(ROOT) || !existsSync(f)) { res.writeHead(404, headers).end("not found"); return; }
  res.writeHead(200, { ...headers, "Content-Type": TYPES[extname(f)] || "application/octet-stream" });
  res.end(readFileSync(f));
}).listen(PORT);

const axeSource = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ["--no-sandbox"] });
const rows = [];
let failed = false;

for (const path of PAGES) {
  const row = { path, problems: [], notes: [] };
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    let bytes = 0;
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("response", async (r) => { try { bytes += (await r.body()).length; } catch {} });
    const res = await page.goto(`http://localhost:${PORT}${path}`, { waitUntil: "networkidle" }).catch(() => null);
    if (!res || res.status() >= 400) { row.problems.push(`${width}px: page did not load`); await ctx.close(); continue; }
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } scrollTo(0, 0); });
    await page.waitForTimeout(500);
    // Scroll-in fades take over a second; audit the finished page, not a frame mid-fade.
    await page.evaluate(async () => { await Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().endTime !== Infinity).map((a) => a.finished.catch(() => {}))); });
    await page.waitForTimeout(200);
    const m = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      broken: [...document.images].filter((i) => i.getAttribute("src") && i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.outerHTML.slice(0, 80)),
      noAlt: [...document.images].filter((i) => !i.hasAttribute("alt")).length,
      title: document.title,
      desc: document.querySelector('meta[name="description"]')?.content || "",
      h1: document.querySelectorAll("h1").length,
    }));
    if (errors.length) row.problems.push(`${width}px: console errors: ${errors.slice(0, 2).join(" | ")}`);
    if (m.overflow) row.problems.push(`${width}px: page scrolls sideways`);
    if (m.broken.length) row.problems.push(`${width}px: broken images: ${m.broken.slice(0, 3).join(", ")}`);
    if (m.noAlt) row.problems.push(`${width}px: ${m.noAlt} images with no alt attribute`);
    if (width === 1440) {
      if (!m.title) row.problems.push("no <title>");
      if (!m.desc) row.problems.push("no meta description");
      if (m.h1 !== 1) row.problems.push(`${m.h1} <h1> elements (want 1)`);
      row.notes.push(`${(bytes / 1024).toFixed(0)} KB loaded`);
      await page.evaluate(axeSource);
      const axe = await page.evaluate(() => axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] }));
      for (const v of axe.violations) row.problems.push(`accessibility (${v.impact}): ${v.id}, ${v.nodes.length} element(s). ${v.help}. First: ${v.nodes[0].target.join(" ")} ${(v.nodes[0].any[0]?.message || "").slice(0, 160)}`);
      row.notes.push(`${axe.passes.length} accessibility checks passed`);
    }
    await ctx.close();
  }
  if (row.problems.length) failed = true;
  rows.push(row);
}

await browser.close();
server.close();
const out = [`# Quality report`, ``, `Checked ${new Date().toISOString().slice(0, 10)} at widths ${WIDTHS.join(", ")} px, behind the site's real security headers.`, ``,
  ...rows.flatMap((r) => [`## ${r.path}  ${r.problems.length ? "FAIL" : "PASS"}`, ...(r.problems.length ? r.problems.map((p) => `- ${p}`) : ["- No problems found."]), `- ${r.notes.join("; ")}`, ``])];
writeFileSync("quality-report.md", out.join("\n"));
console.log(out.join("\n"));
process.exit(failed ? 1 : 0);
