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
      { label: "Packages", href: "#packages" },
      { label: "Questions", href: "#faq" },
    ],
    cta: { label: "Book a session", href: "#contact" },
    footnote: "A website template by Chris Fickess. The business, prices, and photos are placeholders.",
    links: [
      { label: "LinkedIn", href: "https://www.linkedin.com/in/christopher-fickess-223a17182/" },
      { label: "GitHub", href: "https://github.com/christopherfickess" },
      { label: "More projects", href: "/projects/" },
    ],
  },

  hero: {
    title: "Landscape and wildlife photography, made to hang on your wall",
    text: "Sessions in the places you love, edited with care and delivered in a private gallery you can share.",
    primary: { label: "See the gallery", href: "#gallery" },
    secondary: { label: "Book a session", href: "#contact" },
  },

  about: {
    title: "About Fox & Fern",
    image: photo("mountain-dawn", 1067, "Placeholder landscape: layered mountains at dawn"),
    blocks: [
      { title: "My story", text: "Replace this with two or three sentences about who you are and how you started. Clients hire a photographer they feel they know." },
      { title: "How I work", text: "Say what a session is like: how long it runs, how you direct, and how soon people see their photos." },
    ],
  },

  gallery: [
    { category: "Mountains", title: "Dawn ridge", ...photo("mountain-dawn", 1067, "Placeholder landscape: layered mountains at dawn") },
    { category: "Forest", title: "Pines at first light", ...photo("forest-pines", 2400, "Placeholder landscape: pines in morning light") },
    { category: "Water", title: "Sunset lake", ...photo("lake-sunset", 1067, "Placeholder landscape: a still lake at sunset") },
    { category: "Night", title: "Stars over the treeline", ...photo("night-stars", 1067, "Placeholder landscape: a starry sky over trees") },
    { category: "Mountains", title: "Haze", ...photo("mountain-haze", 1067, "Placeholder landscape: misty blue mountains") },
    { category: "Night", title: "Last light", ...photo("night-ridge", 2400, "Placeholder landscape: a ridge under a purple night sky") },
    { category: "Forest", title: "Morning mist", ...photo("forest-mist", 1067, "Placeholder landscape: forest under mist") },
    { category: "Water", title: "Blue hour", ...photo("lake-blue", 1067, "Placeholder landscape: a blue lake ringed by trees") },
    { category: "Mountains", title: "High peaks", ...photo("mountain-peaks", 2400, "Placeholder landscape: purple peaks at sunset") },
  ],

  packages: [
    { name: "Mini session", price: "$250", detail: "One hour, one location", points: ["15 edited photos", "Private online gallery", "Print release"] },
    { name: "Half day", price: "$600", detail: "Three hours, up to two locations", points: ["40 edited photos", "Private online gallery", "Print release", "One 16 x 20 print"], featured: true },
    { name: "Full day", price: "$1,100", detail: "Eight hours, travel included", points: ["100 edited photos", "Private online gallery", "Print release", "Two 16 x 20 prints"] },
  ],

  steps: [
    { title: "Tell me about it", text: "Send the form below with the place, the date, and what the photos are for." },
    { title: "Pick a package", text: "I reply within two business days with a time and a quote." },
    { title: "The session", text: "We meet at the location at the best light of the day." },
    { title: "Your gallery", text: "Edited photos arrive in a private gallery within two weeks." },
  ],

  faq: [
    { q: "How far will you travel?", a: "Replace with your travel area and any fees." },
    { q: "What if the weather is bad?", a: "We pick a new date at no charge." },
    { q: "How soon do I get my photos?", a: "Within two weeks of the session." },
    { q: "Can I print the photos?", a: "Yes. Every package includes a print release." },
    { q: "How do I book?", a: "Send the form below. I reply within two business days." },
  ],
};
