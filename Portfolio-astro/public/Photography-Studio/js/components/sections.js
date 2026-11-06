import { Component, html, link, resolve } from "../core.js";
import { Photo } from "../lib/photo.js";

// <fx-hero data-from="hero">  A full-screen photo with the fox in front
// and the ferns swaying behind it (CSS only; still for reduced motion).
export class Hero extends Component {
  static tag = "fx-hero";

  render(h) {
    return html`
      <div class="hero-bg">${new Photo(h.image).tag({ className: "hero-photo", sizes: "100vw", eager: true })}</div>
      <div class="hero-art" aria-hidden="true">
        <img class="leaf leaf-a" src="${link("img/leaf-1.webp")}" alt="" width="360" height="360" />
        <img class="leaf leaf-b" src="${link("img/leaf-2.webp")}" alt="" width="360" height="541" />
        <img class="fox" src="${link("img/fox.webp")}" alt="" width="488" height="511" fetchpriority="high" />
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
    const sets = [...new Set(photos.map((p) => p.set))];
    const order = ["Dawn", "Day", "Dusk", "Night"];
    const cats = [...new Set(photos.map((p) => p.category))].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    return html`
      <div class="gallery-bar">
        <div class="filter-rows">
          ${sets.length > 1
            ? html`<div class="filters" role="group" aria-label="Collection">
                <button class="chip" type="button" aria-pressed="true" data-key="set" data-filter="">All</button>
                ${sets.map((c) => html`<button class="chip" type="button" aria-pressed="false" data-key="set" data-filter="${c}">${c}</button>`)}
              </div>`
            : ""}
          <div class="filters" role="group" aria-label="Time of day">
            <button class="chip" type="button" aria-pressed="true" data-key="category" data-filter="">Any light</button>
            ${cats.map((c) => html`<button class="chip" type="button" aria-pressed="false" data-key="category" data-filter="${c}">${c}</button>`)}
          </div>
        </div>
        <div class="strip-nav">
          <button class="strip-btn" type="button" data-dir="-1" aria-label="Scroll photos left">&#8249;</button>
          <button class="strip-btn" type="button" data-dir="1" aria-label="Scroll photos right">&#8250;</button>
        </div>
      </div>
      <div class="strip" tabindex="0" role="region" aria-label="Photos, scroll sideways">
        ${photos.map(
          (p) => html`<figure class="shot" data-set="${p.set}" data-category="${p.category}">
            ${new Photo(p).tag({ className: "gallery-img", sizes: `calc(clamp(17rem, 62vh, 34rem) * ${(p.width / p.height).toFixed(3)})`, zoom: true })}
            <figcaption>${p.title}</figcaption>
          </figure>`
        )}
      </div>
      <p class="gallery-empty" hidden>No photos in that combination yet. Try another collection or time of day.</p>
    `;
  }

  afterRender() {
    const strip = this.querySelector(".strip");
    const empty = this.querySelector(".gallery-empty");
    const chosen = { set: "", category: "" };
    const apply = () => {
      let shown = 0;
      this.querySelectorAll(".shot").forEach((s) => {
        s.hidden = (chosen.set && s.dataset.set !== chosen.set) || (chosen.category && s.dataset.category !== chosen.category);
        if (!s.hidden) shown++;
      });
      empty.hidden = shown > 0;
      strip.scrollTo({ left: 0 });
    };
    const choose = (chip) => {
      chip.parentElement.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
      chosen[chip.dataset.key] = chip.dataset.filter;
    };
    this.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (chip) {
        choose(chip);
        apply();
      }
      const btn = e.target.closest(".strip-btn");
      if (btn) strip.scrollBy({ left: Number(btn.dataset.dir) * strip.clientWidth * 0.8, behavior: "smooth" });
    });
    // ?set=Spain opens the gallery on one collection.
    const wanted = new URLSearchParams(location.search).get("set")?.toLowerCase();
    const first = [...this.querySelectorAll('.chip[data-key="set"]')].find((c) => c.dataset.filter.toLowerCase() === wanted);
    if (first) {
      choose(first);
      apply();
    }
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

// <fx-day data-from="day">  A timeline of a session, from before sunrise
// to the delivered photos. Each dot takes the colour of that light.
export class Day extends Component {
  static tag = "fx-day";

  render(items) {
    return html`<ol class="day">${items.map((d) => html`<li data-light="${d.light}"><h3>${d.title}</h3><p>${d.text}</p></li>`)}</ol>`;
  }
}

// <fx-trail>  Paw prints walking across the page between sections.
export class Trail extends Component {
  static tag = "fx-trail";

  render() {
    const paw = html`<svg class="paw" viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="16" rx="5.5" ry="4.6"/><circle cx="5.5" cy="10.5" r="2.2"/><circle cx="9.5" cy="6" r="2.2"/><circle cx="14.5" cy="6" r="2.2"/><circle cx="18.5" cy="10.5" r="2.2"/></svg>`;
    return html`<div class="trail" aria-hidden="true">${[0, 1, 2, 3, 4, 5, 6, 7].map(() => paw)}</div>`;
  }
}

// <fx-wall data-from="gallery">  "See it on your wall": pick a photo, a
// print size, and a wall colour, and see the print at true scale next to a
// 7 ft sofa. Wall is 120 in wide by 96 in tall. Sizes: printSizes in data.js.
const WALL = { w: 120, h: 96 };
const WALLS = [
  { name: "Warm white", color: "#e9e2d4" },
  { name: "Sage", color: "#9db09a" },
  { name: "Clay", color: "#b98568" },
  { name: "Slate", color: "#4d5a63" },
];

export class Wall extends Component {
  static tag = "fx-wall";

  render(photos) {
    const sizes = resolve("printSizes");
    return html`
      <div class="wall-ui">
        <div class="wall-room" role="img" aria-label="A print shown on a wall above a sofa, to scale">
          <div class="wall-print"></div>
          <div class="wall-sofa"></div>
        </div>
        <div class="wall-controls">
          <fieldset><legend>Photo</legend>
            <div class="wall-thumbs">${photos.map((p, i) => html`<button type="button" class="wall-thumb" data-photo="${i}" aria-pressed="${i === 0}" aria-label="${p.title}">${new Photo(p).tag({ className: "wall-thumb-img", sizes: "5rem" })}</button>`)}</div>
          </fieldset>
          <fieldset><legend>Print size</legend>
            <div class="wall-opts">${sizes.map((s, i) => html`<button type="button" class="wall-opt" data-size="${i}" aria-pressed="${i === 1}">${s.label}</button>`)}</div>
          </fieldset>
          <fieldset><legend>Wall colour</legend>
            <div class="wall-opts">${WALLS.map((w, i) => html`<button type="button" class="wall-swatch" data-wall="${i}" aria-pressed="${i === 0}" aria-label="${w.name}" title="${w.name}"></button>`)}</div>
          </fieldset>
          <p class="wall-note" aria-live="polite"></p>
        </div>
      </div>
    `;
  }

  afterRender() {
    this.state = { photo: 0, size: 1, wall: 0 };
    this.room = this.querySelector(".wall-room");
    this.print = this.querySelector(".wall-print");
    this.note = this.querySelector(".wall-note");
    this.querySelectorAll(".wall-swatch").forEach((b, i) => b.style.setProperty("--swatch", WALLS[i].color));
    Photo.applyPositions(this);
    this.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-photo], button[data-size], button[data-wall]");
      if (!b) return;
      const key = b.hasAttribute("data-photo") ? "photo" : b.hasAttribute("data-size") ? "size" : "wall";
      this.state[key] = Number(b.dataset[key]);
      b.parentElement.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      this.draw();
    });
    this.draw();
  }

  sizes() { return resolve("printSizes"); }

  draw() {
    const photo = this.data[this.state.photo];
    const size = this.sizes()[this.state.size];
    const landscape = photo.height < photo.width;
    const w = landscape ? Math.max(size.w, size.h) : Math.min(size.w, size.h);
    const h = landscape ? Math.min(size.w, size.h) : Math.max(size.w, size.h);
    this.room.style.setProperty("--wall", WALLS[this.state.wall].color);
    this.print.style.setProperty("--pw", `${(w / WALL.w) * 100}%`);
    this.print.style.setProperty("--ph", `${(h / WALL.h) * 100}%`);
    this.print.innerHTML = String(new Photo(photo).tag({ className: "wall-img", sizes: "(max-width: 860px) 90vw, 45vw" }));
    Photo.applyPositions(this.print);
    this.note.textContent = `${w} x ${h} in print on a 10 ft wall, beside a 7 ft sofa.`;
  }
}

// <fx-faq data-from="faq">  Native <details>, so it works without script.
export class Faq extends Component {
  static tag = "fx-faq";

  render(items) {
    return html`${items.map((i) => html`<details class="faq-item"><summary>${i.q}</summary><p>${i.a}</p></details>`)}`;
  }
}
