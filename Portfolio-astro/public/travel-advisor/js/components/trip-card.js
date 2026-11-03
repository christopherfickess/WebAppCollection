import { Component, html } from "../core.js";

// <gta-trip data-from="trips.0"> - one sample trip.
// Add the `feature` attribute for the large card.
export class TripCard extends Component {
  static tag = "gta-trip";

  get isFeature() {
    return this.hasAttribute("feature");
  }

  render(trip) {
    return html`
      <article class="trip${this.isFeature ? " trip-feature" : ""}">
        <img src="${trip.image.src}" width="${trip.image.width}" height="${trip.image.height}" alt="${trip.image.alt}" loading="lazy" decoding="async" />
        <div class="trip-copy">
          <h3>${trip.name}</h3>
          <p class="trip-meta">${trip.length}, ${trip.season}</p>
          <p>${trip.summary}</p>
        </div>
      </article>
    `;
  }
}

// <gta-trip-grid data-from="trips">
// Lays out every trip, the first one featured. Composes TripCard
// instances rather than duplicating their markup.
export class TripGrid extends Component {
  static tag = "gta-trip-grid";

  render(trips) {
    const path = this.dataset.from;
    return html`
      <div class="trip-grid">
        ${trips.map(
          (_, i) => html`<gta-trip data-from="${path}.${i}"${i === 0 ? html` feature` : ""}></gta-trip>`
        )}
      </div>
    `;
  }
}
