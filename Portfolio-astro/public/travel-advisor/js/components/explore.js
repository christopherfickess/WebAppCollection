import { Component, html, link, resolve } from "../core.js";
import { Seasons, MONTHS, MONTH_NAMES } from "../lib/seasons.js";

// <gta-months data-from="destinationOrder">
// "Where to go in...": pick a month, see which guides are in season.
export class MonthPicker extends Component {
  static tag = "gta-months";

  render() {
    return html`
      <div class="months" role="group" aria-label="Month of travel">
        ${MONTHS.map((short, i) => html`<button type="button" class="month" data-month="${i}" aria-pressed="false">${short}</button>`)}
      </div>
      <div class="month-results" aria-live="polite"></div>
    `;
  }

  afterRender() {
    this.results = this.querySelector(".month-results");
    this.querySelector(".months").addEventListener("click", (e) => {
      const button = e.target.closest(".month");
      if (button) this.show(Number(button.dataset.month));
    });
    this.show(new Date().getMonth());
  }

  show(month) {
    this.querySelectorAll(".month").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.month) === month)));
    const places = resolve("destinations");
    const rated = this.data.map((slug) => ({ slug, place: places[slug], rating: new Seasons(places[slug].seasons).ratings[month] }));
    const best = rated.filter((r) => r.rating === 2);
    const good = rated.filter((r) => r.rating === 1);
    const item = (r) => html`<li><a href="${link(`destinations/${r.slug}/`)}"><span class="month-city">${r.place.name}</span><span class="month-where">${r.place.country}</span></a></li>`;
    this.results.innerHTML = String(html`
      <h3 class="month-title">In ${MONTH_NAMES[month]}</h3>
      ${best.length ? html`<p class="month-label">Best</p><ul class="month-list">${best.map(item)}</ul>` : ""}
      ${good.length ? html`<p class="month-label">Also good</p><ul class="month-list is-quiet">${good.map(item)}</ul>` : ""}
      ${!best.length && !good.length ? html`<p class="month-none">Nothing is in season in ${MONTH_NAMES[month]}. Try a neighbouring month.</p>` : ""}
    `);
  }
}

// <gta-testimonials data-from="testimonials">
// Real quotes only: hides its own section until there is at least one.
export class Testimonials extends Component {
  static tag = "gta-testimonials";

  render(items) {
    if (!items.length) return "";
    return html`
      <div class="quotes">
        ${items.map(
          (q) => html`<figure class="quote-card"><blockquote>${q.quote}</blockquote><figcaption>${q.name}${q.trip ? html`, ${q.trip}` : ""}</figcaption></figure>`
        )}
      </div>
    `;
  }

  afterRender() {
    if (!this.data.length) this.closest("section")?.setAttribute("hidden", "");
  }
}

// <gta-notes data-from="notes">  A list of field notes.
export class NoteList extends Component {
  static tag = "gta-notes";

  render(notes) {
    return html`
      <div class="note-grid">
        ${notes.map(
          (n) => html`
            <article class="note-card">
              <p class="note-date">${n.date}</p>
              <h2><a href="${link(`field-notes/${n.slug}/`)}">${n.title}</a></h2>
              <p>${n.summary}</p>
            </article>
          `
        )}
      </div>
    `;
  }
}

// <gta-note data-from="notes.0">  One field note.
export class NotePage extends Component {
  static tag = "gta-note";

  render(note) {
    const place = resolve(`destinations.${note.guide}`);
    return html`
      <article class="note">
        <a class="note-back" href="${link("field-notes/")}">Field notes</a>
        <p class="note-date">${note.date}</p>
        <h1>${note.title}</h1>
        <div class="note-body">${note.body.map((p) => html`<p>${p}</p>`)}</div>
        ${place
          ? html`<p class="note-guide">More in the <a href="${link(`destinations/${note.guide}/`)}">${place.name} guide</a>.</p>`
          : ""}
        <p class="guide-checked">Facts checked in November 2026. Fares, prices, and hours change; confirm them on the official sites before you go.</p>
      </article>
    `;
  }
}
