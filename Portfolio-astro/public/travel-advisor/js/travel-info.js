// Extra guide sections, merged into each destination by data.js:
//   caution:  when to be careful (hurricane season)
//   advisory: the US State Department's travel advisory level
//   airlines: who flies there from the US
//   shopping: what to know before you buy
//
// Checked November 2026 against the sources named in the comments.
// Everything here changes: levels are re-issued, routes come and go.
// Leave a field out for a destination when it can't be checked.
//
// US cities (San Diego, New York, Washington, Seattle) have no State
// Department advisory and no airline list on purpose.

const ADVISORY = "https://travel.state.gov/en/international-travel/travel-advisories.html";

// NOAA: the Atlantic season starts June 1; activity peaks from mid-August
// through mid-October; the statistical peak day is September 10.
const SEASON =
  "The Atlantic hurricane season officially runs from June 1 to November 30. NOAA puts the busiest stretch between mid-August and mid-October, with September 10 the statistical peak day.";

export const travelInfo = {
  london: {
    advisory: {
      level: 2,
      label: "Exercise increased caution",
      reasons: ["Check the current reasons on the official page before you book."],
      url: "https://travel.state.gov/en/international-travel/travel-advisories/united-kingdom.html",
      asOf: "Level reported by a travel-news source; the official page was not readable when we checked.",
    },
    airlines: {
      intro: "American, Delta, and United fly nonstop to Heathrow from many US cities, including New York (JFK), Newark, Boston, Chicago, Washington Dulles, Atlanta, Dallas, Los Angeles, San Francisco, Seattle, Miami, and Houston. British Airways and Virgin Atlantic also serve Heathrow.",
      source: "Source: FlightConnections. Which airline flies from your city changes by season.",
    },
    shopping: [
      { term: "Tax-free shopping", text: "There is no VAT refund on goods you carry home. The UK ended its tax-free scheme for visitors in 2021. Shops may ship large purchases overseas tax-free, so ask before you buy." },
    ],
  },

  paris: {
    advisory: {
      level: 2,
      label: "Exercise increased caution",
      reasons: [
        "Terrorism: attacks could happen with little or no warning, including at tourist sites, transport hubs, and public events.",
        "Civil unrest: demonstrations and strikes are common and can disrupt transport.",
      ],
      url: "https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/france-travel-advisory.html",
      asOf: "Level 2 as listed in October 2026.",
    },
    airlines: {
      intro: "Air France, Delta, United, and American all fly nonstop to Paris Charles de Gaulle from several US cities, including New York, Newark, Boston, Chicago, Washington Dulles, Atlanta, Los Angeles, San Francisco, and Miami.",
      source: "Source: published route lists, which disagree on some city pairs. Confirm on the airline's site before you book.",
    },
    shopping: [
      { term: "Tax refund", text: "Visitors aged 16 and over who live outside the EU can have the VAT taken off purchases of more than €100 from the same shop on the same day. Bring ID, ask for the export slip, and have it validated at customs when you leave. Services, tobacco, and some other goods are excluded." },
    ],
  },

  barcelona: {
    advisory: {
      level: 2,
      label: "Exercise increased caution",
      reasons: [
        "Terrorism: groups continue to plot possible attacks in Spain.",
        "Civil unrest: demonstrations over political or economic issues are common.",
      ],
      url: "https://travel.state.gov/en/international-travel/travel-advisories/spain.html",
      asOf: "Level 2 as listed in August 2026, from a travel-advisory tracker.",
    },
    airlines: {
      intro: "Nonstop flights to Barcelona leave from several US cities, including New York, Miami, Atlanta, and Philadelphia. Which airline flies each route varies by season.",
      source: "Source: published route summaries. Check the airline's own schedule.",
    },
    shopping: [
      { term: "Tax refund", text: "Visitors from outside the EU can claim back VAT on qualifying purchases. Ask the shop for its tax-free form when you buy, and confirm the minimum spend and the steps at the till." },
    ],
  },

  valencia: {
    advisory: {
      level: 2,
      label: "Exercise increased caution",
      reasons: [
        "Terrorism: groups continue to plot possible attacks in Spain.",
        "Civil unrest: demonstrations over political or economic issues are common.",
      ],
      url: "https://travel.state.gov/en/international-travel/travel-advisories/spain.html",
      asOf: "Level 2 as listed in August 2026, from a travel-advisory tracker.",
    },
    airlines: {
      intro: "Valencia has no nonstop flights from the US today, so most trips connect in Europe or arrive in Madrid or Barcelona and continue by train. United plans to start Newark to Valencia on June 2, 2027, three flights a week in summer.",
      source: "Source: The Olive Press, August 2026. Schedules can change.",
    },
    shopping: [
      { term: "Tax refund", text: "Visitors from outside the EU can claim back VAT on qualifying purchases. Ask the shop for its tax-free form when you buy, and confirm the minimum spend and the steps at the till." },
    ],
  },

  curacao: {
    caution: {
      text: [
        SEASON,
        "Curaçao sits south of the main hurricane track and is rarely hit directly. A storm passing elsewhere in the Caribbean can still disrupt flights, so check the National Hurricane Center forecast in the week before you fly.",
      ],
    },
    advisory: {
      level: 1,
      label: "Exercise normal precautions",
      reasons: [
        "Petty crime is most common in tourist areas: theft of unattended items and break-ins to parked cars.",
        "Watch for overcharging and aggressive sellers in tourist areas.",
        "Firearms, ammunition, and even spent shells are prohibited and can lead to arrest.",
      ],
      url: "https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/curacao-travel-advisory.html",
      asOf: "Issued August 20, 2026.",
    },
    airlines: {
      intro: "Four airlines fly nonstop from the US: American (Charlotte and Miami, with Chicago seasonally), Delta (Atlanta), JetBlue (New York JFK), and United (Newark).",
      source: "Source: FlightConnections. Seasonal routes change; confirm before you book.",
    },
    shopping: [
      { term: "Punda", text: "The main shopping district, on pedestrian streets by the waterfront. Shops sell imported goods such as European clothing, perfume, electronics, and leather." },
      { term: "Floating Market", text: "Near Handelskade. Venezuelan merchants sell fresh produce from boats, and nearby stalls sell local crafts." },
      { term: "Otrobanda", text: "Breedestraat and the Rif Fort shops, across the bridge from Punda." },
      { term: "Hours", text: "Some shops close for a midday break, so check hours before you set out." },
    ],
  },

  antigua: {
    caution: {
      text: [
        SEASON,
        "The State Department's Antigua advisory names hurricanes as its main concern, because the island sees them regularly. If you travel between June and November, buy travel insurance and check whether it covers a storm that is already named on the day you buy. Choose fares you can change, and watch the National Hurricane Center forecast before you fly.",
      ],
    },
    advisory: {
      level: 1,
      label: "Exercise normal precautions",
      reasons: [
        "Antigua and Barbuda is generally a safe destination.",
        "Hurricanes are the main concern; the country sees them regularly.",
        "Petty theft, break-ins, and car break-ins occur, as do scams. Medical facilities are limited.",
      ],
      url: "https://travel.state.gov/en/international-travel/travel-advisories/destination.atg.html",
      asOf: "Issued May 20, 2026.",
    },
    airlines: {
      intro: "American flies from Miami and Charlotte, United from Newark, and JetBlue from Boston (seasonal). From the UK, Virgin Atlantic flies from Heathrow and British Airways from Gatwick.",
      source: "Source: Best Antigua, updated April 2026. Several routes run only in winter.",
    },
  },

  nassau: {
    caution: {
      text: [
        SEASON,
        "The Bahamas sit in the Atlantic hurricane region. September and October are cheaper, but buy travel insurance, choose fares you can change, and check the National Hurricane Center forecast before you fly.",
      ],
    },
    advisory: {
      level: 2,
      label: "Exercise increased caution",
      reasons: [
        "Crime: most occurs on New Providence (Nassau) and Grand Bahama. Be extra alert in the Over the Hill area south of Shirley Street.",
        "Burglary, armed robbery, and sexual assault happen in tourist and other areas. Be careful in vacation rentals without private security.",
        "Water activities: boating and jet ski tours are poorly regulated. Never swim alone.",
        "Firearms and ammunition are illegal, even in small amounts.",
      ],
      url: "https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/the-bahamas-travel-advisory.html",
      asOf: "Renewed July 28, 2026.",
    },
    airlines: {
      intro: "Many US airlines serve Nassau: American (Charlotte, Chicago, Dallas, Miami, Philadelphia, Washington), Delta (Atlanta, Detroit, New York), JetBlue (Boston, Fort Lauderdale, New York, Orlando), United (Chicago, Denver, Houston, Newark, Washington), Southwest (Orlando, Baltimore), plus Frontier from Atlanta and Breeze from Tampa. Bahamasair flies from Florida.",
      source: "Source: Nassau Paradise Island tourism site.",
    },
  },
};

