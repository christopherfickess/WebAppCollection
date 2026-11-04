import { Component, html } from "../core.js";
import { Photo } from "../lib/photo.js";
import { guideIntro, planHref } from "./guide-intro.js";

// <gta-guide data-from="destinations.london" data-slug="london">
// A full destination guide. It lays out the page and hands each section
// to its own component by data path, so every part stays reusable.
export class GuidePage extends Component {
  static tag = "gta-guide";

  render(place) {
    const path = this.dataset.from;
    const slug = this.dataset.slug;
    const plan = planHref(place);

    // Three header styles, picked from the data: a photo slideshow
    // (scenes), colour + one photo side by side (photo), or colour only.
    const hero = place.scenes
      ? html`<gta-photo-hero data-from="${path}"></gta-photo-hero>`
      : html`
          <header class="guide-hero${place.photo ? " has-photo" : ""}">
            <div class="guide-hero-inner">${guideIntro(place)}</div>
            ${place.photo ? new Photo(place.photo).tag({ className: "guide-photo", sizes: "(max-width: 860px) 100vw, 50vw", eager: true }) : ""}
          </header>
        `;

    return html`
      ${hero}

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

        ${place.gallery
          ? html`<section class="guide-section" aria-labelledby="gallery-title">
              <h2 id="gallery-title">From our trip</h2>
              <p class="guide-checked">Photographed on our own visit to ${place.name}.</p>
              <gta-gallery data-from="${path}.gallery"></gta-gallery>
            </section>`
          : ""}

        <section class="guide-section" aria-labelledby="where-title">
          <h2 id="where-title">Where to stay and wander</h2>
          <gta-places data-from="${path}.neighbourhoods"></gta-places>
        </section>

        ${place.dayTrips
          ? html`<section class="guide-section" aria-labelledby="trips-title">
              <h2 id="trips-title">Worth the trip out</h2>
              <gta-day-trips data-from="${path}.dayTrips"></gta-day-trips>
            </section>`
          : ""}

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
          <a class="btn" href="${plan}">Plan a trip to ${place.name}</a>
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
    Photo.applyPositions(this);
    this.style.setProperty("--city", place.accent);
    this.style.setProperty("--city-ink", place.accentInk);
  }
}
