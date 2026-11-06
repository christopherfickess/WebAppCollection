import { Component, html, link, site } from "../core.js";

const url = (href) => (/^(https?:|mailto:|tel:|\/)/.test(href) ? href : link(href));

// <fx-header data-from="site">  Wordmark, navigation, and a burger that
// opens a full-screen menu on phones.
export class SiteHeader extends Component {
  static tag = "fx-header";

  render(s) {
    return html`
      <header class="site-head">
        <a class="wordmark" href="${link("")}" aria-label="${s.name}, home">
          <span class="wordmark-name">${s.brand}</span>
          <span class="wordmark-tag">${s.tagline}</span>
        </a>
        <button class="burger" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Menu"><i></i><i></i><i></i></button>
        <nav class="site-nav" id="site-nav" aria-label="Main">
          <ul>${s.nav.map((n) => html`<li><a href="${link(n.href)}">${n.label}</a></li>`)}</ul>
          <a class="btn btn-small" href="${link(s.cta.href)}">${s.cta.label}</a>
        </nav>
      </header>
    `;
  }

  afterRender() {
    this.button = this.querySelector(".burger");
    this.button.addEventListener("click", () => this.toggle());
    this.querySelector(".site-nav").addEventListener("click", (e) => e.target.closest("a") && this.close());
    this.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen) {
        this.close();
        this.button.focus();
      }
    });
  }

  get isOpen() {
    return this.classList.contains("is-open");
  }

  toggle() {
    const open = !this.isOpen;
    this.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
    this.button.setAttribute("aria-expanded", String(open));
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
        <p class="foot-name">${s.name}</p>
        <ul class="foot-links">${s.links.map((l) => html`<li><a href="${url(l.href)}"${/^https?:/.test(l.href) ? html` rel="noopener" target="_blank"` : ""}>${l.label}</a></li>`)}</ul>
        <p class="foot-note">&copy; ${new Date().getFullYear()} ${s.name}. ${s.footnote}</p>
      </footer>
    `;
  }
}
