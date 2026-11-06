import { Component, html, link } from "../core.js";
import { Photo } from "../lib/photo.js";

// <fx-hero data-from="hero">  A full-screen photo with the fox in front
// and the ferns swaying behind it (CSS only; still for reduced motion).
export class Hero extends Component {
  static tag = "fx-hero";

  render(h) {
    return html`
      <div class="hero-bg">${new Photo(h.image).tag({ className: "hero-photo", sizes: "100vw", eager: true })}</div>
      <div class="hero-art" aria-hidden="true">
        <img class="leaf leaf-a" src="${link("img/leaf-1.png")}" alt="" width="360" height="360" />
        <img class="leaf leaf-b" src="${link("img/leaf-2.png")}" alt="" width="360" height="541" />
        <img class="fox" src="${link("img/fox.png")}" alt="" width="488" height="511" fetchpriority="high" />
      </div>
      <div class="hero-copy">
        <h1>${h.title}</h1>
        <p>${h.text}</p>
        <div class="hero-actions">
          <a class="btn" href="${link(h.primary.href)}">${h.primary.label}</a>
          <a class="btn btn-ghost" href="${link(h.secondary.href)}">${h.secondary.label}</a>
        </div>
      </div>
    `;
  }
}

// <fx-about data-from="about">
export class About extends Component {
  static tag = "fx-about";

  render(a) {
    return html`
      <div class="about-text">
        <h2 id="about-title">${a.title}</h2>
        <p class="about-lead">${a.lead}</p>
        <div class="about-blocks">${a.blocks.map((b) => html`<div><h3>${b.title}</h3><p>${b.text}</p></div>`)}</div>
      </div>
      <div class="about-photo">${new Photo(a.image).tag({ sizes: "(max-width: 860px) 100vw, 40vw" })}</div>
    `;
  }
}

// <fx-gallery data-from="gallery">  Filter tabs and a sideways-scrolling
// strip of photos; each photo opens in the lightbox.
export class Gallery extends Component {
  static tag = "fx-gallery";

  render(photos) {
    const cats = [...new Set(photos.map((p) => p.category))];
    return html`
      <div class="gallery-bar">
        <div class="filters" role="group" aria-label="Filter photos">
          <button class="chip" type="button" aria-pressed="true" data-filter="">All</button>
          ${cats.map((c) => html`<button class="chip" type="button" aria-pressed="false" data-filter="${c}">${c}</button>`)}
        </div>
        <div class="strip-nav">
          <button class="strip-btn" type="button" data-dir="-1" aria-label="Scroll photos left">&#8249;</button>
          <button class="strip-btn" type="button" data-dir="1" aria-label="Scroll photos right">&#8250;</button>
        </div>
      </div>
      <div class="strip" tabindex="0" role="region" aria-label="Photos, scroll sideways">
        ${photos.map(
          (p) => html`<figure class="shot" data-category="${p.category}">
            ${new Photo(p).tag({ className: "gallery-img", sizes: "(max-width: 700px) 80vw, 45vw", zoom: true })}
            <figcaption>${p.title}</figcaption>
          </figure>`
        )}
      </div>
    `;
  }

  afterRender() {
    const chips = [...this.querySelectorAll(".chip")];
    const strip = this.querySelector(".strip");
    this.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (chip) {
        chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
        this.querySelectorAll(".shot").forEach((s) => {
          s.hidden = !!chip.dataset.filter && s.dataset.category !== chip.dataset.filter;
        });
        strip.scrollTo({ left: 0 });
      }
      const btn = e.target.closest(".strip-btn");
      if (btn) strip.scrollBy({ left: Number(btn.dataset.dir) * strip.clientWidth * 0.8, behavior: "smooth" });
    });
  }
}

// <fx-packages data-from="packages">  A price list, one row per package.
export class Packages extends Component {
  static tag = "fx-packages";

  render(items) {
    return html`${items.map(
      (p) => html`<article class="package${p.featured ? " is-featured" : ""}">
        <div class="package-main">
          <h3>${p.name}</h3>
          <p class="package-detail">${p.detail}</p>
        </div>
        <ul>${p.points.map((x) => html`<li>${x}</li>`)}</ul>
        <div class="package-end">
          <p class="package-price">${p.price}</p>
          <a href="${link("?package=" + encodeURIComponent(p.name) + "#contact")}">Ask about this</a>
        </div>
      </article>`
    )}`;
  }
}

// <fx-steps data-from="steps">  A real sequence, so these are numbered.
export class Steps extends Component {
  static tag = "fx-steps";

  render(steps) {
    return html`<ol class="steps">${steps.map((s) => html`<li><div><h3>${s.title}</h3><p>${s.text}</p></div></li>`)}</ol>`;
  }
}

// <fx-faq data-from="faq">  Native <details>, so it works without script.
export class Faq extends Component {
  static tag = "fx-faq";

  render(items) {
    return html`${items.map((i) => html`<details class="faq-item"><summary>${i.q}</summary><p>${i.a}</p></details>`)}`;
  }
}
