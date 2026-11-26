import { Component, html } from "../core.js";
import { Seasons } from "../lib/seasons.js";

// <gta-seasons data-from="destinations.london">
// A twelve-month strip showing the best, good, and off-season months.
export class SeasonChart extends Component {
  static tag = "gta-seasons";

  render(place) {
    const seasons = new Seasons(place.seasons);
    return html`
      <div class="seasons">
        <ol class="season-strip" aria-label="Best months to visit ${place.name}">
          ${seasons.months().map(
            (m) => html`<li class="season season-${m.rating}"><span class="season-month" aria-hidden="true">${m.short}</span><span class="visually-hidden">${m.name}: ${m.label}</span></li>`
          )}
        </ol>
        <ul class="season-key" aria-hidden="true">
          ${[2, 1, 0].map((r) => html`<li><span class="season-swatch season-${r}"></span>${Seasons.label(r)}</li>`)}
        </ul>
        <p class="season-note">${place.seasonNote}</p>
      </div>
    `;
  }
}
