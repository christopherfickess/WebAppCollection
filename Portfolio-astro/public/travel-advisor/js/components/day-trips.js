import { Component, html } from "../core.js";
import { Photo } from "../lib/photo.js";

// <gta-day-trips data-from="destinations.london.dayTrips">
// Places worth leaving the city for: text on one side, a pair of photos
// (one wide, one tall) on the other.
export class DayTrips extends Component {
  static tag = "gta-day-trips";

  render(trips) {
    return html`${trips.map(
      (trip) => html`
        <article class="day-trip">
          <div class="day-trip-copy">
            <h3>${trip.name}</h3>
            <p class="day-trip-where">${trip.where}</p>
            <p>${trip.text}</p>
          </div>
          <div class="day-trip-photos">
            ${trip.photos.map((p, i) => new Photo(p).tag({ className: `day-trip-photo day-trip-photo-${i + 1}`, zoom: true, sizes: "(max-width: 860px) 100vw, 30vw" }))}
          </div>
        </article>
      `
    )}`;
  }

  afterRender() {
    Photo.applyPositions(this);
  }
}
