import { Component, html, link } from "../core.js";
import { Seasons } from "../lib/seasons.js";

// <gta-guide data-from="destinations.london" data-slug="london">
// A full destination guide. It lays out the page and hands each section
// to its own component by data path, so every part stays reusable.
export class GuidePage extends Component {
  static tag = "gta-guide";

  render(place) {
    const path = this.dataset.from;
    const slug = this.dataset.slug;
    const planHref = link(`?to=${encodeURIComponent(place.name)}#contact`);
    const best = new Seasons(place.seasons).bestRanges();

    return html`
      <header class="guide-hero${place.photo ? " has-photo" : ""}">
        <div class="guide-hero-inner">
          <p class="guide-crumbs"><a href="${link("destinations/")}">Destinations</a></p>
          <h1 class="guide-title">${place.name}</h1>
          <p class="guide-where">${place.country} <span class="guide-coords">${place.coords}</span></p>
          <p class="guide-intro">${place.intro}</p>
          <dl class="guide-glance">
            <div><dt>Currency</dt><dd>${place.currency}</dd></div>
            <div><dt>Best time</dt><dd>${best}</dd></div>
            <div><dt>Sample plan</dt><dd>${(place.itinerary.title.match(/\d+ days?/) || [""])[0]}</dd></div>
          </dl>
          <a class="btn btn-on-city" href="${planHref}">Plan a trip to ${place.name}</a>
        </div>
        ${place.photo
          ? html`<img class="guide-photo" src="${link(place.photo.src)}" width="${place.photo.width}" height="${place.photo.height}" alt="${place.photo.alt}" />`
          : ""}
      </header>

      <div class="guide-body">
        <section class="guide-section" aria-labelledby="when-title">
          <h2 id="when-title">When to go</h2>
          <gta-seasons data-from="${path}"></gta-seasons>
        </section>

        <section class="guide-section guide-split" aria-labelledby="plan-title">
          <div>
            <h2 id="plan-title">How to spend it</h2>
            <p class="guide-lede">${place.summary}</p>
          </div>
          <gta-itinerary data-from="${path}.itinerary"></gta-itinerary>
        </section>

        <section class="guide-section" aria-labelledby="where-title">
          <h2 id="where-title">Where to stay and wander</h2>
          <gta-places data-from="${path}.neighbourhoods"></gta-places>
        </section>

        <section class="guide-section" aria-labelledby="around-title">
          <h2 id="around-title">Getting around</h2>
          <gta-definitions data-from="${path}.gettingAround"></gta-definitions>
        </section>

        <section class="guide-section" aria-labelledby="before-title">
          <h2 id="before-title">Before you go</h2>
          <p class="guide-checked">For US passport holders. Checked November 2026; confirm entry rules on official sites before you book.</p>
          <gta-facts data-from="${path}.basics"></gta-facts>
        </section>

        <section class="guide-cta" aria-labelledby="cta-title">
          <h2 id="cta-title">Want this trip planned for you?</h2>
          <p>Gredin builds the day-by-day plan, books it, and stays on call while you're in ${place.name}.</p>
          <a class="btn" href="${planHref}">Plan a trip to ${place.name}</a>
        </section>

        <section class="guide-section" aria-labelledby="more-title">
          <h2 id="more-title">More destinations</h2>
          <gta-destination-grid data-from="destinationOrder" data-exclude="${slug}"></gta-destination-grid>
        </section>
      </div>
    `;
  }

  afterRender() {
    const place = this.data;
    this.style.setProperty("--city", place.accent);
    this.style.setProperty("--city-ink", place.accentInk);
  }
}
