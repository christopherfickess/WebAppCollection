import { Component, html, link } from "../core.js";

// <gta-header data-from="site">
// Brand, main navigation, and the primary call to action. On narrow
// screens the nav collapses behind a Menu button.
export class SiteHeader extends Component {
  static tag = "gta-header";

  render(site) {
    return html`
      <header class="site-head">
        <a class="wordmark" href="${link("")}" aria-label="${site.name}, home">
          <svg class="wordmark-mark" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" /><path d="M9 21c4-1 6-10 14-10" /><circle class="wordmark-dot" cx="23" cy="11" r="3" /></svg>
          <span class="wordmark-name">${site.brand}</span>
          <span class="wordmark-tag">${site.tagline}</span>
        </a>
        <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
        <nav class="site-nav" id="site-nav" aria-label="Main">
          <ul>
            ${site.nav.map((item) => html`<li><a href="${link(item.href)}"${this.isCurrent(item.href) ? html` aria-current="page"` : ""}>${item.label}</a></li>`)}
          </ul>
          <a class="btn btn-small" href="${link(site.cta.href)}">${site.cta.label}</a>
        </nav>
      </header>
    `;
  }

  // A nav link is "current" when this page is that section (hash links
  // point into the home page, so they're never current elsewhere).
  isCurrent(href) {
    if (href.startsWith("#")) return false;
    return window.location.pathname.startsWith(link(href));
  }

  afterRender() {
    this.toggleButton = this.querySelector(".menu-toggle");
    this.toggleButton.addEventListener("click", () => this.toggle());
    // Picking a link or pressing Escape closes the menu again.
    this.querySelector(".site-nav").addEventListener("click", (e) => {
      if (e.target.closest("a")) this.close();
    });
    this.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen) {
        this.close();
        this.toggleButton.focus();
      }
    });
  }

  get isOpen() {
    return this.classList.contains("is-open");
  }

  open() {
    this.classList.add("is-open");
    this.toggleButton.setAttribute("aria-expanded", "true");
  }

  close() {
    this.classList.remove("is-open");
    this.toggleButton.setAttribute("aria-expanded", "false");
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }
}
