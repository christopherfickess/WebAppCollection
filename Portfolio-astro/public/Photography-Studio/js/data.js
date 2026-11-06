// All of the site's content lives here. To rebrand it, change this file;
// the components in ./components render whatever is in it.

import { sets, photos } from "./photos.js";

// A photo from js/photos.js by file name, for the hero and About picture.
const pick = (name, position) => {
  const p = photos.find((x) => x.file.endsWith(name));
  return { file: p.file, width: p.width, height: p.height, alt: p.alt, ...(position ? { position } : {}) };
};

// The gallery, ordered by collection, then by the light the page moves
// through: Dawn, Day, Dusk, Night.
const LIGHTS = ["dawn", "day", "dusk", "night"];
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const gallery = photos
  .map((p, i) => ({ ...p, i, set: sets.find((s) => s.id === p.set)?.name ?? cap(p.set), category: cap(p.light) }))
  .sort((a, b) => sets.findIndex((s) => s.name === a.set) - sets.findIndex((s) => s.name === b.set) || LIGHTS.indexOf(a.light) - LIGHTS.indexOf(b.light) || a.i - b.i);

export const content = {
  site: {
    // Where the site is served from. Every link and image path is built
    // from this, so moving the site means changing one line.
    base: "/Photography-Studio/",
    name: "Fox & Fern Photography",
    brand: "Fox & Fern",
    tagline: "Photography",
    nav: [
      { label: "About", href: "#about" },
      { label: "Gallery", href: "#gallery" },
      { label: "Prints", href: "#wall" },
      { label: "Packages", href: "#packages" },
      { label: "Questions", href: "#faq" },
    ],
    cta: { label: "Book a session", href: "#contact" },
    // Where sessions happen. The booking form uses this to work out sunrise,
    // sunset, and golden hour for the date a client picks. Set your own.
    location: { place: "Jackson, Wyoming", lat: 43.4799, lon: -110.7624, timeZone: "America/Denver" },
    footnote: "A website template by Chris Fickess. The business, prices, and photos are placeholders.",
    links: [
      { label: "LinkedIn", href: "https://www.linkedin.com/in/christopher-fickess-223a17182/" },
      { label: "GitHub", href: "https://github.com/christopherfickess" },
      { label: "More projects", href: "/projects/" },
    ],
  },

  hero: {
    image: pick("nature-park-path-and-steel-pole", "50% 60%"),
    title: "Landscape and wildlife photography, made to hang on your wall",
    text: "Sessions in the places you love, edited with care and delivered in a private gallery you can share.",
    primary: { label: "See the gallery", href: "#gallery" },
    secondary: { label: "Book a session", href: "#contact" },
  },

  about: {
    title: "About Fox & Fern",
    lead: "I photograph quiet places at the edge of the day, then print them large enough to live with.",
    image: pick("nature-ficus-roots", "50% 70%"),
    blocks: [
      { title: "My story", text: "Replace this with two or three sentences about who you are and how you started. Clients hire a photographer they feel they know." },
      { title: "How I work", text: "Say what a session is like: how long it runs, how you direct, and how soon people see their photos." },
    ],
  },

  // Built from js/photos.js (add photos there with tools/photos/build-photos.py).
  gallery,

  // Sizes for the "See it on your wall" preview, in inches (width x height
  // for a portrait print; the preview turns them for landscape photos).
  printSizes: [
    { label: "12 x 18 in", w: 12, h: 18 },
    { label: "16 x 20 in", w: 16, h: 20 },
    { label: "24 x 36 in", w: 24, h: 36 },
    { label: "30 x 40 in", w: 30, h: 40 },
  ],

  packages: [
    { name: "Mini session", price: "$250", detail: "One hour, one location", points: ["15 edited photos", "Private online gallery", "Print release"] },
    { name: "Half day", price: "$600", detail: "Three hours, up to two locations", points: ["40 edited photos", "Private online gallery", "Print release", "One 16 x 20 print"], featured: true },
    { name: "Full day", price: "$1,100", detail: "Eight hours, travel included", points: ["100 edited photos", "Private online gallery", "Print release", "Two 16 x 20 prints"] },
  ],

  // A session follows the light, so the timeline does too.
  day: [
    { light: "dawn", title: "Before sunrise", text: "We meet at the location while it is still dark and walk in together." },
    { light: "day", title: "Mid-morning", text: "Softer, brighter light for details, wildlife, and a break for coffee." },
    { light: "dusk", title: "Golden hour", text: "The main event: low, warm light, which is why sessions are booked around it." },
    { light: "night", title: "After dark", text: "Optional: stars and long exposures when the sky is clear." },
    { light: "dawn", title: "Within two weeks", text: "Edited photos arrive in a private online gallery." },
  ],

  faq: [
    { q: "How far will you travel?", a: "Replace with your travel area and any fees." },
    { q: "What if the weather is bad?", a: "We pick a new date at no charge." },
    { q: "How soon do I get my photos?", a: "Within two weeks of the session." },
    { q: "Can I print the photos?", a: "Yes. Every package includes a print release." },
    { q: "How do I book?", a: "Send the form below. I reply within two business days." },
  ],
};
