import { html, link } from "../core.js";
import { Seasons } from "../lib/seasons.js";

// The text block at the top of every guide: breadcrumb, city name,
// where it is, intro, key facts, and the call to action. Shared by the
// plain colour hero (GuidePage) and the photo hero (PhotoHero).
export function planHref(place) {
  return link(`?to=${encodeURIComponent(place.name)}#contact`);
}

export function guideIntro(place) {
  const best = new Seasons(place.seasons).bestRanges();
  const length = (place.itinerary.title.match(/\d+ days?/) || [""])[0];
  return html`
    <p class="guide-crumbs"><a href="${link("destinations/")}">Destinations</a></p>
    <h1 class="guide-title">${place.name}</h1>
    <p class="guide-where">${place.country} <span class="guide-coords">${place.coords}</span></p>
    <p class="guide-intro">${place.intro}</p>
    <dl class="guide-glance">
      <div><dt>Currency</dt><dd>${place.currency}</dd></div>
      <div><dt>Best time</dt><dd>${best}</dd></div>
      <div><dt>Sample plan</dt><dd>${length}</dd></div>
    </dl>
    <a class="btn btn-on-city" href="${planHref(place)}">Plan a trip to ${place.name}</a>
  `;
}
