import { Component, html } from "../core.js";

// <gta-itinerary data-from="itinerary">
// A sample trip drawn as a route: one stop per leg, in travel order.
export class ItineraryCard extends Component {
  static tag = "gta-itinerary";

  render(trip) {
    return html`
      <aside class="itinerary" aria-labelledby="itin-title">
        <div class="itinerary-head">
          <h2 id="itin-title">${trip.title}</h2>
          <p>${trip.label}</p>
        </div>
        <ol class="route">
          ${trip.stops.map(
            (stop) => html`
              <li>
                <span class="route-days">${stop.days}</span>
                <span class="route-place">${stop.place}</span>
                <span class="route-note">${stop.note}</span>
              </li>
            `
          )}
        </ol>
        <p class="itinerary-foot">${trip.footnote}</p>
      </aside>
    `;
  }
}
