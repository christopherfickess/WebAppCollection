// A full-screen photo viewer for every photo marked data-full.
// - Opens from the photo you clicked, growing out of its place on the page.
// - Click or tap the photo to zoom in on that spot; click again to zoom out.
//   Mouse wheel and two-finger pinch zoom smoothly; drag to pan.
// - Left/right arrows, the buttons, or a swipe move between the photos on
//   the page. Esc, the close button, or a click on the dark area closes it.
// One instance serves the whole page; Lightbox.attach() creates it.
const SCOPE = ".gallery, .day-trip, .photo-hero";
const MAX = 4;
const TAP_ZOOM = 2.4;
const EASE = "cubic-bezier(0.2, 0.7, 0.2, 1)";

let instance = null;

export class Lightbox {
  static attach() {
    instance ??= new Lightbox();
    return instance;
  }

  constructor() {
    this.items = [];
    this.index = 0;
    this.origin = null; // the page photo the viewer opened from
    this.reset();
    this.pointers = new Map();
    this.build();
    document.addEventListener("click", (e) => this.onPageClick(e));
    document.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target.matches?.("img[data-full][tabindex]")) {
        e.preventDefault();
        this.open(e.target);
      }
    });
  }

  reset() {
    this.scale = 1;
    this.x = 0;
    this.y = 0;
  }

  build() {
    const d = (this.dialog = document.createElement("dialog"));
    d.className = "lightbox";
    d.setAttribute("aria-label", "Photo viewer");
    d.innerHTML = `
      <div class="lightbox-stage">
        <img class="lightbox-img" alt="" draggable="false" />
      </div>
      <div class="lightbox-bar">
        <p class="lightbox-caption" aria-live="polite"></p>
        <p class="lightbox-count"></p>
      </div>
      <button type="button" class="lightbox-btn lightbox-close" aria-label="Close photo viewer">&times;</button>
      <button type="button" class="lightbox-btn lightbox-zoom" aria-label="Zoom in">+</button>
      <button type="button" class="lightbox-btn lightbox-prev" aria-label="Previous photo">&#8249;</button>
      <button type="button" class="lightbox-btn lightbox-next" aria-label="Next photo">&#8250;</button>`;
    document.body.append(d);

    this.stage = d.querySelector(".lightbox-stage");
    this.img = d.querySelector(".lightbox-img");
    this.caption = d.querySelector(".lightbox-caption");
    this.count = d.querySelector(".lightbox-count");
    this.zoomBtn = d.querySelector(".lightbox-zoom");
    this.prevBtn = d.querySelector(".lightbox-prev");
    this.nextBtn = d.querySelector(".lightbox-next");

    d.querySelector(".lightbox-close").addEventListener("click", () => this.close());
    this.zoomBtn.addEventListener("click", () => this.toggleZoom());
    this.prevBtn.addEventListener("click", () => this.step(-1));
    this.nextBtn.addEventListener("click", () => this.step(1));
    // Esc: animate out instead of vanishing.
    d.addEventListener("cancel", (e) => {
      e.preventDefault();
      this.close();
    });
    d.addEventListener("keydown", (e) => this.onKey(e));
    this.stage.addEventListener("wheel", (e) => this.onWheel(e), { passive: false });
    this.stage.addEventListener("pointerdown", (e) => this.onDown(e));
    this.stage.addEventListener("pointermove", (e) => this.onMove(e));
    this.stage.addEventListener("pointerup", (e) => this.onUp(e));
    this.stage.addEventListener("pointercancel", (e) => this.onUp(e));
  }

  onPageClick(e) {
    const img = e.target.closest?.("img[data-full]");
    if (img && img.closest(SCOPE) && !img.closest(".photo-hero-slides")) this.open(img);
  }

  open(thumb) {
    this.items = [...document.querySelectorAll("img[data-full]")]
      .filter((i) => i.closest(SCOPE))
      .map((i) => ({
        thumb: i,
        full: i.dataset.full,
        alt: i.alt,
        caption: i.closest("figure")?.querySelector("figcaption")?.textContent.trim() || i.alt,
      }));
    this.index = Math.max(0, this.items.findIndex((it) => it.thumb === thumb));
    this.origin = thumb;
    this.dialog.showModal();
    document.documentElement.classList.add("lightbox-open");
    this.show(this.index, false);
    this.grow(thumb);
    this.zoomBtn.focus({ preventScroll: true });
  }

  // Show item i. The photo already on the page appears at once, then the
  // large file replaces it as soon as it has decoded.
  show(i, fade = true) {
    this.index = (i + this.items.length) % this.items.length;
    const item = this.items[this.index];
    const apply = () => {
      this.reset();
      this.paint(false);
      this.img.alt = item.alt;
      this.img.src = item.thumb.currentSrc || item.thumb.src;
      const big = new Image();
      big.src = item.full;
      big.decode().then(() => {
        if (this.items[this.index] === item) this.img.src = item.full;
      }, () => {});
      this.caption.textContent = item.caption;
      this.count.textContent = `${this.index + 1} / ${this.items.length}`;
      this.img.style.opacity = "1";
    };
    const many = this.items.length > 1;
    this.prevBtn.hidden = this.nextBtn.hidden = !many;
    this.count.hidden = !many;
    if (fade) {
      this.img.style.transition = "opacity 140ms ease";
      this.img.style.opacity = "0";
      setTimeout(apply, 140);
    } else {
      apply();
    }
  }

  step(dir) {
    if (this.items.length > 1) this.show(this.index + dir);
  }

  // Grow out of (or shrink back into) the photo on the page.
  grow(thumb) {
    const to = this.img.getBoundingClientRect();
    const from = thumb.getBoundingClientRect();
    if (!to.width || !from.width) return;
    const sx = from.width / to.width;
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    this.img.style.transition = "none";
    this.img.style.transform = `translate(${dx}px, ${dy}px) scale(${sx})`;
    this.img.style.opacity = "0.2";
    void this.img.offsetWidth;
    this.img.style.transition = `transform 380ms ${EASE}, opacity 260ms ease`;
    this.img.style.transform = "none";
    this.img.style.opacity = "1";
  }

  close() {
    if (!this.dialog.open || this.closing) return;
    this.closing = true;
    const thumb = this.items[this.index]?.thumb;
    const from = this.img.getBoundingClientRect();
    const to = thumb?.getBoundingClientRect();
    const onScreen = to && to.width && to.bottom > 0 && to.top < innerHeight;
    this.dialog.classList.add("is-closing");
    if (onScreen && this.scale === 1) {
      const sx = to.width / from.width;
      const dx = to.left + to.width / 2 - (from.left + from.width / 2);
      const dy = to.top + to.height / 2 - (from.top + from.height / 2);
      this.img.style.transition = `transform 300ms ${EASE}, opacity 300ms ease`;
      this.img.style.transform = `translate(${dx}px, ${dy}px) scale(${sx})`;
    } else {
      this.img.style.transition = "opacity 250ms ease";
    }
    this.img.style.opacity = "0";
    setTimeout(() => {
      this.dialog.close();
      this.dialog.classList.remove("is-closing");
      document.documentElement.classList.remove("lightbox-open");
      this.closing = false;
      // Hand focus back to the photo that was open (or the one opened from).
      (this.items[this.index]?.thumb.matches("[tabindex]") ? this.items[this.index].thumb : this.origin)?.focus?.({ preventScroll: true });
    }, 300);
  }

  // ---- zoom and pan --------------------------------------------------

  paint(animate) {
    this.img.style.transition = animate ? `transform 280ms ${EASE}` : "none";
    this.img.style.transform = this.scale === 1 && !this.x && !this.y ? "none" : `translate(${this.x}px, ${this.y}px) scale(${this.scale})`;
    this.dialog.classList.toggle("is-zoomed", this.scale > 1);
    this.zoomBtn.textContent = this.scale > 1 ? "−" : "+";
    this.zoomBtn.setAttribute("aria-label", this.scale > 1 ? "Zoom out" : "Zoom in");
  }

  clamp() {
    const sw = this.stage.clientWidth;
    const sh = this.stage.clientHeight;
    const maxX = Math.max(0, (this.img.offsetWidth * this.scale - sw) / 2);
    const maxY = Math.max(0, (this.img.offsetHeight * this.scale - sh) / 2);
    this.x = Math.min(maxX, Math.max(-maxX, this.x));
    this.y = Math.min(maxY, Math.max(-maxY, this.y));
    if (this.scale === 1) this.x = this.y = 0;
  }

  // Zoom to `scale`, keeping the point under (px, py) where it is.
  zoomAt(scale, px, py, animate = true) {
    const r = this.stage.getBoundingClientRect();
    const cx = px - (r.left + r.width / 2);
    const cy = py - (r.top + r.height / 2);
    const next = Math.min(MAX, Math.max(1, scale));
    this.x = cx - (next / this.scale) * (cx - this.x);
    this.y = cy - (next / this.scale) * (cy - this.y);
    this.scale = next;
    this.clamp();
    this.paint(animate);
  }

  toggleZoom(px, py) {
    const r = this.stage.getBoundingClientRect();
    const x = px ?? r.left + r.width / 2;
    const y = py ?? r.top + r.height / 2;
    this.zoomAt(this.scale > 1 ? 1 : TAP_ZOOM, x, y);
  }

  onWheel(e) {
    e.preventDefault();
    this.zoomAt(this.scale * Math.exp(-e.deltaY * 0.002), e.clientX, e.clientY, false);
  }

  onDown(e) {
    if (e.target.closest("button")) return;
    this.stage.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.gesture = {
      startX: e.clientX,
      startY: e.clientY,
      moved: 0,
      time: performance.now(),
      onImage: e.target === this.img,
      pinch: this.pointers.size === 2 ? this.span() : 0,
    };
  }

  span() {
    const [a, b] = [...this.pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  onMove(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    this.gesture.moved += Math.abs(dx) + Math.abs(dy);
    if (this.pointers.size === 2) {
      const now = this.span();
      if (this.gesture.pinch) {
        const [a, b] = [...this.pointers.values()];
        this.zoomAt(this.scale * (now / this.gesture.pinch), (a.x + b.x) / 2, (a.y + b.y) / 2, false);
      }
      this.gesture.pinch = now;
    } else if (this.scale > 1) {
      this.x += dx;
      this.y += dy;
      this.clamp();
      this.paint(false);
    }
  }

  onUp(e) {
    const g = this.gesture;
    const had = this.pointers.delete(e.pointerId);
    if (!had || !g || this.pointers.size) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (g.moved < 8 && performance.now() - g.time < 400) {
      // A tap: on the photo zoom, on the dark area close.
      if (g.onImage) this.toggleZoom(e.clientX, e.clientY);
      else if (!e.target.closest("button")) this.close();
    } else if (this.scale === 1 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      this.step(dx < 0 ? 1 : -1);
    }
    this.gesture = null;
  }

  onKey(e) {
    if (e.key === "ArrowRight") this.step(1);
    else if (e.key === "ArrowLeft") this.step(-1);
    else if (e.key === "+" || e.key === "=") this.zoomAt(this.scale * 1.5, innerWidth / 2, innerHeight / 2);
    else if (e.key === "-") this.zoomAt(this.scale / 1.5, innerWidth / 2, innerHeight / 2);
    else if (e.key === "0") this.zoomAt(1, innerWidth / 2, innerHeight / 2);
    else return;
    e.preventDefault();
  }
}
