// Every photo on the site lives in this list. To add photos, put them in a
// folder and run:  python3 tools/photos/build-photos.py <set> <folder>
// (see the README). It exports the web sizes and adds the entries below.
//
// set    which collection it belongs to (one of the ids in `sets`)
// light  dawn, day, dusk, or night: when the photo was made
// width and height are the size of the largest export. Add "position":
// "50% 30%" to change how a photo crops in tight spaces.
//
// A collection with no photos is hidden from the gallery automatically.

export const sets = [
  { id: "engagement", name: "Engagement" },
  { id: "spain", name: "Spain" },
  { id: "london", name: "London" },
  { id: "nature", name: "Nature" },
];

export const photos = [
  {"set": "spain", "light": "day", "title": "Arc de Triomf in the rain", "file": "img/photos/spain-arc-de-triomf-in-the-rain", "width": 1190, "height": 2391, "alt": "The brick Arc de Triomf in Barcelona on a rainy day, with people under umbrellas"},
  {"set": "spain", "light": "day", "title": "City of Arts and Sciences", "file": "img/photos/spain-city-of-arts-and-sciences-panorama", "width": 1600, "height": 739, "alt": "The Hemisfèric and the Palau de les Arts reflected in the pool in Valencia"},
  {"set": "spain", "light": "night", "title": "Fountain at night", "file": "img/photos/spain-fountain-at-night", "width": 1190, "height": 2576, "alt": "A lit fountain with bronze figures among plane trees at night"},
  {"set": "spain", "light": "day", "title": "Palau de les Arts", "file": "img/photos/spain-palau-de-les-arts", "width": 1190, "height": 2576, "alt": "The white Palau de les Arts opera house beside the water under a blue sky"},
  {"set": "spain", "light": "day", "title": "Torres de Serranos", "file": "img/photos/spain-torres-de-serranos", "width": 1190, "height": 2576, "alt": "The medieval Serranos towers in Valencia under a deep blue sky"},
  {"set": "spain", "light": "night", "title": "Cathedral square", "file": "img/photos/spain-valencia-cathedral-square-night", "width": 1190, "height": 2576, "alt": "Valencia Cathedral and its wet plaza lit at night"},
  {"set": "spain", "light": "night", "title": "Lantern-lit lane", "file": "img/photos/spain-valencia-lane-at-night", "width": 1190, "height": 2576, "alt": "A quiet Valencia lane at night with glowing street lamps and balconies"},
  {"set": "spain", "light": "day", "title": "Narrow street", "file": "img/photos/spain-valencia-narrow-street", "width": 1190, "height": 2576, "alt": "A narrow Valencia street with orange and yellow buildings and a strip of blue sky"},
  {"set": "spain", "light": "dusk", "title": "Afternoon street", "file": "img/photos/spain-valencia-street-afternoon", "width": 1190, "height": 2576, "alt": "A pedestrian street in Valencia in warm late-afternoon light"},
  {"set": "nature", "light": "day", "title": "Ficus roots", "file": "img/photos/nature-ficus-roots", "width": 1190, "height": 2576, "alt": "Buttress roots of a giant ficus tree in Valencia"},
  {"set": "nature", "light": "day", "title": "Ficus trunk", "file": "img/photos/nature-ficus-trunk", "width": 1600, "height": 739, "alt": "The twisted trunk and aerial roots of a giant ficus tree"},
  {"set": "nature", "light": "day", "title": "Garden under cypress", "file": "img/photos/nature-garden-fountain-under-cypress", "width": 1600, "height": 739, "alt": "A dappled garden path with a stone fountain under cypress trees"},
  {"set": "nature", "light": "day", "title": "Giant ficus", "file": "img/photos/nature-giant-ficus-tree", "width": 1600, "height": 739, "alt": "A huge ficus tree spreading over a sunny square"},
  {"set": "nature", "light": "day", "title": "Hedge garden", "file": "img/photos/nature-hedge-garden-path", "width": 1600, "height": 739, "alt": "A narrow path winding through clipped hedges and orange trees"},
  {"set": "nature", "light": "day", "title": "Monument under the ficus", "file": "img/photos/nature-monument-under-the-ficus", "width": 1190, "height": 2576, "alt": "A stone monument framed by ficus trees"},
  {"set": "nature", "light": "day", "title": "Palm path", "file": "img/photos/nature-palm-path-in-the-gardens", "width": 1190, "height": 2576, "alt": "A gravel path curving past palms and flowering trees under blue sky"},
  {"set": "nature", "light": "day", "title": "Palms under the Umbracle", "file": "img/photos/nature-palms-under-the-umbracle", "width": 1190, "height": 2576, "alt": "Palm trees beneath the white arches of the Umbracle walkway"},
  {"set": "nature", "light": "day", "title": "Park path", "file": "img/photos/nature-park-path-and-steel-pole", "width": 1600, "height": 739, "alt": "A sunny park path lined with trees and cypresses"},
  {"set": "nature", "light": "day", "title": "Plane tree avenue", "file": "img/photos/nature-plane-tree-avenue", "width": 1600, "height": 739, "alt": "A gravel avenue under a canopy of plane trees"},
  // ADD NEW PHOTOS ABOVE THIS LINE
];
