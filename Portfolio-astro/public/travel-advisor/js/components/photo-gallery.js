import { Component, html } from "../core.js";
import { Photo } from "../lib/photo.js";

// <gta-gallery data-from="destinations.valencia.gallery">
// A captioned photo mosaic. Wide photos (landscape) span two columns, so
// the grid mixes shapes the way a contact sheet does.
export class PhotoGallery extends Component {
  static tag = "gta-gallery";

  render(photos) {
    return html`
      <ul class="gallery">
        ${photos.map((p) => {
          const wide = p.width > p.height * 1.3;
          return html`
            <li class="gallery-item${wide ? " is-wide" : ""}">
              <figure>
                ${new Photo(p).tag({ className: "gallery-img", sizes: wide ? "(max-width: 560px) 100vw, 60vw" : "(max-width: 560px) 50vw, 30vw" })}
                <figcaption>${p.caption}</figcaption>
              </figure>
            </li>
          `;
        })}
      </ul>
    `;
  }

  afterRender() {
    Photo.applyPositions(this);
  }
}
