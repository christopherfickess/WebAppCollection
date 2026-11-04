import { Component, html } from "../core.js";
import { Photo } from "../lib/photo.js";
import { Slideshow } from "../lib/slideshow.js";
import { guideIntro } from "./guide-intro.js";

// <gta-photo-hero data-from="destinations.london">
// Full-bleed photo header for a guide: the scenes cross-fade on a timer,
// and a labelled index along the bottom lets people jump to one. Text
// sits over a dark scrim so it stays readable on any photo.
export class PhotoHero extends Component {
  static tag = "gta-photo-hero";

  render(place) {
    const scenes = place.scenes;
    return html`
      <header class="photo-hero" aria-roledescription="carousel" aria-label="Photos of ${place.name}">
        <div class="photo-hero-slides">
          ${scenes.map(
            (scene, i) => html`<figure class="photo-hero-slide${i === 0 ? " is-active" : ""}" aria-hidden="${i === 0 ? "false" : "true"}">${new Photo(scene).tag({ className: "photo-hero-img", eager: i === 0 })}</figure>`
          )}
        </div>
        <div class="photo-hero-inner">
          <div class="photo-hero-text">${guideIntro(place)}</div>
          ${scenes.length > 1
            ? html`<ol class="photo-hero-index" aria-label="Choose a photo">
                ${scenes.map(
                  (scene, i) => html`<li><button type="button" class="photo-hero-pick" data-index="${i}" aria-pressed="${i === 0 ? "true" : "false"}"><span class="pick-num">${String(i + 1).padStart(2, "0")}</span> ${scene.label}</button></li>`
                )}
              </ol>`
            : ""}
        </div>
      </header>
    `;
  }

  afterRender() {
    Photo.applyPositions(this);
    this.slides = [...this.querySelectorAll(".photo-hero-slide")];
    this.picks = [...this.querySelectorAll(".photo-hero-pick")];
    this.show = new Slideshow({ count: this.slides.length, onChange: (i) => this.select(i) });

    this.picks.forEach((btn) =>
      btn.addEventListener("click", () => {
        this.show.goTo(Number(btn.dataset.index));
        this.show.pause(); // someone chose a photo: stop rotating away from it
      })
    );
    // Hold still while someone is reading or tabbing through the hero.
    this.addEventListener("pointerenter", () => this.show.pause());
    this.addEventListener("pointerleave", () => this.show.resume());
    this.addEventListener("focusin", () => this.show.pause());
    this.show.start();
  }

  select(index) {
    this.slides.forEach((s, i) => {
      s.classList.toggle("is-active", i === index);
      s.setAttribute("aria-hidden", i === index ? "false" : "true");
    });
    this.picks.forEach((b, i) => b.setAttribute("aria-pressed", i === index ? "true" : "false"));
  }

  disconnectedCallback() {
    this.show?.destroy();
  }
}
