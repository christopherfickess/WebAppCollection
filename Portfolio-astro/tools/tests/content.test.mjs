// Content and editor checks: tools/build-content.mjs must accept the real content and reject each kind of bad edit
// (so a typo in the content editor cannot break the site), and the editor config must match the content files.
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, symlinkSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import yaml from "js-yaml";

const SRC = new URL("../../", import.meta.url).pathname;
const ok = (m) => console.log("ok " + m);

// Build a throwaway copy: the script, the content, the photos (linked, not copied) and an output folder.
function sandbox(edit) {
  const d = mkdtempSync(join(tmpdir(), "content-"));
  mkdirSync(join(d, "tools")); mkdirSync(join(d, "netlify/functions/lib"), { recursive: true });
  const ps = join(d, "public/Photography-Studio"); mkdirSync(join(ps, "js"), { recursive: true });
  cpSync(join(SRC, "tools/build-content.mjs"), join(d, "tools/build-content.mjs"));
  cpSync(join(SRC, "public/Photography-Studio/content"), join(ps, "content"), { recursive: true });
  symlinkSync(join(SRC, "public/Photography-Studio/img"), join(ps, "img"));
  const file = (n) => join(ps, "content", n + ".json");
  const get = (n) => JSON.parse(readFileSync(file(n), "utf8"));
  const set = (n, v) => writeFileSync(file(n), typeof v === "string" ? v : JSON.stringify(v));
  edit?.({ get, set });
  const r = spawnSync(process.execPath, [join(d, "tools/build-content.mjs")], { encoding: "utf8" });
  const generated = existsSync(join(ps, "js/content.generated.js"));
  rmSync(d, { recursive: true, force: true });
  return { code: r.status, out: (r.stdout || "") + (r.stderr || ""), generated };
}

const good = sandbox();
assert.equal(good.code, 0, good.out); assert.ok(good.generated, "good content produces the generated files"); ok("the real content builds");

const bad = [
  ["a photo in a set that does not exist", ({ get, set }) => { const p = get("photos"); p.photos[0].set = "nope"; set("photos", p); }, /unknown set/],
  ["a photo with an invalid light", ({ get, set }) => { const p = get("photos"); p.photos[0].light = "twilight"; set("photos", p); }, /light must be one of/],
  ["a photo without alt text", ({ get, set }) => { const p = get("photos"); p.photos[0].alt = ""; set("photos", p); }, /alt text/],
  ["a photo whose image file is missing", ({ get, set }) => { const p = get("photos"); p.photos[0].file = "img/photos/does-not-exist"; set("photos", p); }, /image file is missing/],
  ["a hero that points at a missing photo", ({ get, set }) => { const h = get("hero"); h.image.photo = "missing"; set("hero", h); }, /hero: image/],
  ["a package whose deposit is more than its price", ({ get, set }) => { const p = get("packages"); p.items[0].deposit = p.items[0].amount + 1; set("packages", p); }, /deposit must be/],
  ["a package with a zero deposit", ({ get, set }) => { const p = get("packages"); p.items[0].deposit = 0; set("packages", p); }, /deposit must be/],
  ["a package whose price is text", ({ get, set }) => { const p = get("packages"); p.items[0].amount = "600"; set("packages", p); }, /deposit must be/],
  ["a print size with no price", ({ get, set }) => { const p = get("print-sizes"); p.items[0].price = 0; set("print-sizes", p); }, /print size/],
  ["a blocked date in the wrong format", ({ get, set }) => { const b = get("booking"); b.blockedDates = ["12/25/2026"]; set("booking", b); }, /blockedDates/],
  ["booking slots that are not text", ({ get, set }) => { const b = get("booking"); b.slots = [1, 2]; set("booking", b); }, /slots/],
  ["a sky theme with three stages", ({ get, set }) => { const s = get("site"); s.theme.sky = s.theme.sky.slice(0, 3); set("site", s); }, /theme\.sky/],
  ["a sky colour out of range", ({ get, set }) => { const s = get("site"); s.theme.sky[0].a = [300, 0, 0]; set("site", s); }, /theme\.sky/],
  ["a testimonial without a name", ({ get, set }) => { const t = get("testimonials"); t.items = [{ quote: "Lovely", name: "" }]; set("testimonials", t); }, /testimonial/],
  ["a day section with an invalid light", ({ get, set }) => { const d = get("day"); d.items[0].light = "noon"; set("day", d); }, /day "/],
];
for (const [name, edit, want] of bad) {
  const r = sandbox(edit);
  assert.equal(r.code, 1, `${name}: should be refused (exit ${r.code})`);
  assert.match(r.out, want, `${name}: ${r.out.slice(0, 160)}`);
  assert.ok(!r.generated, `${name}: nothing is generated from bad content`);
}
ok(`${bad.length} kinds of bad edit are refused and generate nothing`);

const broken = sandbox(({ set }) => set("faq", "{ this is not json"));
assert.notEqual(broken.code, 0); ok("a content file that is not valid JSON stops the build");
const missing = sandbox(({ set }) => set("hero", "{}"));
assert.notEqual(missing.code, 0); ok("an empty hero file stops the build");

// ---- editor config (Decap) matches the content on disk ----
const cfg = yaml.load(readFileSync(join(SRC, "public/Photography-Studio/admin/config.yml"), "utf8"));
assert.equal(cfg.backend.name, "github"); assert.equal(cfg.publish_mode, "editorial_workflow", "edits go through review");
const files = cfg.collections.flatMap((c) => c.files || []);
const names = new Set();
for (const f of files) {
  assert.ok(!names.has(f.name), `duplicate editor entry ${f.name}`); names.add(f.name);
  const rel = f.file.replace(/^Portfolio-astro\//, "");
  assert.ok(existsSync(join(SRC, rel)), `the editor points at a file that does not exist: ${f.file}`);
  assert.ok(Array.isArray(f.fields) && f.fields.length, `${f.name} has no fields`);
  const walk = (fs) => { for (const x of fs) { assert.ok(x.name && x.widget, `${f.name}: a field has no name or widget`); if (x.fields) walk(x.fields); } };
  walk(f.fields);
}
const onDisk = readdirSync(join(SRC, "public/Photography-Studio/content")).map((n) => n.replace(/\.json$/, ""));
for (const n of onDisk) assert.ok(files.some((f) => f.file.endsWith(`/content/${n}.json`)), `content/${n}.json can't be edited in the editor`);
assert.match(cfg.media_folder, /Photography-Studio\/img\/uploads/);
ok(`editor config: ${files.length} entries, every file exists, every content file is editable, unique names`);
