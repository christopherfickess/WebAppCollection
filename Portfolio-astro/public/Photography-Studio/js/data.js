// All of the site's content lives here. To rebrand it, change this file;
// the components in ./components render whatever is in it.

const photo = (name, h, alt) => ({ file: `img/photos/${name}`, width: 1600, height: h, alt });

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
    image: photo("mountain-dawn", 1067, "Placeholder landscape: layered mountains at dawn"),
    title: "Landscape and wildlife photography, made to hang on your wall",
    text: "Sessions in the places you love, edited with care and delivered in a private gallery you can share.",
    primary: { label: "See the gallery", href: "#gallery" },
    secondary: { label: "Book a session", href: "#contact" },
  },

  about: {
    title: "About Fox & Fern",
    lead: "I photograph quiet places at the edge of the day, then print them large enough to live with.",
    image: photo("forest-mist", 1067, "Placeholder landscape: forest under mist"),
    blocks: [
      { title: "My story", text: "Replace this with two or three sentences about who you are and how you started. Clients hire a photographer they feel they know." },
      { title: "How I work", text: "Say what a session is like: how long it runs, how you direct, and how soon people see their photos." },
    ],
  },

  // Photos are grouped by the light they were made in, in the order the
  // page moves through it: Dawn, Day, Dusk, Night.
  gallery: [
    { category: "Dawn", title: "Dawn ridge", ...photo("mountain-dawn", 1067, "Placeholder landscape: layered mountains at dawn") },
    { category: "Dawn", title: "Morning mist", ...photo("forest-mist", 1067, "Placeholder landscape: forest under mist") },
    { category: "Day", title: "Haze", ...photo("mountain-haze", 1067, "Placeholder landscape: misty blue mountains") },
    { category: "Day", title: "Pines", ...photo("forest-pines", 2400, "Placeholder landscape: pines under a bright sky") },
    { category: "Day", title: "Blue lake", ...photo("lake-blue", 1067, "Placeholder landscape: a blue lake ringed by trees") },
    { category: "Dusk", title: "Sunset lake", ...photo("lake-sunset", 1067, "Placeholder landscape: a still lake at sunset") },
    { category: "Dusk", title: "High peaks", ...photo("mountain-peaks", 2400, "Placeholder landscape: purple peaks at sunset") },
    { category: "Night", title: "Stars over the treeline", ...photo("night-stars", 1067, "Placeholder landscape: a starry sky over trees") },
    { category: "Night", title: "Last light", ...photo("night-ridge", 2400, "Placeholder landscape: a ridge under a purple night sky") },
  ],

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
