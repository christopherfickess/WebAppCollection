import { Component, html, link, resolve } from "../core.js";

// <gta-footer data-from="site">
// Brand, destination and quick links, outside links, and (on phones) the
// fixed action bar. The bar lives here because every page has a footer.
export class SiteFooter extends Component {
  static tag = "gta-footer";

  render(site) {
    const year = new Date().getFullYear();
    const places = resolve("destinations");
    const order = resolve("destinationOrder");
    const url = (href) => (/^(https?:|mailto:|tel:|sms:|\/)/.test(href) ? href : link(href));
    return html`
      <footer class="site-foot">
        <div class="foot-about">
          <p class="foot-name">${site.name}</p>
          <p class="foot-blurb">${site.blurb}</p>
        </div>
        <nav class="foot-places" aria-label="Destinations">
          <h2 class="foot-title">Where to next</h2>
          <ul class="foot-flow">
            ${order.map((slug) => html`<li><a href="${link(`destinations/${slug}/`)}">${places[slug].name}</a></li>`)}
          </ul>
        </nav>
        <div class="foot-meta">
          <nav aria-label="Quick links">
            <ul class="foot-inline">
              <li><a href="${link("")}">Home</a></li>
              ${site.nav.map((item) => html`<li><a href="${link(item.href)}">${item.label}</a></li>`)}
            </ul>
          </nav>
          <nav aria-label="Elsewhere">
            <ul class="foot-inline">
              ${site.links.map(
                (item) => html`<li><a href="${url(item.href)}"${item.external ? html` target="_blank" rel="noopener"` : ""}>${item.label}</a></li>`
              )}
            </ul>
          </nav>
        </div>
        <p class="foot-note">&copy; ${year} ${site.name}. ${site.footnote}</p>
      </footer>
      <nav class="action-bar" aria-label="Quick actions">
        ${site.actionBar.map(
          (item) => html`<a${item.primary ? html` class="is-primary"` : ""} href="${url(item.href)}">${item.label}</a>`
        )}
      </nav>
    `;
  }
}
