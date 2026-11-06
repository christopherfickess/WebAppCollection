// Template showcase: a live preview in a phone / tablet / desktop frame, plus
// what each template includes. Edit the list below to add or change templates.
// (No inline styles anywhere: sizes are set through the CSSOM because of the CSP.)
const TEMPLATES = [
  {
    id: "photography",
    name: "Photography studio",
    href: "/Photography-Studio/",
    summary: "A dark, photo-led site that follows the light of the day as you scroll. Built for photographers and visual artists.",
    includes: ["Gallery with collections and time-of-day filters", "Lightbox viewer", "Package pricing and FAQ", "Booking form with confirmation page", "Privacy and terms pages (template text)", "Search and share-preview setup", "Calm mode for visitors who prefer no motion"],
    addons: [
      { name: "See it on your wall (print preview)", price: "$150" },
      { name: "Best light on the booking date", price: "$100" },
      { name: "Content editor for non-technical clients", price: "$400" },
      { name: "Booking calendar with deposits and email confirmations", price: "$900" },
      { name: "Print shop with checkout", price: "$600" },
      { name: "Private visitor counts (no cookies)", price: "$150" },
    ],
  },
  {
    id: "travel",
    name: "Travel advisor",
    href: "/travel-advisor/",
    summary: "A guide-style site for a travel planner: destination guides, a best-month picker, field notes, and trip enquiries.",
    includes: ["Destination guide pages", "Best-month picker", "Field notes (blog)", "Travel essentials page", "Share previews for every page", "Testimonials slot (shows only real quotes)"],
    addons: [
      { name: "Extra destination guides (each)", price: "$75" },
      { name: "Trip enquiry form with email alerts", price: "$200" },
      { name: "Content editor for non-technical clients", price: "$400" },
    ],
  },
];
const base = { setup: "$1,200", care: "$60 / month" };

const $ = (s) => document.querySelector(s);
const picker = $(".picker");
const frame = $(".frame");
const wrap = $(".frame-wrap");
const detail = $(".detail");
const open = $(".open");
let current = TEMPLATES[0];
let width = 1280;

const fit = () => {
  const avail = wrap.clientWidth - 24;
  const k = Math.min(1, avail / width);
  frame.style.width = `${width}px`;
  frame.style.height = `${Math.round(760)}px`;
  frame.style.transform = `scale(${k})`;
  frame.style.marginBottom = `${Math.round(760 * (k - 1))}px`;
  frame.style.marginRight = `${Math.round(width * (k - 1))}px`;
};

const el = (tag, text, cls) => Object.assign(document.createElement(tag), { textContent: text ?? "", className: cls ?? "" });

const show = (t) => {
  current = t;
  picker.querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.id === t.id)));
  frame.src = t.href;
  open.href = t.href;
  detail.replaceChildren();
  const a = document.createElement("div");
  a.append(el("h2", t.name), el("p", t.summary), el("h3", "What is included"));
  const ul = document.createElement("ul");
  t.includes.forEach((i) => ul.append(el("li", i)));
  a.append(ul);
  const b = document.createElement("div");
  b.append(el("h2", "Pricing"));
  const row = (n, p) => { const d = el("div", "", "price"); d.append(el("span", n), el("span", p)); return d; };
  b.append(row("Setup and launch", base.setup), row("Care plan (updates, hosting help)", base.care), el("h3", "Add-ons"));
  t.addons.forEach((x) => b.append(row(x.name, x.price)));
  detail.append(a, b);
};

TEMPLATES.forEach((t) => {
  const b = el("button", t.name);
  b.type = "button";
  b.dataset.id = t.id;
  b.setAttribute("role", "tab");
  b.addEventListener("click", () => show(t));
  picker.append(b);
});
document.querySelectorAll(".devices button").forEach((b) =>
  b.addEventListener("click", () => {
    width = Number(b.dataset.w);
    document.querySelectorAll(".devices button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    fit();
  })
);
addEventListener("resize", fit);
show(TEMPLATES[0]);
fit();
