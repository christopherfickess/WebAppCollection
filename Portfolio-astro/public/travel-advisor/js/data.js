// All of the template's content lives here (destination guides are in
// ./destinations.js). Edit these files to rebrand or change content; the
// components in ./components render whatever is here.

import { destinations, destinationOrder, regions } from "./destinations.js";

export const content = {
  site: {
    // Where the template is served from. Every internal link and image
    // path is built from this, so moving the site means changing one line.
    base: "/travel-advisor/",
    name: "Gredin Travel Advisor",
    brand: "Gredin",
    tagline: "Travel Advisor",
    nav: [
      { label: "Destinations", href: "destinations/" },
      { label: "How it works", href: "#how" },
      { label: "What's included", href: "#included" },
    ],
    cta: { label: "Book a call", href: "#contact" },
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

  regions,
  destinations,
  destinationOrder,

  included: [
    { term: "Flights", text: "Routes and fares compared, seats picked, and connections with enough time to make them." },
    { term: "Stays", text: "Hotels near what you came to see, checked for noise, location, and late check-in." },
    { term: "On-trip support", text: "Rebooking when plans fall through, plus local picks from someone who has made the trip." },
  ],
};
