import { Component, html, link, resolve } from "../core.js";
import { Seasons } from "../lib/seasons.js";
import { Photo } from "../lib/photo.js";

// <gta-destination data-from="destinations.london" data-slug="london">
// A card in the city's own colour (with its photo, if it has one),
// linking to its guide.
export class DestinationCard extends Component {
  static tag = "gta-destination";

  render(place) {
    const best = new Seasons(place.seasons).bestRanges();
    return html`
      <a class="destination" href="${link(`destinations/${this.dataset.slug}/`)}">
        <span class="destination-band${place.cardPhoto ? " has-photo" : ""}">
          ${place.cardPhoto ? new Photo(place.cardPhoto).tag({ className: "destination-photo", sizes: "(max-width: 560px) 100vw, 320px" }) : ""}
          <span class="destination-name">${place.name}</span>
          <span class="destination-country">${place.country}</span>
        </span>
        <span class="destination-body">
          <span class="destination-summary">${place.summary}</span>
          <span class="destination-best">Best: ${best}</span>
        </span>
      </a>
    `;
  }

  // Colour is set through the CSSOM: the site's CSP blocks inline style
  // attributes in markup, but not properties set from script.
  afterRender() {
    const place = this.data;
    Photo.applyPositions(this);
    this.style.setProperty("--city", place.accent);
    this.style.setProperty("--city-ink", place.accentInk);
  }
}

// <gta-destination-grid data-from="destinationOrder" [grouped] [data-exclude="london"]>
// All destinations, optionally grouped by region, composed of DestinationCards.
export class DestinationGrid extends Component {
  static tag = "gta-destination-grid";

  render(order) {
    const exclude = this.dataset.exclude;
    const slugs = order.filter((slug) => slug !== exclude);
    const card = (slug) => html`<gta-destination data-from="destinations.${slug}" data-slug="${slug}"></gta-destination>`;

    if (!this.hasAttribute("grouped")) {
      return html`<div class="destination-grid">${slugs.map(card)}</div>`;
    }

    const regions = resolve("regions");
    const destinations = resolve("destinations");
    return html`${regions.map((region) => {
      const inRegion = slugs.filter((slug) => destinations[slug].region === region.key);
      if (!inRegion.length) return "";
      return html`
        <section class="region" aria-labelledby="region-${region.key}">
          <h2 class="region-title" id="region-${region.key}">${region.name}</h2>
          <div class="destination-grid">${inRegion.map(card)}</div>
        </section>
      `;
    })}`;
  }
}
