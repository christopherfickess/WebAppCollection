// Accessibility (axe, WCAG 2 A/AA, including colour contrast) for every colour setup a visitor can pick, not just the default:
//   main portfolio: 3 colour presets x light and dark, on all 5 pages
//   all three sites: the browser's light and dark mode, on the front page and one inner page
// Serves the built dist/ with the real security headers. Run after `npm run build`.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { chromium } from "playwright-core";
import { SITES } from "./sites.mjs";

const PORT = process.env.TM_PORT || "4491";
const server = spawn(process.execPath, ["tools/quality/serve.mjs"], { env: { ...process.env, PORT }, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1500));
const axeSource = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ["--no-sandbox"] });

const PRESETS = ["verdant", "ember", "signal"];
const jobs = [];
const portfolio = SITES.find((s) => s.id === "portfolio");
for (const path of portfolio.pages) for (const theme of ["light", "dark"]) for (const preset of PRESETS) jobs.push({ label: `portfolio ${path} ${theme}/${preset}`, path, colorScheme: theme, init: `localStorage.setItem("portfolio-theme-pref","${theme}");localStorage.setItem("portfolio-preset","${preset}");` });
for (const [path, name] of [["/Photography-Studio/", "fox-and-fern"], ["/Photography-Studio/privacy/", "fox-and-fern"], ["/travel-advisor/", "travel-advisor"], ["/travel-advisor/destinations/paris/", "travel-advisor"]]) for (const colorScheme of ["light", "dark"]) jobs.push({ label: `${name} ${path} ${colorScheme} mode`, path, colorScheme });

const failures = [];
try {
  for (const j of jobs) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: j.colorScheme });
    await ctx.route((u) => u.hostname !== "localhost", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
    if (j.init) await ctx.addInitScript(j.init);
    const page = await ctx.newPage();
    await page.goto(`http://localhost:${PORT}${j.path}`, { waitUntil: "networkidle" });
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); } scrollTo(0, 0); });
    await page.waitForTimeout(400);
    await page.evaluate(async () => { await Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().endTime !== Infinity).map((a) => a.finished.catch(() => {}))); });
    await page.evaluate(axeSource);
    const axe = await page.evaluate(() => axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] }));
    for (const v of axe.violations) failures.push(`${j.label}: ${v.id} (${v.impact}), ${v.nodes.length} element(s): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" ; ")}. ${(v.nodes[0].any[0]?.message || "").slice(0, 150)}`);
    await ctx.close();
  }
} finally { await browser.close(); server.kill(); }
console.log(`Checked ${jobs.length} colour setups.`);
if (failures.length) { console.error(failures.map((f) => "FAIL " + f).join("\n")); process.exit(1); }
console.log("ok accessibility holds in every colour preset and in light and dark mode");
