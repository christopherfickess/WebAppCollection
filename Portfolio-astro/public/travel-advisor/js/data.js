// All of the template's content lives here. Edit this file to rebrand
// or change trips; the components in ./components render whatever is here.

export const content = {
  site: {
    name: "Gredin Travel Advisor",
    brand: "Gredin",
    tagline: "Travel Advisor",
    nav: [
      { label: "How it works", href: "#how" },
      { label: "Sample trips", href: "#trips" },
      { label: "What's included", href: "#included" },
    ],
    cta: { label: "Book a call", href: "#contact" },
    footnote: "A design template by Chris Fickess. The trips and business are placeholders.",
    links: [
      { label: "LinkedIn", href: "https://www.linkedin.com/in/christopher-fickess-223a17182/", external: true },
      { label: "GitHub", href: "https://github.com/christopherfickess", external: true },
      { label: "More projects", href: "/projects/" },
    ],
  },

  itinerary: {
    title: "Iceland in 8 days",
    label: "A sample plan",
    footnote: "Every trip starts as a draft like this. You change it until it fits.",
    stops: [
      { days: "Day 1", place: "Reykjavík", note: "Land, settle in, harbour dinner" },
      { days: "Days 2–3", place: "Golden Circle", note: "Þingvellir, Geysir, Gullfoss, a farm stay" },
      { days: "Days 4–5", place: "South coast", note: "Waterfalls, black-sand beaches, glacier walk" },
      { days: "Days 6–7", place: "Snæfellsnes", note: "Kirkjufell at sunrise, fishing villages" },
      { days: "Day 8", place: "Fly home", note: "Lagoon stop on the way to the airport" },
    ],
  },

  steps: [
    { title: "Planning call", text: "Thirty minutes on where, when, budget, and pace: how early you like to start and how much you want to see." },
    { title: "Draft itinerary", text: "Within a week you get a day-by-day plan with stays, drive times, and reservations to make. Revise it as often as you need." },
    { title: "Bookings", text: "Flights, hotels, transfers, and tours get booked and confirmed, with every confirmation in one shared document." },
    { title: "While you're away", text: "One contact for delays, changes, and where to eat tonight. You message, Gredin sorts it out." },
  ],

  // The first trip is shown as the large featured card.
  trips: [
    {
      name: "Iceland",
      length: "8 days",
      season: "best May to September",
      summary: "The western half of the ring road: the Golden Circle, the south coast, and the Snæfellsnes peninsula, with one base change every two nights.",
      image: { src: "./img/iceland.webp", width: 1500, height: 998, alt: "Kirkjufell mountain above a waterfall at sunset, Iceland" },
    },
    {
      name: "Northern Tanzania",
      length: "10 days",
      season: "best June to October",
      summary: "Tarangire, the Ngorongoro Crater, and the central Serengeti, with lodges chosen for game drives over pools.",
      image: { src: "./img/tanzania.webp", width: 1024, height: 637, alt: "Acacia tree silhouetted against an orange sky, Tanzania" },
    },
    {
      name: "New York",
      length: "4 days",
      season: "any season",
      summary: "A long weekend built around two neighbourhoods, one big museum, and a show, without crossing town twice a day.",
      image: { src: "./img/new-york.webp", width: 1600, height: 743, alt: "Lower Manhattan skyline in black and white" },
    },
  ],

  included: [
    { term: "Flights", text: "Routes and fares compared, seats picked, and connections with enough time to make them." },
    { term: "Stays", text: "Hotels and lodges near what you came to see, checked for noise, parking, and late check-in." },
    { term: "On-trip support", text: "Rebooking when plans fall through, plus local picks from someone who has made the trip." },
  ],
};
