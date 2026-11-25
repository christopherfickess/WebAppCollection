// Proves the built-site scanner (site-security.mjs) passes clean pages and fails each kind of problem it looks for.
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { SITES, EXTRA_PAGES } from "../quality/sites.mjs";

const clean = `<!doctype html><title>t</title><a href="https://example.com" target="_blank" rel="noopener">x</a><script src="/a.js"></script><script type="application/ld+json">{"a":1}</script>`;
const build = (extra = {}) => {
  const root = mkdtempSync(join(tmpdir(), "site-"));
  const put = (p, html) => { mkdirSync(join(root, p), { recursive: true }); writeFileSync(join(root, p, "index.html"), html); };
  put("", clean);
  for (const p of EXTRA_PAGES) put(p, clean);
  for (const s of SITES) for (const p of s.pages || [s.prefix]) put(p, extra[p] || clean);
  return root;
};
const run = (root) => spawnSync(process.execPath, ["tools/tests/site-security.mjs"], { env: { ...process.env, SITE_ROOT: root }, encoding: "utf8" });

let root = build();
let r = run(root); assert.equal(r.status, 0, r.stderr); rmSync(root, { recursive: true });
console.log("ok clean pages from all three sites pass");

const bad = {
  "inline script": `<script>alert(1)</script>`,
  "inline handler": `<button onclick="x()">x</button>`,
  "javascript link": `<a href="javascript:void(0)">x</a>`,
  "plain http": `<img src="http://example.com/a.png">`,
  "new tab without noopener": `<a href="https://example.com" target="_blank">x</a>`,
  "cross-site form": `<form action="https://evil.example/post"></form>`,
  "remote script": `<script src="https://cdn.example/x.js"></script>`,
  "secret in page": `<p>re_${"a".repeat(26)}</p>`,
};
for (const [name, html] of Object.entries(bad)) {
  root = build({ "/travel-advisor/": clean + html });
  r = run(root);
  assert.equal(r.status, 1, `${name} should fail`);
  assert.match(r.stderr, /FAIL \/travel-advisor\//, `${name} is attributed to the page`);
  rmSync(root, { recursive: true });
}
console.log(`ok scanner fails on ${Object.keys(bad).length} kinds of problem`);
