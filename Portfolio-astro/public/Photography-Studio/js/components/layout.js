import { Component, html, link } from "../core.js";

const url = (href) => (/^(https?:|mailto:|tel:|\/)/.test(href) ? href : link(href));

// <fx-header data-from="site">  A floating wordmark and a Menu button.
// The menu is a full-screen overlay at every screen size, so the page
// itself stays clear for the photographs.
export class SiteHeader extends Component {
  static tag = "fx-header";

  render(s) {
    return html`
      <header class="site-head">
        <a class="wordmark" href="${link("")}" aria-label="${s.name}, home">
          <span class="wordmark-name">${s.brand}</span>
          <span class="wordmark-tag">${s.tagline}</span>
        </a>
        <button class="menu-btn" type="button" aria-expanded="false" aria-controls="site-nav">
          <span class="menu-text">Menu</span>
          <span class="menu-icon" aria-hidden="true"><i></i><i></i></span>
        </button>
        <nav class="site-nav" id="site-nav" aria-label="Main">
          <ul>${s.nav.map((n) => html`<li><a href="${link(n.href)}">${n.label}</a></li>`)}</ul>
          <a class="btn" href="${link(s.cta.href)}">${s.cta.label}</a>
        </nav>
      </header>
    `;
  }

  afterRender() {
    this.button = this.querySelector(".menu-btn");
    this.label = this.querySelector(".menu-text");
    this.button.addEventListener("click", () => this.toggle());
    this.querySelector(".site-nav").addEventListener("click", (e) => e.target.closest("a") && this.close());
    this.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen) {
        this.close();
        this.button.focus();
      }
    });
    // Clear over the hero, solid once the page scrolls.
    const head = this.querySelector(".site-head");
    const onScroll = () => head.classList.toggle("is-solid", window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  get isOpen() {
    return this.classList.contains("is-open");
  }

  toggle() {
    const open = !this.isOpen;
    this.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
    this.button.setAttribute("aria-expanded", String(open));
    this.label.textContent = open ? "Close" : "Menu";
  }

  close() {
    if (this.isOpen) this.toggle();
  }
}

// <fx-footer data-from="site">
export class SiteFooter extends Component {
  static tag = "fx-footer";

  render(s) {
    return html`
      <footer class="site-foot">
        <p class="foot-mark" aria-hidden="true">${s.brand}</p>
        <div class="foot-row">
          <p class="foot-name">${s.name}</p>
          <ul class="foot-links">${s.links.map((l) => html`<li><a href="${url(l.href)}"${/^https?:/.test(l.href) ? html` rel="noopener" target="_blank"` : ""}>${l.label}</a></li>`)}</ul>
        </div>
        <p class="foot-note">&copy; ${new Date().getFullYear()} ${s.name}. ${s.footnote}</p>
      </footer>
    `;
  }
}
