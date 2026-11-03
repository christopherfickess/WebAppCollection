import { Component, html } from "../core.js";

// <gta-footer data-from="site">
export class SiteFooter extends Component {
  static tag = "gta-footer";

  render(site) {
    const year = new Date().getFullYear();
    return html`
      <footer class="site-foot">
        <p class="foot-brand">&copy; ${year} ${site.name}</p>
        <p class="foot-note">${site.footnote}</p>
        <ul class="foot-links">
          ${site.links.map(
            (link) => html`<li><a href="${link.href}"${link.external ? html` target="_blank" rel="noopener"` : ""}>${link.label}</a></li>`
          )}
        </ul>
      </footer>
    `;
  }
}
