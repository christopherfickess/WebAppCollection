// All of the template's content lives here (destination guides are in
// ./destinations.js). Edit these files to rebrand or change content; the
// components in ./components render whatever is here.

import { destinations, destinationOrder, regions } from "./destinations.js";
import { notes } from "./notes.js";
import { testimonials } from "./testimonials.js";

// Figures for the strip under the hero are counted from the guides, so
// they stay true as destinations and photos are added.
const photoCount = Object.values(destinations).reduce(
  (n, d) => n + (d.scenes?.length || 0) + (d.gallery?.length || 0),
  0
);
const regionCount = new Set(Object.values(destinations).map((d) => d.region)).size;

export const content = {
  site: {
    // Where the template is served from. Every internal link and image
    // path is built from this, so moving the site means changing one line.
    base: "/travel-advisor/",
    name: "Gredin Travel Advisor",
    brand: "Gredin",
    tagline: "Travel Advisor",
    blurb: "Trips planned by a person who has been there.",
    nav: [
      { label: "Destinations", href: "destinations/" },
      { label: "How it works", href: "#how" },
      { label: "Sample trips", href: "#trips" },
      { label: "What's included", href: "#included" },
      { label: "Questions", href: "#faq" },
      { label: "Field notes", href: "field-notes/" },
    ],
    cta: { label: "Book a call", href: "#contact" },
    // The fixed bar at the bottom of phone screens. To offer calling or
    // texting, add { label: "Call", href: "tel:+15555550100" } and
    // { label: "Text", href: "sms:+15555550100" } here (a placeholder
    // number is not published).
    actionBar: [
      { label: "Destinations", href: "destinations/" },
      { label: "How it works", href: "#how" },
      { label: "Book a call", href: "#contact", primary: true },
    ],
    footnote: "A design template by Chris Fickess. The business is a placeholder; destination details were checked in November 2026.",
    links: [
      { label: "LinkedIn", href: "https://www.linkedin.com/in/christopher-fickess-223a17182/", external: true },
      { label: "GitHub", href: "https://github.com/christopherfickess", external: true },
      { label: "More projects", href: "/projects/" },
    ],
  },

  itinerary: {
    title: "London and Paris in 8 days",
    label: "A sample plan",
    footnote: "Every trip starts as a draft like this. You change it until it fits.",
    stops: [
      { days: "Days 1–4", place: "London", note: "Museums, Borough Market, a West End show" },
      { days: "Day 5", place: "Eurostar", note: "St Pancras to Gare du Nord in 2 hours 20 minutes" },
      { days: "Days 6–7", place: "Paris", note: "Louvre, Le Marais, an evening on the Seine" },
      { days: "Day 8", place: "Fly home", note: "Out of Charles de Gaulle" },
    ],
  },

  steps: [
    { title: "Planning call", text: "Thirty minutes on where, when, budget, and pace: how early you like to start and how much you want to see." },
    { title: "Draft itinerary", text: "Within a week you get a day-by-day plan with stays, travel times, and reservations to make. Revise it as often as you need." },
    { title: "Bookings", text: "Flights, hotels, transfers, and tours get booked and confirmed, with every confirmation in one shared document." },
    { title: "While you're away", text: "One contact for delays, changes, and where to eat tonight. You message, Gredin sorts it out." },
  ],

  proof: [
    { value: destinationOrder.length, label: "destination guides" },
    { value: photoCount, label: "photos from our own trips" },
    { value: destinationOrder.length, label: "sample day-by-day plans" },
    { value: regionCount, label: "regions covered" },
  ],

  // Guides shown as sample trips on the home page.
  featuredTrips: ["paris", "new-york", "antigua"],

  faq: [
    { q: "What happens on the planning call?", a: "Thirty minutes on where, when, budget, and pace: how early you like to start and how much you want to see." },
    { q: "How soon do I get an itinerary?", a: "Within a week of the call you get a day-by-day plan with stays, travel times, and reservations to make." },
    { q: "Can I change the plan?", a: "Yes. Revise the draft as often as you need until it fits." },
    { q: "Do you book everything?", a: "Flights, hotels, transfers, and tours get booked and confirmed, with every confirmation in one shared document." },
    { q: "What if something goes wrong while I'm away?", a: "You have one contact for delays, changes, and where to eat tonight. You message, Gredin sorts it out." },
    { q: "How quickly will you reply?", a: "Within two business days, to set up a time for the call." },
  ],

  quote: {
    title: "Ready to plan the trip?",
    points: ["A day-by-day plan within a week", "Every booking confirmed in one document", "Someone to message while you travel"],
    cta: { label: "Book a free planning call", href: "#contact" },
  },

  notes,
  testimonials,

  regions,
  destinations,
  destinationOrder,

  included: [
    { term: "Flights", text: "Routes and fares compared, seats picked, and connections with enough time to make them." },
    { term: "Stays", text: "Hotels near what you came to see, checked for noise, location, and late check-in." },
    { term: "On-trip support", text: "Rebooking when plans fall through, plus local picks from someone who has made the trip." },
  ],
};
