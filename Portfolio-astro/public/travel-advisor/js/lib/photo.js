import { html, link } from "../core.js";

// Each photo is exported at three widths: <file>-640.webp, -960, -1600.
// A photo entry in the data is:
//   { file: "img/london/thames", width, height, alt, position? }
// where width/height are the largest export's real size and position is an
// optional CSS object-position ("50% 30%") for how it crops.
const WIDTHS = [640, 960, 1600];

export class Photo {
  constructor(data) {
    this.data = data;
  }

  get src() {
    return link(`${this.data.file}-960.webp`);
  }

  // Width descriptors can't exceed the real image width (small originals
  // were never upscaled), so cap each one.
  get srcset() {
    return WIDTHS.map((w) => `${link(`${this.data.file}-${w}.webp`)} ${Math.min(w, this.data.width)}w`).join(", ");
  }

  get full() {
    return link(`${this.data.file}-1600.webp`);
  }

  // zoom: the photo opens in the lightbox when clicked (also by keyboard).
  // full: only record the large file, for photos opened some other way
  // (the hero's "Enlarge" button).
  tag({ className = "", sizes = "100vw", eager = false, zoom = false, full = false } = {}) {
    const d = this.data;
    const open = zoom || full ? html` data-full="${this.full}"` : "";
    const key = zoom ? html` tabindex="0" role="button" aria-label="Enlarge photo: ${d.alt}"` : "";
    return html`<img class="${className}"${open}${key} src="${this.src}" srcset="${this.srcset}" sizes="${sizes}" width="${d.width}" height="${d.height}" alt="${d.alt}"${d.position ? html` data-position="${d.position}"` : ""} ${eager ? html`fetchpriority="high"` : html`loading="lazy"`} decoding="async" />`;
  }

  // object-position has to be set through the CSSOM: the site's CSP blocks
  // style="" attributes in markup.
  static applyPositions(root) {
    root.querySelectorAll("img[data-position]").forEach((img) => {
      img.style.objectPosition = img.dataset.position;
    });
  }
}
