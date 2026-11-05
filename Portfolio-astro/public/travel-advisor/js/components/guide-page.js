import { Component, html, link, resolve } from "../core.js";
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

        ${place.caution
          ? html`<section class="guide-section caution" aria-labelledby="caution-title">
              <h2 id="caution-title">Hurricane season: be careful when you pick dates</h2>
              ${place.caution.text.map((p) => html`<p>${p}</p>`)}
              <p class="guide-checked">Source: NOAA and the National Hurricane Center. <a href="https://www.nhc.noaa.gov/" rel="noopener">Check the live forecast</a>.</p>
            </section>`
          : ""}

        ${place.budget
          ? html`<section class="guide-section" aria-labelledby="cost-title">
              <h2 id="cost-title">What it costs</h2>
              <p class="cost-line"><strong>${place.budget.amount}</strong> a day per person</p>
              <p class="guide-checked">The average past travellers report spending in ${place.name}, covering a hotel, food, local transport, and activities. It leaves out flights. The figure comes from Budget Your Trip, which does not date it, so use it as a starting point.</p>
            </section>`
          : ""}

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

        ${place.airlines
          ? html`<section class="guide-section" aria-labelledby="fly-title">
              <h2 id="fly-title">Getting there from the US</h2>
              <p>${place.airlines.intro}</p>
              <p class="guide-checked">${place.airlines.source} See <a href="${link("packing/")}">travel essentials</a> for choosing an airline.</p>
            </section>`
          : ""}

        ${place.shopping
          ? html`<section class="guide-section" aria-labelledby="shop-title">
              <h2 id="shop-title">Shopping</h2>
              <gta-definitions data-from="${path}.shopping"></gta-definitions>
            </section>`
          : ""}

        <section class="guide-section" aria-labelledby="before-title">
          <h2 id="before-title">Before you go</h2>
          <p class="guide-checked">For US passport holders. Checked November 2026; confirm entry rules on official sites before you book.</p>
          <gta-facts data-from="${path}.basics"></gta-facts>
        </section>

        ${place.advisory
          ? html`<section class="guide-section advisory" aria-labelledby="adv-title">
              <h2 id="adv-title">Travel advisory</h2>
              <p class="advisory-level level-${place.advisory.level}"><strong>Level ${place.advisory.level}</strong> ${place.advisory.label}</p>
              <ul class="advisory-reasons">${place.advisory.reasons.map((r) => html`<li>${r}</li>`)}</ul>
              <p class="guide-checked">US State Department. ${place.advisory.asOf} Levels change, so <a href="${place.advisory.url}" rel="noopener">read the current advisory</a> before you book. Packing list: <a href="${link("packing/")}">travel essentials</a>.</p>
            </section>`
          : ""}

        <section class="guide-cta" aria-labelledby="cta-title">
          <h2 id="cta-title">Want this trip planned for you?</h2>
          <p>Gredin builds the day-by-day plan, books it, and stays on call while you're in ${place.name}.</p>
          <a class="btn" href="${plan}">Plan a trip to ${place.name}</a>
        </section>

        ${this.stopNav(slug)}

        <section class="guide-section" aria-labelledby="more-title">
          <h2 id="more-title">More destinations</h2>
          <gta-destination-grid data-from="destinationOrder" data-exclude="${slug}"></gta-destination-grid>
        </section>
      </div>
    `;
  }

  // Previous and next destination, wrapping around the list.
  stopNav(slug) {
    const order = resolve("destinationOrder");
    const places = resolve("destinations");
    const i = order.indexOf(slug);
    const prev = order[(i - 1 + order.length) % order.length];
    const next = order[(i + 1) % order.length];
    const stop = (target, label, cls) => html`
      <a class="stop-link ${cls}" href="${link(`destinations/${target}/`)}">
        <span class="stop-label">${label}</span>
        <span class="stop-city">${places[target].name}</span>
        <span class="stop-country">${places[target].country}</span>
      </a>`;
    return html`<nav class="stop-nav" aria-label="Neighbouring guides">${stop(prev, "Previous stop", "is-prev")}${stop(next, "Next stop", "is-next")}</nav>`;
  }

  afterRender() {
    const place = this.data;
    Photo.applyPositions(this);
    this.style.setProperty("--city", place.accent);
    this.style.setProperty("--city-ink", place.accentInk);
  }
}
