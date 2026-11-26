import { Component, html } from "../core.js";
import { Photo } from "../lib/photo.js";
import { Slideshow } from "../lib/slideshow.js";
import { Lightbox } from "../lib/lightbox.js";
import { guideIntro } from "./guide-intro.js";

// <gta-photo-hero data-from="destinations.london">
// Full-bleed photo header for a guide: the scenes slide across on a timer,
// with arrows, swipe, and a labelled index to move between them, and an
// "Enlarge" button that opens the current photo in the lightbox. Text
// sits over a dark scrim so it stays readable on any photo.
export class PhotoHero extends Component {
  static tag = "gta-photo-hero";

  render(place) {
    const scenes = place.scenes;
    return html`
      <header class="photo-hero" aria-roledescription="carousel" aria-label="Photos of ${place.name}">
        <div class="photo-hero-slides">
          ${scenes.map(
            (scene, i) => html`<figure class="photo-hero-slide${i === 0 ? " is-active" : ""}" aria-hidden="${i === 0 ? "false" : "true"}">${new Photo(scene).tag({ className: "photo-hero-img", eager: i === 0, full: true })}</figure>`
          )}
        </div>
        ${scenes.length > 1
          ? html`<div class="photo-hero-nav">
              <button type="button" class="photo-hero-arrow" data-step="-1" aria-label="Previous photo">&#8249;</button>
              <button type="button" class="photo-hero-arrow" data-step="1" aria-label="Next photo">&#8250;</button>
              <button type="button" class="photo-hero-enlarge">Enlarge</button>
            </div>`
          : html`<div class="photo-hero-nav"><button type="button" class="photo-hero-enlarge">Enlarge</button></div>`}
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
    // Slides wait off-screen, so load them all up front.
    this.querySelectorAll(".photo-hero-img").forEach((img) => (img.loading = "eager"));
    this.current = 0;
    this.picks = [...this.querySelectorAll(".photo-hero-pick")];
    this.show = new Slideshow({ count: this.slides.length, onChange: (i) => this.select(i) });

    this.querySelectorAll(".photo-hero-arrow").forEach((btn) =>
      btn.addEventListener("click", () => {
        this.show.goTo(this.show.index + Number(btn.dataset.step));
        this.show.pause();
      })
    );
    this.querySelector(".photo-hero-enlarge").addEventListener("click", () => {
      Lightbox.attach().open(this.slides[this.current].querySelector("img"));
    });
    this.watchSwipe();

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

  // Slides sit to the right of the stage; the next one slides in from
  // there while the current one leaves to the left (and the reverse going
  // back). The incoming slide is parked on its starting side with no
  // transition before it animates.
  select(index) {
    const from = this.current;
    if (index !== from) {
      const n = this.slides.length;
      const forward = (index - from + n) % n <= n / 2;
      const incoming = this.slides[index];
      const leaving = this.slides[from];
      const start = forward ? "is-after" : "is-before";
      incoming.classList.add("no-anim");
      incoming.classList.remove("is-before", "is-after");
      incoming.classList.add(start);
      void incoming.offsetWidth;
      incoming.classList.remove("no-anim", start);
      incoming.classList.add("is-active");
      leaving.classList.remove("is-active");
      leaving.classList.add(forward ? "is-before" : "is-after");
      this.current = index;
    }
    this.slides.forEach((s, i) => s.setAttribute("aria-hidden", i === index ? "false" : "true"));
    this.picks.forEach((b, i) => b.setAttribute("aria-pressed", i === index ? "true" : "false"));
  }

  // Swipe left/right anywhere on the header (vertical scrolling still works).
  watchSwipe() {
    let start = null;
    this.addEventListener("pointerdown", (e) => {
      start = e.target.closest("button, a") ? null : { x: e.clientX, y: e.clientY };
    });
    this.addEventListener("pointerup", (e) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      start = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        this.show.goTo(this.show.index + (dx < 0 ? 1 : -1));
        this.show.pause();
      }
    });
    this.addEventListener("pointercancel", () => (start = null));
  }

  disconnectedCallback() {
    this.show?.destroy();
  }
}
