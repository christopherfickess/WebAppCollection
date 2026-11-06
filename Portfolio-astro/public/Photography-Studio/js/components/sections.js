import { Component, html, link } from "../core.js";
import { Photo } from "../lib/photo.js";

// <fx-hero data-from="hero">  The fox and palm leaves are plain images;
// the leaves sway with CSS (and stand still for reduced-motion users).
export class Hero extends Component {
  static tag = "fx-hero";

  render(h) {
    return html`
      <div class="hero-copy">
        <h1>${h.title}</h1>
        <p>${h.text}</p>
        <div class="hero-actions">
          <a class="btn" href="${link(h.primary.href)}">${h.primary.label}</a>
          <a class="btn btn-ghost" href="${link(h.secondary.href)}">${h.secondary.label}</a>
        </div>
      </div>
      <div class="hero-art" aria-hidden="true">
        <img class="leaf leaf-a" src="${link("img/leaf-1.png")}" alt="" width="360" height="360" />
        <img class="leaf leaf-b" src="${link("img/leaf-2.png")}" alt="" width="360" height="541" />
        <img class="fox" src="${link("img/fox.png")}" alt="" width="488" height="511" fetchpriority="high" />
      </div>
    `;
  }
}

// <fx-about data-from="about">
export class About extends Component {
  static tag = "fx-about";

  render(a) {
    return html`
      <div class="about-photo">${new Photo(a.image).tag({ sizes: "(max-width: 860px) 100vw, 40vw" })}</div>
      <div class="about-text">
        <h2 id="about-title">${a.title}</h2>
        ${a.blocks.map((b) => html`<h3>${b.title}</h3><p>${b.text}</p>`)}
      </div>
    `;
  }
}

// <fx-gallery data-from="gallery">  Filter chips plus a photo grid; each
// photo opens in the lightbox. Categories come from galleryCategories.
export class Gallery extends Component {
  static tag = "fx-gallery";

  render(photos) {
    const cats = this.categories();
    return html`
      <div class="filters" role="group" aria-label="Filter photos">
        <button class="chip" type="button" aria-pressed="true" data-filter="">All</button>
        ${cats.map((c) => html`<button class="chip" type="button" aria-pressed="false" data-filter="${c}">${c}</button>`)}
      </div>
      <div class="gallery-grid">
        ${photos.map(
          (p) => html`<figure class="shot" data-category="${p.category}">
            ${new Photo(p).tag({ className: "gallery-img", sizes: "(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw", zoom: true })}
            <figcaption>${p.title}</figcaption>
          </figure>`
        )}
      </div>
    `;
  }

  categories() {
    return this.dataset.categories ? this.dataset.categories.split(",") : [...new Set(this.data.map((p) => p.category))];
  }

  afterRender() {
    const chips = [...this.querySelectorAll(".chip")];
    this.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
      this.querySelectorAll(".shot").forEach((s) => {
        s.hidden = !!chip.dataset.filter && s.dataset.category !== chip.dataset.filter;
      });
    });
  }
}

// <fx-packages data-from="packages">
export class Packages extends Component {
  static tag = "fx-packages";

  render(items) {
    return html`${items.map(
      (p) => html`<article class="package${p.featured ? " is-featured" : ""}">
        <h3>${p.name}</h3>
        <p class="package-price">${p.price}</p>
        <p class="package-detail">${p.detail}</p>
        <ul>${p.points.map((x) => html`<li>${x}</li>`)}</ul>
        <a class="btn ${p.featured ? "" : "btn-ghost"}" href="${link("?package=" + encodeURIComponent(p.name) + "#contact")}">Ask about ${p.name.toLowerCase()}</a>
      </article>`
    )}`;
  }
}

// <fx-steps data-from="steps">  A real sequence, so these are numbered.
export class Steps extends Component {
  static tag = "fx-steps";

  render(steps) {
    return html`<ol class="steps">${steps.map((s) => html`<li><h3>${s.title}</h3><p>${s.text}</p></li>`)}</ol>`;
  }
}

// <fx-faq data-from="faq">  Native <details>, so it works without script.
export class Faq extends Component {
  static tag = "fx-faq";

  render(items) {
    return html`${items.map((i) => html`<details class="faq-item"><summary>${i.q}</summary><p>${i.a}</p></details>`)}`;
  }
}