// Things worth packing, for the travel essentials page.
export const essentials = [
  {
    title: "Documents",
    items: [
      { term: "Passport", text: "Check the entry rules and passport validity in the \"Before you go\" section of your guide. Keep a photo of the photo page somewhere other than your phone's camera roll." },
      { term: "Confirmations and insurance", text: "Save flight, stay, and insurance details where you can read them offline." },
    ],
  },
  {
    title: "Money and phone",
    items: [
      { term: "A card without foreign fees", text: "Paying abroad adds up. Bring a second card in case one is blocked, and a little local cash for markets and taxis." },
      { term: "Data", text: "Install an eSIM or check your carrier's roaming plan before you leave, and download offline maps." },
      { term: "Power", text: "Plug type and voltage are listed under \"Before you go\" in each guide. Curaçao uses Type A and B plugs at 127 V; Antigua uses Type A and B at 230 V and 60 Hz, so check chargers and hair tools are dual-voltage. A small power bank helps on long days." },
    ],
  },
  {
    title: "For the day",
    items: [
      { term: "Comfortable shoes", text: "Most of these cities are best on foot." },
      { term: "A zipped bag worn in front", text: "The State Department notes petty theft in Curaçao and Antigua, and crowded sights anywhere are where pockets get picked." },
      { term: "Rain layer", text: "Worth carrying in London, Paris, and Seattle." },
      { term: "Sun cover", text: "Sunscreen, a hat, and a refillable water bottle for the Caribbean and San Diego." },
      { term: "Medication", text: "Pack prescriptions in their original containers, in your carry-on." },
    ],
  },
  {
    title: "Choosing an airline",
    items: [
      { term: "Nonstop first", text: "Each guide lists who flies there from the US. Where more than one airline flies your route, a nonstop is usually worth a higher fare." },
      { term: "Read the fare", text: "Compare checked-bag fees, seat fees, and change rules. The cheapest fare often has none of these included." },
      { term: "No ranking here", text: "We list who flies each route rather than ranking airlines, because the best choice depends on your home airport and the fare you find." },
    ],
  },
];
