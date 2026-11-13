// The site's content. The words, prices, and photos are edited in
// content/*.json (by hand or in the /admin/ editor); tools/build-content.mjs
// checks them and writes js/content.generated.js, which this file reads.
// Only things that are code, not content, are set here.
import generated from "./content.generated.js";

// The gallery, ordered by collection, then by the light the page moves
// through: Dawn, Day, Dusk, Night.
const LIGHTS = ["dawn", "day", "dusk", "night"];
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const gallery = generated.photos
  .map((p, i) => ({ ...p, i, set: generated.sets.find((s) => s.id === p.set)?.name ?? cap(p.set), category: cap(p.light) }))
  .sort((a, b) => generated.sets.findIndex((s) => s.name === a.set) - generated.sets.findIndex((s) => s.name === b.set) || LIGHTS.indexOf(a.light) - LIGHTS.indexOf(b.light) || a.i - b.i);

export const content = {
  site: {
    // Where the site is served from. Every link and image path is built
    // from this, so moving the site means changing one line.
    base: "/Photography-Studio/",
    ...generated.site,
  },
  hero: generated.hero,
  about: generated.about,
  gallery,
  printSizes: generated.printSizes,
  packages: generated.packages,
  day: generated.day,
  faq: generated.faq,
  testimonials: generated.testimonials,
  booking: generated.booking,
};
