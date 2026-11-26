// Names must say what the value is. In the Netlify functions (payments, bookings, email) a one- or two-letter variable
// or parameter makes the money and state logic hard to review, so new ones fail this test.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ALLOWED = new Set(["i", "id", "ip", "to", "ok"]); // a loop counter and four names that are already clear in context
const dir = new URL("../../netlify/functions/", import.meta.url).pathname;
const files = [...readdirSync(dir).filter((f) => f.endsWith(".mjs")).map((f) => join(dir, f)), ...readdirSync(join(dir, "lib")).filter((f) => f.endsWith(".mjs")).map((f) => join(dir, "lib", f))];
const short = "[A-Za-z_$][\\w$]?";
const patterns = [
  new RegExp(`\\b(?:const|let|var)\\s+(${short})\\b\\s*(?:=|;|,)`, "g"),                 // const k = ...
  new RegExp(`\\b(?:const|let|var)\\s+\\[([^\\]]*)\\]`, "g"),                             // const [a, b] = ...
  new RegExp(`\\(\\s*(${short})\\s*\\)\\s*=>`, "g"),                                       // (x) =>
  new RegExp(`\\b(${short})\\s*=>`, "g"),                                                  // x =>
  new RegExp(`\\(\\s*(${short}(?:\\s*,\\s*${short})+)\\s*\\)\\s*=>`, "g"),                // (a, b) =>
  new RegExp(`catch\\s*\\(\\s*(${short})\\s*\\)`, "g"),                                    // catch (e)
];
const found = [];
for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((text, n) => {
    const code = text.replace(/\/\/.*$/, "").replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '""');
    for (const re of patterns) for (const m of code.matchAll(re)) for (const name of m[1].split(/[\s,]+/).map((x) => x.replace(/=.*/, "")).filter((x) => /^[A-Za-z_$][\w$]*$/.test(x))) if (name.length <= 2 && !ALLOWED.has(name)) found.push(`${file.split("netlify/")[1]}:${n + 1} "${name}"`);
  });
}
assert.deepEqual(found, [], "use a name that says what the value is:\n  " + found.join("\n  "));
console.log("ok netlify functions: no one- or two-letter names beyond i, id, ip, to, ok");
