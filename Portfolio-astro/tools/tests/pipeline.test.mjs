// The pipeline itself: workflows point at scripts that exist, every test file really runs in CI, and every pipeline
// script either has a test or an honest entry in coverage-gaps.json saying what is not covered.
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));          // Portfolio-astro/
const WORKFLOWS = join(ROOT, "..", ".github", "workflows");
const ok = (m) => console.log("ok " + m);
const read = (...p) => readFileSync(join(ROOT, ...p), "utf8");
const workflows = readdirSync(WORKFLOWS).filter((f) => /\.ya?ml$/.test(f)).map((f) => ({ f, text: readFileSync(join(WORKFLOWS, f), "utf8") }));
const pkg = JSON.parse(read("package.json"));

// 1. every script a workflow runs exists
for (const { f, text } of workflows) {
  for (const m of text.matchAll(/node (tools\/[\w./-]+\.mjs)/g)) assert.ok(existsSync(join(ROOT, m[1])), `${f} runs ${m[1]}, which does not exist`);
}
ok("workflows only run scripts that exist");

// 2. every *.test.mjs is part of `npm test`, so a new test cannot be written and then never run
const tests = readdirSync(join(ROOT, "tools", "tests")).filter((f) => f.endsWith(".test.mjs"));
for (const t of tests) assert.ok(pkg.scripts.test.includes(`tools/tests/${t}`), `${t} is not in the "test" script, so CI never runs it`);
ok("every unit test file runs in npm test");

// 3. CI actually runs the unit tests and the browser booking test on every push and pull request
const quality = workflows.find((w) => w.f === "quality.yml").text;
assert.match(quality, /^\s*push:/m); assert.match(quality, /^\s*pull_request:/m);
assert.match(quality, /npm test/, "quality.yml must run the unit tests");
assert.match(quality, /npm run test:e2e/, "quality.yml must run the end-to-end booking test");
const verify = workflows.find((w) => w.f === "verify-deploy.yml").text;
assert.match(verify, /^\s*push:/m); assert.match(verify, /^\s*pull_request:/m);
ok("CI runs unit tests and the e2e test on push and pull request");

// 4. every pipeline script has a test, or a stated gap
const gaps = JSON.parse(read("tools", "tests", "coverage-gaps.json"));
const testText = readdirSync(join(ROOT, "tools", "tests")).filter((f) => f.endsWith(".mjs")).map((f) => read("tools", "tests", f)).join("\n");
for (const s of readdirSync(join(ROOT, "tools")).filter((f) => f.endsWith(".mjs"))) {
  const key = `tools/${s}`;
  if (testText.includes(s)) continue;
  assert.ok(gaps[key]?.how && gaps[key]?.gap, `${key} has no test and no entry in tools/tests/coverage-gaps.json`);
}
for (const k of Object.keys(gaps).filter((k) => !k.startsWith("_"))) assert.ok(existsSync(join(ROOT, k)), `coverage-gaps.json lists ${k}, which no longer exists`);
ok("every pipeline script is tested or has a stated gap");
