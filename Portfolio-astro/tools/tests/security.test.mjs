// Security checks that need no browser and no build: the headers every page is sent with, secrets in the repo, and the
// workflows themselves. (The built pages are scanned by tools/tests/site-security.mjs after `npm run build`.)
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { findSecrets, SECRET_PATTERNS } from "../lib/secrets.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));        // Portfolio-astro/
const REPO = join(ROOT, "..");
const ok = (m) => console.log("ok " + m);

// ---- 1. headers sent with every page ----
const blocks = {};
let cur = null;
for (const line of readFileSync(join(ROOT, "public", "_headers"), "utf8").split("\n")) {
  if (/^\S/.test(line) && !line.startsWith("#")) { cur = line.trim(); blocks[cur] = {}; }
  else if (cur && /^\s+\S+:/.test(line)) { const i = line.indexOf(":"); blocks[cur][line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim(); }
}
const all = blocks["/*"];
assert.ok(all, "_headers has a /* block");
assert.match(all["x-content-type-options"], /nosniff/);
assert.match(all["x-frame-options"], /SAMEORIGIN|DENY/);
assert.match(all["referrer-policy"], /strict-origin|no-referrer|same-origin/);
const hsts = Number((all["strict-transport-security"].match(/max-age=(\d+)/) || [])[1]);
assert.ok(hsts >= 15552000, "HSTS lasts at least 180 days");
assert.match(all["permissions-policy"], /camera=\(\)/); assert.match(all["permissions-policy"], /microphone=\(\)/);
const csp = Object.fromEntries(all["content-security-policy"].split(";").map((d) => d.trim()).filter(Boolean).map((d) => { const [k, ...v] = d.split(/\s+/); return [k, v]; }));
assert.deepEqual(csp["default-src"], ["'self'"], "default-src is self only");
for (const d of ["script-src", "style-src"]) { assert.ok(csp[d], `${d} is set`); assert.ok(!csp[d].some((s) => /unsafe-inline|unsafe-eval|\*|^https?:$/.test(s)), `${d} on every page allows no inline code, eval or wildcards`); }
assert.ok(csp["base-uri"]?.includes("'self'") && csp["form-action"]?.includes("'self'") && csp["frame-ancestors"]?.includes("'self'"), "base-uri, form-action and frame-ancestors are limited to this site");
for (const [d, vals] of Object.entries(csp)) assert.ok(!vals.some((v) => v === "*" || v === "http:"), `${d} has no wildcard or plain http`);
// Only the content editor may loosen the policy, and only under its own path.
const loose = Object.entries(blocks).filter(([k, v]) => /unsafe-/.test(v["content-security-policy"] || ""));
assert.deepEqual(loose.map(([k]) => k), ["/Photography-Studio/admin/*"], "unsafe-inline / unsafe-eval appear only on the editor path");
ok("headers: nosniff, framing, HSTS, strict CSP on every page, editor the only exception");

// ---- 2. no secrets in tracked files ----
const files = execFileSync("git", ["ls-files", "-z"], { cwd: REPO, encoding: "utf8" }).split("\0").filter(Boolean);
const found = [];
for (const f of files) {
  if (/\.(png|jpe?g|webp|gif|ico|woff2?|pdf|zip|mp4)$/i.test(f)) continue;
  const p = join(REPO, f);
  if (!existsSync(p)) continue;
  const text = readFileSync(p, "utf8");
  if (f.endsWith("tools/lib/secrets.mjs")) continue;
  for (const name of findSecrets(text)) found.push(`${f}: ${name}`);
}
assert.deepEqual(found, [], "secrets found in tracked files:\n" + found.join("\n"));
ok(`no keys or tokens in ${files.length} tracked files`);
// the scanner itself still catches what it should
assert.ok(findSecrets("x = 'sk_live_" + "a".repeat(24) + "'").length && findSecrets("-----BEGIN " + "PRIVATE KEY-----").length && findSecrets("ghp_" + "a".repeat(36)).length && findSecrets("re_" + "b".repeat(26)).length);
assert.deepEqual(findSecrets("sk_test"), [], "short placeholder values are not flagged");
assert.ok(SECRET_PATTERNS.length >= 10);
ok("secret scanner catches sample keys and ignores placeholders");

// ---- 3. no .env or key files committed ----
const risky = files.filter((f) => /(^|\/)\.env(\.|$)|\.pem$|\.p12$|id_rsa|\.keystore$/.test(f) && !/\.example$|\.sample$/.test(f));
assert.deepEqual(risky, [], "no env or key files are committed");
ok("no .env or key files committed");

// ---- 4. workflows: least privilege, no untrusted input in shell, no pull_request_target ----
const WF = join(REPO, ".github", "workflows");
for (const f of readdirSync(WF).filter((x) => /\.ya?ml$/.test(x))) {
  const t = readFileSync(join(WF, f), "utf8");
  assert.match(t, /^permissions:/m, `${f} sets top-level permissions (least privilege)`);
  assert.ok(!/pull_request_target/.test(t), `${f} does not use pull_request_target`);
  for (const m of t.matchAll(/^\s*run:\s*(.+)$/gm)) assert.ok(!/\$\{\{\s*github\.(event\.(pull_request\.(title|body|head\.ref)|issue\.(title|body)|comment\.body|head_commit\.message)|head_ref)/.test(m[1]), `${f}: attacker-controlled text is not put straight into a shell command`);
}
ok("workflows: top-level permissions, no pull_request_target, no injected shell input");
