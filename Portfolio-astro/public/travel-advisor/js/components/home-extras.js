import { Component, html, link, resolve } from "../core.js";

// <gta-proof data-from="proof">
// A strip of figures counted from the guides themselves.
export class ProofStrip extends Component {
  static tag = "gta-proof";

  render(items) {
    return html`
      <ul class="proof-strip">
        ${items.map((item) => html`<li><strong>${item.value}</strong><span>${item.label}</span></li>`)}
      </ul>
    `;
  }
}

// <gta-pills data-from="destinationOrder">
// Every destination as a link in one wrapping row: a quick way to jump.
export class DestinationPills extends Component {
  static tag = "gta-pills";

  render(order) {
    const places = resolve("destinations");
    return html`
      <ul class="pills" aria-label="Jump to a destination">
        ${order.map((slug) => html`<li><a href="${link(`destinations/${slug}/`)}">${places[slug].name}</a></li>`)}
      </ul>
    `;
  }
}

// <gta-faq data-from="faq">
// Questions and answers as native <details>, so it needs no script.
export class Faq extends Component {
  static tag = "gta-faq";

  render(items) {
    return html`
      <div class="faq">
        ${items.map((item) => html`<details><summary>${item.q}</summary><p>${item.a}</p></details>`)}
      </div>
    `;
  }
}

// <gta-trips data-from="featuredTrips">
// Sample trips, drawn from each guide's own sample plan.
export class FeaturedTrips extends Component {
  static tag = "gta-trips";

  render(slugs) {
    const places = resolve("destinations");
    const regions = resolve("regions");
    return html`
      <div class="trip-grid">
        ${slugs.map((slug) => {
          const place = places[slug];
          const region = regions.find((r) => r.key === place.region);
          return html`
            <article class="trip">
              <p class="trip-tag">${region ? region.name : place.country}</p>
              <h3><a href="${link(`destinations/${slug}/`)}">${place.itinerary.title}</a></h3>
              <p class="trip-summary">${place.summary}</p>
              <ul class="trip-stops">
                ${place.itinerary.stops.slice(0, 3).map((stop) => html`<li><strong>${stop.place}</strong> ${stop.note}</li>`)}
              </ul>
              <a class="trip-link" href="${link(`destinations/${slug}/`)}">Read the guide</a>
            </article>
          `;
        })}
      </div>
    `;
  }
}

// <gta-quote data-from="quote">
// A closing call to action with what you get.
export class QuoteBlock extends Component {
  static tag = "gta-quote";

  render(quote) {
    return html`
      <div class="quote-block">
        <div>
          <h2>${quote.title}</h2>
          <ul class="quote-points">
            ${quote.points.map((point) => html`<li>${point}</li>`)}
          </ul>
        </div>
        <a class="btn btn-light" href="${link(quote.cta.href)}">${quote.cta.label}</a>
      </div>
    `;
  }
}
