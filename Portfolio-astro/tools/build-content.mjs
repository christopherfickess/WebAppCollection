// Turns the editable files in public/Photography-Studio/content/*.json into
//   public/Photography-Studio/js/content.generated.js   (what the site reads)
//   netlify/functions/lib/catalog.mjs                  (prices and rules the booking functions trust)
// and checks them first, so a typo in the content editor cannot break the site.
// Runs before every build (npm run content).
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const root = new URL("../public/Photography-Studio/", import.meta.url);
const read = (n) => JSON.parse(readFileSync(new URL(`content/${n}.json`, root), "utf8"));
const errors = [];
const need = (ok, msg) => ok || errors.push(msg);

const site = read("site"), hero = read("hero"), about = read("about"), packages = read("packages"), faq = read("faq"),
  day = read("day"), testimonials = read("testimonials"), printSizes = read("print-sizes"), booking = read("booking"), photoData = read("photos");

const LIGHTS = ["dawn", "day", "dusk", "night"];
const setIds = photoData.sets.map((s) => s.id);
for (const p of photoData.photos) {
  need(setIds.includes(p.set), `photo ${p.file}: unknown set "${p.set}"`);
  need(LIGHTS.includes(p.light), `photo ${p.file}: light must be one of ${LIGHTS.join(", ")}`);
  need(p.title && p.alt, `photo ${p.file}: needs a title and alt text`);
  need(existsSync(new URL(`${p.file}-960.webp`, root)), `photo ${p.file}: image file is missing`);
}
const byName = (n) => photoData.photos.find((p) => p.file === `img/photos/${n}`);
for (const [what, o] of [["hero", hero], ["about", about]]) need(byName(o.image?.photo), `${what}: image "${o.image?.photo}" is not in the photo list`);
for (const p of packages.items) {
  need(p.name && p.price && Array.isArray(p.points), `package "${p.name}": needs name, price, and points`);
  need(Number.isFinite(p.amount) && Number.isFinite(p.deposit) && p.deposit > 0 && p.deposit <= p.amount, `package "${p.name}": deposit must be more than 0 and no more than the price`);
}
for (const d of day.items) need(LIGHTS.includes(d.light), `day "${d.title}": light must be one of ${LIGHTS.join(", ")}`);
for (const s of printSizes.items) need(s.label && s.w > 0 && s.h > 0 && s.price > 0, `print size "${s.label}": needs label, width, height, and price`);
need(Array.isArray(booking.blockedDates) && booking.blockedDates.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)), "booking: blockedDates must be YYYY-MM-DD dates");
need((site.theme?.sky || []).length === 4, "site: theme.sky needs exactly four colour pairs");
for (const t of testimonials.items) need(t.quote && t.name, `testimonial from "${t.name}": needs a quote and a name`);
if (errors.length) {
  console.error("Content problems:\n- " + errors.join("\n- "));
  process.exit(1);
}

const photoOf = (o) => {
  const p = byName(o.photo);
  return { file: p.file, width: p.width, height: p.height, alt: p.alt, ...(o.position ? { position: o.position } : {}) };
};
const out = {
  site, sets: photoData.sets, photos: photoData.photos,
  hero: { ...hero, image: photoOf(hero.image) },
  about: { ...about, image: photoOf(about.image) },
  packages: packages.items, faq: faq.items, testimonials: testimonials.items, day: day.items, printSizes: printSizes.items, booking,
};
writeFileSync(new URL("js/content.generated.js", root), `// Written by tools/build-content.mjs from content/*.json. Do not edit by hand.\nexport default ${JSON.stringify(out, null, 2)};\n`);

const catalog = {
  packages: Object.fromEntries(packages.items.map((p) => [p.name, { amount: p.amount, deposit: p.deposit }])),
  printSizes: Object.fromEntries(printSizes.items.map((s) => [s.label, { price: s.price }])),
  photos: photoData.photos.map((p) => ({ id: p.file.replace("img/photos/", ""), title: p.title })),
  booking,
  business: { name: site.name },
};
writeFileSync(new URL("../../netlify/functions/lib/catalog.mjs", root), `// Written by tools/build-content.mjs from content/*.json. Do not edit by hand.\nexport const catalog = ${JSON.stringify(catalog, null, 2)};\n`);
console.log("content ok:", photoData.photos.length, "photos,", packages.items.length, "packages");
