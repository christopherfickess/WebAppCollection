// Destination guides. One entry per city; the key is the URL slug
// (destinations/<key>/). tools/build-guides.mjs writes one page per entry,
// and the guide components render everything below.
//
// seasons: 12 values, January first. 2 = best, 1 = good, 0 = off-season.
// accent / accentInk: the city's colour and the text colour that reads on it.
// Photos (all optional; see js/lib/photo.js for the file naming):
//   scenes:    2+ photos for a full-bleed slideshow header (London)
//   photo:     one photo beside a colour header (New York)
//   neither:   a typographic header in the city's colour
//   cardPhoto: the image on the city's destination card
//   dayTrips:  places outside the city, each with a pair of photos
//   gallery:   captioned photos for a "From our trip" mosaic (Valencia)
//
// "Before you go" facts are for US passport holders and were checked in
// November 2026. Entry rules change: re-check them before publishing.

export const regions = [
  { key: "europe", name: "Europe" },
  { key: "caribbean", name: "Caribbean" },
  { key: "us", name: "United States" },
];

export const destinations = {
  london: {
    name: "London",
    country: "United Kingdom",
    region: "europe",
    accent: "#233d8f",
    accentInk: "#ffffff",
    coords: "51.51° N, 0.13° W",
    currency: "Pound sterling",
    summary: "A city you can plan around a single neighbourhood a day, with world-class museums that cost nothing to enter.",
    intro:
      "London rewards picking a base and walking. Most of the big museums are free, the parks run into each other, and a day can go from a market breakfast to a West End show without a taxi.",
    seasons: [0, 0, 1, 1, 2, 2, 2, 2, 2, 1, 0, 1],
    seasonNote: "May to September has the longest days and the most outdoor life. December has markets and lights but gets dark before 4 pm.",
    neighbourhoods: [
      { name: "South Bank", note: "Riverside walk from the London Eye to Tower Bridge, Tate Modern, Borough Market." },
      { name: "Covent Garden & Soho", note: "Theatres, late dinners, and the best base for a first visit." },
      { name: "Shoreditch", note: "Street art, Columbia Road flower market on Sundays, small restaurants." },
      { name: "Kensington", note: "The V&A, the Natural History Museum, and Hyde Park on the doorstep." },
    ],
    gettingAround: [
      { term: "Tube and buses", text: "Tap a contactless card or phone at the gates; daily fares cap automatically, so there's no need for an Oyster card." },
      { term: "From Heathrow", text: "The Elizabeth line reaches central London in about 30 minutes; the Piccadilly line is slower and cheaper." },
      { term: "On foot", text: "Many stops are closer than the Tube map suggests. Covent Garden to Leicester Square is a four-minute walk." },
    ],
    scenes: [
      {
        file: "img/london/london-westminster-aerial",
        width: 1600,
        height: 961,
        alt: "The Houses of Parliament and Big Ben beside the Thames, seen from the London Eye",
        label: "From the London Eye",
        position: "50% 60%",
      },
      {
        file: "img/london/london-regent-street",
        width: 1600,
        height: 2133,
        alt: "Union flags strung across Regent Street above a line of black cabs",
        label: "Regent Street",
        position: "50% 42%",
      },
      {
        file: "img/london/london-westminster-bridge",
        width: 1600,
        height: 1728,
        alt: "Big Ben and Parliament from Westminster Bridge on a clear day",
        label: "Westminster Bridge",
        position: "50% 38%",
      },
    ],
    cardPhoto: {
      file: "img/london/london-thames",
      width: 1600,
      height: 1273,
      alt: "Parliament, Big Ben and Westminster Bridge across the Thames",
      position: "50% 35%",
    },
    dayTrips: [
      {
        name: "Kew Gardens",
        where: "About 40 minutes on the District line from Westminster, or 30 minutes by train from Waterloo to Kew Bridge.",
        text: "The Royal Botanic Gardens are a UNESCO World Heritage Site in south-west London. Walk through the Victorian Palm House's rainforest, then find the giant Amazon waterlilies, at their biggest in summer. Allow most of a day and book tickets online.",
        photos: [
          {
            file: "img/london/kew-waterlily-house",
            width: 1600,
            height: 1481,
            alt: "Giant waterlily pads with red rims floating in a glasshouse pond at Kew",
            position: "50% 55%",
          },
          {
            file: "img/london/kew-palm-house",
            width: 1321,
            height: 2576,
            alt: "Banana plants under the white iron arches of Kew's Palm House",
            position: "50% 40%",
          },
        ],
      },
    ],
    itinerary: {
      title: "London in 4 days",
      label: "A sample plan",
      footnote: "Add a Eurostar day trip to Paris, 2 hours 20 minutes each way.",
      stops: [
        { days: "Day 1", place: "Westminster", note: "Abbey, Parliament, a walk through St James's Park" },
        { days: "Day 2", place: "South Bank", note: "Borough Market lunch, Tate Modern, Globe Theatre" },
        { days: "Day 3", place: "Kensington", note: "V&A in the morning, Hyde Park, dinner in Notting Hill" },
        { days: "Day 4", place: "East London", note: "Columbia Road, Brick Lane, a show in the evening" },
      ],
    },
    basics: [
      { term: "Entry", text: "US citizens need a UK Electronic Travel Authorisation (ETA), £20, applied for on gov.uk/eta or the official app before flying." },
      { term: "Money", text: "Pound sterling (GBP). Cards and phone payments are accepted almost everywhere." },
      { term: "Power", text: "Type G plugs, 230 V. Bring a UK adapter." },
      { term: "Airports", text: "Heathrow (LHR) for most US flights; Gatwick (LGW) for some." },
    ],
  },

  paris: {
    name: "Paris",
    country: "France",
    region: "europe",
    accent: "#7a2e4a",
    accentInk: "#ffffff",
    coords: "48.86° N, 2.35° E",
    currency: "Euro",
    summary: "Best taken slowly: one museum a day, long lunches, and evenings along the Seine.",
    intro:
      "Paris is compact enough to cross on foot in an afternoon, and most of what makes it good happens between the landmarks. Plan one big sight a day and leave the rest to wandering and long lunches.",
    seasons: [0, 0, 1, 2, 2, 2, 1, 1, 2, 2, 0, 1],
    seasonNote: "April to June and September to October are the sweet spots. August is hot and many small restaurants close for the summer holidays.",
    neighbourhoods: [
      { name: "Le Marais", note: "Medieval streets, Place des Vosges, falafel on Rue des Rosiers." },
      { name: "Saint-Germain", note: "Cafés, bookshops, and the Luxembourg Gardens." },
      { name: "Montmartre", note: "Sacré-Cœur views; go early before the day crowds." },
      { name: "Canal Saint-Martin", note: "Locals' Paris: picnics on the canal, wine bars, small bistros." },
    ],
    gettingAround: [
      { term: "Métro and RER", text: "Buy tickets in the Île-de-France Mobilités app or load a Navigo Easy card at any station." },
      { term: "From Charles de Gaulle", text: "RER B to central Paris takes about 35 minutes; a taxi has a fixed fare to each bank of the Seine." },
      { term: "On foot", text: "The centre is small. The Louvre to Notre-Dame is a 15-minute walk." },
    ],
    itinerary: {
      title: "Paris in 4 days",
      label: "A sample plan",
      footnote: "Book the Louvre and Eiffel Tower summit online; both sell out.",
      stops: [
        { days: "Day 1", place: "Île de la Cité", note: "Notre-Dame, Sainte-Chapelle, dinner in the Latin Quarter" },
        { days: "Day 2", place: "Louvre", note: "Morning entry, Tuileries, the Seine at sunset" },
        { days: "Day 3", place: "Le Marais", note: "Picasso Museum, Place des Vosges, wine bar evening" },
        { days: "Day 4", place: "Montmartre", note: "Sacré-Cœur at opening, Musée d'Orsay in the afternoon" },
      ],
    },
    basics: [
      { term: "Entry", text: "Visa-free for up to 90 days in any 180 in the Schengen area. Fingerprints and a photo are taken at the border under the EU Entry/Exit System. The €20 ETIAS authorisation is due to start in late 2026; check travel-europe.europa.eu before booking." },
      { term: "Money", text: "Euro (EUR). Cards are widely accepted; keep a few euros for markets." },
      { term: "Power", text: "Type C and E plugs, 230 V." },
      { term: "Airports", text: "Charles de Gaulle (CDG) for most US flights; Orly (ORY) for some." },
    ],
  },

  barcelona: {
    name: "Barcelona",
    country: "Spain",
    region: "europe",
    accent: "#a63a28",
    accentInk: "#ffffff",
    coords: "41.39° N, 2.17° E",
    currency: "Euro",
    summary: "Gaudí in the morning, the beach in the afternoon, and dinner that starts after 9.",
    intro:
      "Barcelona packs Gaudí, the Gothic Quarter, and a city beach into one walkable grid. Book the headline sights ahead, then match the local rhythm: late lunch, later dinner.",
    seasons: [0, 0, 1, 1, 2, 2, 1, 1, 2, 2, 0, 0],
    seasonNote: "May, June, September, and October are warm without the peak crowds. July and August are hot and very busy.",
    neighbourhoods: [
      { name: "Gothic Quarter & El Born", note: "Narrow medieval lanes, the Picasso Museum, Santa Maria del Mar." },
      { name: "Eixample", note: "Gaudí's Casa Batlló and La Pedrera along the wide grid streets." },
      { name: "Gràcia", note: "Small squares, neighbourhood bars, a village feel." },
      { name: "Barceloneta", note: "The city beach and seafood restaurants." },
    ],
    gettingAround: [
      { term: "Metro", text: "A T-casual card covers 10 rides on the metro, buses, and trams." },
      { term: "From the airport", text: "The Aerobús runs to Plaça de Catalunya in about 35 minutes; metro line L9 Sud is the cheaper option." },
      { term: "Watch out", text: "Pickpocketing is common on Las Ramblas and the metro. Keep phones out of back pockets." },
    ],
    scenes: [
      { file: "img/barcelona/barcelona-cathedral", width: 1600, height: 739, alt: "The Gothic facade and spires of Barcelona Cathedral under a grey sky, with red umbrellas below", label: "Barcelona Cathedral", position: "50% 40%" },
      { file: "img/barcelona/barcelona-sagrada-familia", width: 1190, height: 2300, alt: "The Passion facade of the Sagrada Família, with angled stone columns below the spires", label: "Sagrada Família", position: "50% 30%" },
      { file: "img/barcelona/barcelona-arc-de-triomf", width: 1190, height: 2300, alt: "The red-brick Arc de Triomf at the end of a wide promenade", label: "Arc de Triomf", position: "50% 38%" },
    ],
    cardPhoto: { file: "img/barcelona/barcelona-sagrada-familia", width: 1190, height: 2300, alt: "The spires of the Sagrada Família", position: "50% 25%" },
    gallery: [
      { file: "img/barcelona/barcelona-placa-reial", width: 1190, height: 2576, alt: "Placa Reial's iron fountain and tall palms on a rainy day", caption: "Plaça Reial after the rain" },
      { file: "img/barcelona/barcelona-courtyard", width: 1190, height: 2576, alt: "A stone courtyard with a fountain, arches and hanging vines in the Gothic Quarter", caption: "A Gothic Quarter courtyard, a few steps off the busy lanes" },
      { file: "img/barcelona/barcelona-el-born-street", width: 1190, height: 2576, alt: "A narrow street of tall stone buildings with iron balconies", caption: "El Born's balconied streets" },
      { file: "img/barcelona/barcelona-gothic-rain", width: 1190, height: 2576, alt: "A wet, lamp-lit Gothic Quarter lane lined with small shops", caption: "Rain brings out the Gothic Quarter's best light" },
      { file: "img/barcelona/barcelona-cathedral-lane", width: 1190, height: 2576, alt: "A narrow lane beside the cathedral's carved stone wall, paving shining with rain", caption: "The lane along the cathedral's side" },
      { file: "img/barcelona/barcelona-customs-house", width: 1190, height: 2276, alt: "The ornate old customs house by the port, with lion statues at the Columbus monument", caption: "The old customs house at the bottom of La Rambla" },
      { file: "img/barcelona/barcelona-shaded-street", width: 1190, height: 2576, alt: "Trees arching over a cobbled street with café tables", caption: "Shaded streets and café terraces" },
      { file: "img/barcelona/barcelona-tree-square", width: 1190, height: 2576, alt: "A tree-lined pedestrian square with palms", caption: "Plane trees and palms in a city square" },
      { file: "img/barcelona/barcelona-train-wine", width: 1190, height: 2200, alt: "A small bottle of Spanish red wine and a glass on a train table", caption: "Ribera del Duero on the train from Barcelona to Valencia" },
    ],
    itinerary: {
      title: "Barcelona in 5 days",
      label: "A sample plan",
      footnote: "Sagrada Família and Park Güell need timed tickets; book weeks ahead in summer. Pair this with the Valencia guide for a week in Spain.",
      stops: [
        { days: "Day 1", place: "Gothic Quarter", note: "Cathedral, El Born, tapas crawl in the evening" },
        { days: "Day 2", place: "Sagrada Família", note: "Morning slot, then Casa Batlló on Passeig de Gràcia" },
        { days: "Day 3", place: "Montjuïc", note: "Cable car, Miró Foundation, sunset from the castle" },
        { days: "Day 4", place: "Barceloneta", note: "Beach morning, Park Güell late afternoon" },
        { days: "Day 5", place: "Train to Valencia", note: "About 3 hours by high-speed train; continue with the Valencia guide" },
      ],
    },
    basics: [
      { term: "Entry", text: "Schengen rules: visa-free for up to 90 days in any 180, biometrics at the border, and ETIAS due in late 2026. Check travel-europe.europa.eu before booking." },
      { term: "Money", text: "Euro (EUR). Cards accepted nearly everywhere." },
      { term: "Language", text: "Catalan and Spanish; English is common in tourist areas." },
      { term: "Power", text: "Type C and F plugs, 230 V." },
    ],
  },

  valencia: {
    name: "Valencia",
    country: "Spain",
    region: "europe",
    accent: "#d9741a",
    accentInk: "#14262e",
    coords: "39.47° N, 0.38° W",
    currency: "Euro",
    summary: "Spain's third city, home of paella, with a 9 km park where a river used to run.",
    intro:
      "Valencia is easier-going than Barcelona and just as good on food. The old riverbed is now a long park that links the old town to the futuristic City of Arts and Sciences, and the beach is a tram ride away.",
    seasons: [1, 1, 2, 2, 2, 2, 1, 1, 2, 2, 1, 1],
    seasonNote: "Mild most of the year. Las Fallas (15 to 19 March) fills the city with giant sculptures and fireworks; book early or avoid it.",
    neighbourhoods: [
      { name: "Ciutat Vella", note: "The cathedral, the Silk Exchange, and the Central Market." },
      { name: "Ruzafa", note: "The city's best small restaurants and cafés." },
      { name: "El Cabanyal", note: "Tiled fishermen's houses by the beach." },
      { name: "Turia Gardens", note: "Run, cycle, or walk the old riverbed end to end." },
    ],
    gettingAround: [
      { term: "Metro and tram", text: "Metrovalencia lines 3 and 5 connect the airport to the centre in about 25 minutes." },
      { term: "By bike", text: "Flat and full of bike lanes. Valenbisi city bikes or a rental cover most trips." },
      { term: "To the beach", text: "Tram or bus from the centre to Malvarrosa in about 20 minutes." },
    ],
    scenes: [
      { file: "img/valencia/valencia-arts-sciences", width: 1600, height: 739, alt: "L'Hemisfèric and the Palau de les Arts reflected in the pools of the City of Arts and Sciences", label: "City of Arts and Sciences", position: "50% 55%" },
      { file: "img/valencia/valencia-plaza-reina", width: 1600, height: 739, alt: "Palm trees and crowds in Plaza de la Reina on a sunny afternoon", label: "Plaza de la Reina", position: "50% 45%" },
      { file: "img/valencia/valencia-old-town-night", width: 1600, height: 739, alt: "An ornate old-town facade with iron balconies, lit up at night", label: "The old town at night", position: "50% 35%" },
    ],
    cardPhoto: { file: "img/valencia/valencia-palau-arts", width: 1190, height: 2276, alt: "The Palau de les Arts opera house above a reflecting pool", position: "50% 52%" },
    gallery: [
      { file: "img/valencia/valencia-science-museum", width: 1600, height: 739, alt: "The white ribbed Science Museum beside a long turquoise pool", caption: "The Science Museum's skeleton of white ribs" },
      { file: "img/valencia/valencia-paella", width: 1190, height: 1850, alt: "A seafood paella with two large prawns in a black pan", caption: "Seafood paella, ordered at lunch the way locals do" },
      { file: "img/valencia/valencia-micalet", width: 1190, height: 2276, alt: "The octagonal Micalet bell tower against a deep blue sky", caption: "El Micalet, the cathedral's bell tower" },
      { file: "img/valencia/valencia-mercado-colon", width: 1190, height: 2576, alt: "The iron and glass roof of Mercado de Colón over cafés on two levels", caption: "Mercado de Colón, a modernist market turned café hall" },
      { file: "img/valencia/valencia-plaza-ayuntamiento", width: 1600, height: 739, alt: "Plaza del Ayuntamiento lined with grand buildings and palms", caption: "Plaza del Ayuntamiento, the city's main square" },
      { file: "img/valencia/valencia-ficus", width: 1190, height: 2576, alt: "The buttressed roots of a giant fig tree on a city street", caption: "Giant fig trees shade the city's squares" },
      { file: "img/valencia/valencia-parade", width: 1190, height: 2100, alt: "Costumed marchers in a palm-lined street packed with spectators", caption: "A festival parade through the centre" },
      { file: "img/valencia/valencia-pedestrian-street", width: 1190, height: 2576, alt: "A quiet pedestrian street paved in dark stone between pale buildings", caption: "Pedestrian streets off the main squares" },
      { file: "img/valencia/valencia-street-night", width: 1190, height: 2576, alt: "A lamp-lit old-town street at night", caption: "The old town after dinner" },
      { file: "img/valencia/valencia-rice-dish", width: 1556, height: 810, alt: "A golden rice dish with prawns in a wide iron pan", caption: "Paella is only the start: the city has dozens of rice dishes" },
    ],
    itinerary: {
      title: "Valencia in 3 days",
      label: "A sample plan",
      footnote: "Have paella at lunch, the way Valencians do, and try it in El Palmar by the lagoon.",
      stops: [
        { days: "Day 1", place: "Old town", note: "Central Market, Silk Exchange, the cathedral's tower" },
        { days: "Day 2", place: "Turia Gardens", note: "Bike the old riverbed to the City of Arts and Sciences" },
        { days: "Day 3", place: "Albufera", note: "Paella in El Palmar, a sunset boat on the lagoon" },
      ],
    },
    basics: [
      { term: "Entry", text: "Schengen rules: visa-free for up to 90 days in any 180, biometrics at the border, and ETIAS due in late 2026. Check travel-europe.europa.eu before booking." },
      { term: "Money", text: "Euro (EUR)." },
      { term: "Language", text: "Spanish and Valencian." },
      { term: "Getting there", text: "Valencia Airport (VLC), usually via Madrid or another European hub, or 3 hours by high-speed train from Barcelona." },
    ],
  },

  curacao: {
    name: "Curaçao",
    country: "Dutch Caribbean",
    region: "caribbean",
    accent: "#1a9fb3",
    accentInk: "#14262e",
    coords: "12.17° N, 68.98° W",
    currency: "Caribbean guilder; US dollars accepted",
    summary: "Pastel Dutch waterfronts, small coves, and some of the Caribbean's easiest shore diving.",
    intro:
      "Curaçao sits south of the hurricane belt, so it's dependable most of the year. Willemstad's colourful waterfront is the postcard, but the reason to stay a week is the string of small beaches and reefs along the west coast.",
    seasons: [2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1],
    seasonNote: "Warm and dry year-round, and rarely touched by hurricanes. October to December brings short showers; January to April is peak season.",
    neighbourhoods: [
      { name: "Punda & Otrobanda", note: "Willemstad's two waterfront districts, joined by the floating Queen Emma Bridge." },
      { name: "Pietermaai", note: "Restored mansions turned into restaurants and small hotels." },
      { name: "Westpunt", note: "Quiet coves like Grote Knip and Playa Lagun, plus Christoffel Park." },
      { name: "Jan Thiel", note: "Beach clubs and the busiest stretch of the south coast." },
    ],
    gettingAround: [
      { term: "Rent a car", text: "The beaches are spread out and buses are infrequent. Driving is on the right." },
      { term: "From the airport", text: "Hato (CUR) is about 20 minutes from Willemstad." },
      { term: "Diving", text: "Many reefs start a few metres from shore, so you can dive without a boat." },
    ],
    itinerary: {
      title: "Curaçao in 6 days",
      label: "A sample plan",
      footnote: "Split the stay: three nights in Willemstad, three near the west-coast beaches.",
      stops: [
        { days: "Days 1–2", place: "Willemstad", note: "Punda, the floating bridge, dinner in Pietermaai" },
        { days: "Day 3", place: "Christoffel Park", note: "Hike the island's high point early, before the heat" },
        { days: "Days 4–5", place: "West coast", note: "Grote Knip, Playa Lagun, snorkel with turtles at Playa Piskado" },
        { days: "Day 6", place: "Fly home", note: "Last swim at Cas Abao on the way to the airport" },
      ],
    },
    basics: [
      { term: "Entry", text: "Every traveller, children included, completes a Digital Immigration Card at dicardcuracao.com before each trip." },
      { term: "Money", text: "Caribbean guilder (XCG), which replaced the Antillean guilder in 2025. US dollars and cards are widely accepted." },
      { term: "Language", text: "Papiamentu, Dutch, English, and Spanish are all spoken." },
      { term: "Power", text: "127 V with US-style Type A and B plugs; some places have 220 V European sockets." },
    ],
  },

  antigua: {
    name: "Antigua",
    country: "Antigua and Barbuda",
    region: "caribbean",
    accent: "#b8324f",
    accentInk: "#ffffff",
    coords: "17.07° N, 61.80° W",
    currency: "EC dollar; US dollars accepted",
    summary: "An island known for having a beach for every day of the year, and a Georgian dockyard where sailors still tie up.",
    intro:
      "Antigua is about the water: calm west-coast beaches, Atlantic-side bays, and English Harbour, where Nelson's Dockyard is still a working marina. Pick a beach base and plan a few days out on the water.",
    seasons: [2, 2, 2, 2, 1, 1, 1, 0, 0, 0, 1, 2],
    seasonNote: "December to April is dry and breezy. Hurricane season runs June to November, with August to October the riskiest.",
    neighbourhoods: [
      { name: "English Harbour", note: "Nelson's Dockyard, a UNESCO site, and Shirley Heights for the Sunday sunset party." },
      { name: "Dickenson Bay", note: "Calm water and the island's busiest beach strip." },
      { name: "Jolly Harbour", note: "A marina, a long beach, and easy access to the south-west coast." },
      { name: "St John's", note: "The capital: the cathedral, markets, and the cruise pier." },
    ],
    gettingAround: [
      { term: "Taxis", text: "Fares are fixed by destination; confirm the price before you get in." },
      { term: "Driving", text: "Driving is on the left, and renters buy a local temporary permit." },
      { term: "Barbuda", text: "A ferry or short flight reaches Barbuda's pink-sand beaches for a day trip." },
    ],
    itinerary: {
      title: "Antigua in 5 days",
      label: "A sample plan",
      footnote: "Time the trip to include a Sunday at Shirley Heights.",
      stops: [
        { days: "Day 1", place: "Dickenson Bay", note: "Land, swim, and settle in" },
        { days: "Day 2", place: "Catamaran day", note: "Sail round to Cades Reef and snorkel" },
        { days: "Day 3", place: "English Harbour", note: "Nelson's Dockyard, then Shirley Heights at sunset" },
        { days: "Day 4", place: "Barbuda", note: "Day trip to the pink sand and the frigate bird colony" },
        { days: "Day 5", place: "Half Moon Bay", note: "Atlantic-side beach before the flight" },
      ],
    },
    basics: [
      { term: "Entry", text: "Visa-free for US citizens. Complete the ArriveAntigua form within 72 hours of flying; your passport needs six months' validity." },
      { term: "Money", text: "Eastern Caribbean dollar (XCD), pegged to the US dollar. US dollars are widely accepted." },
      { term: "Power", text: "Type A and B plugs; supply is mostly 230 V, so check chargers are dual-voltage." },
      { term: "Airport", text: "V.C. Bird International (ANU), with direct flights from several US cities." },
    ],
  },

  "san-diego": {
    name: "San Diego",
    country: "California, USA",
    region: "us",
    accent: "#2468a6",
    accentInk: "#ffffff",
    coords: "32.72° N, 117.16° W",
    currency: "US dollar",
    summary: "Beach towns, Balboa Park, and tacos, with weather that rarely gets in the way.",
    intro:
      "San Diego is a string of distinct beach neighbourhoods tied to a compact downtown. The weather is mild all year; the trip is more about choosing between surf towns, the harbour, and day trips inland.",
    seasons: [1, 1, 2, 2, 1, 1, 2, 2, 2, 2, 1, 1],
    seasonNote: "Pleasant all year. May and June can be grey along the coast; September and October are warm and quieter.",
    neighbourhoods: [
      { name: "La Jolla", note: "Sea lions at the Cove, tide pools, and kayaking the caves." },
      { name: "Little Italy", note: "The best base downtown: walkable, with great restaurants." },
      { name: "North Park", note: "Breweries, coffee, and Balboa Park next door." },
      { name: "Coronado", note: "The Hotel del Coronado and a wide, calm beach." },
    ],
    gettingAround: [
      { term: "Trolley", text: "The trolley covers downtown, Old Town, and the border; pay with the PRONTO app or card." },
      { term: "From the airport", text: "San Diego International is about 10 minutes from downtown." },
      { term: "A car helps", text: "For La Jolla, the beach towns, and day trips, renting is easier than transit." },
    ],
    itinerary: {
      title: "San Diego in 4 days",
      label: "A sample plan",
      footnote: "Add a day inland: Julian for apple pie or the Anza-Borrego desert in spring.",
      stops: [
        { days: "Day 1", place: "Downtown", note: "Little Italy, the harbour, the USS Midway" },
        { days: "Day 2", place: "Balboa Park", note: "Museums and gardens, dinner in North Park" },
        { days: "Day 3", place: "La Jolla", note: "Kayak the sea caves, Torrey Pines at sunset" },
        { days: "Day 4", place: "Coronado", note: "Bike the island, beach afternoon" },
      ],
    },
    basics: [
      { term: "Getting there", text: "San Diego International (SAN). Domestic flights need a REAL ID or passport." },
      { term: "Weather", text: "Ocean water stays cool; bring a layer for evenings even in summer." },
      { term: "Mexico", text: "Tijuana is across the border by trolley. Bring a passport or passport card to return." },
    ],
  },

  "new-york": {
    name: "New York City",
    country: "New York, USA",
    region: "us",
    accent: "#f0c419",
    accentInk: "#14262e",
    coords: "40.71° N, 74.01° W",
    currency: "US dollar",
    summary: "Five boroughs, a subway that runs all night, and neighbourhoods worth a whole day each.",
    intro:
      "New York is best planned by neighbourhood, not by landmark. Group each day around one part of the city and you'll spend it walking and eating instead of crossing town on the subway.",
    seasons: [0, 0, 1, 2, 2, 2, 1, 1, 2, 2, 1, 1],
    seasonNote: "Late spring and autumn are ideal. July and August are humid. December has the holiday windows and the Rockefeller Center tree.",
    neighbourhoods: [
      { name: "Lower Manhattan", note: "The 9/11 Memorial, Battery Park, and the Staten Island Ferry." },
      { name: "West Village", note: "Tree-lined streets and some of the city's best small restaurants." },
      { name: "Upper West Side", note: "Central Park, the Natural History Museum, and a quieter base." },
      { name: "Williamsburg", note: "Brooklyn's waterfront, with skyline views from Domino Park." },
    ],
    gettingAround: [
      { term: "Subway", text: "Tap a contactless card or phone at OMNY readers; MetroCards are no longer sold. Fares cap after 12 rides in 7 days." },
      { term: "From the airports", text: "AirTrain from JFK to the subway or LIRR; from Newark, AirTrain to NJ Transit to Penn Station." },
      { term: "On foot", text: "Manhattan's grid makes walking easy; 20 north-south blocks are about a mile." },
    ],
    itinerary: {
      title: "New York in 4 days",
      label: "A sample plan",
      footnote: "Book Broadway and the observation decks in advance; same-day TKTS works for flexible plans.",
      stops: [
        { days: "Day 1", place: "Lower Manhattan", note: "9/11 Memorial, Brooklyn Bridge walk, DUMBO dinner" },
        { days: "Day 2", place: "Midtown", note: "MoMA, Rockefeller Center, a Broadway show" },
        { days: "Day 3", place: "Central Park", note: "The Met, the park end to end, Upper West Side" },
        { days: "Day 4", place: "Downtown", note: "High Line, Chelsea Market, West Village evening" },
      ],
    },
    basics: [
      { term: "Getting there", text: "JFK, LaGuardia (LGA), or Newark (EWR). Domestic flights need a REAL ID or passport." },
      { term: "Money", text: "Tipping of 18 to 20 percent is expected at restaurants and bars." },
      { term: "Timing", text: "Museums like the Met and MoMA are busiest on weekends; go on weekday mornings." },
    ],
    photo: {
      file: "img/new-york/nyc-skyline",
      width: 1600,
      height: 743,
      alt: "Lower Manhattan skyline in black and white",
    },
  },
};

// Display order on the index pages.
export const destinationOrder = ["london", "paris", "barcelona", "valencia", "curacao", "antigua", "san-diego", "new-york"];
