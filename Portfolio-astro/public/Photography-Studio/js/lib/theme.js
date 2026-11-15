// Applies site.theme (colours) to the page. Set through the CSSOM because
// the site's CSP blocks inline styles. See HANDOVER.md to change them.
export class Theme {
  static apply(theme) {
    if (!theme) return;
    const map = { accent: "--fox", text: "--bone", muted: "--muted", soft: "--mauve" };
    const root = document.documentElement;
    Object.entries(map).forEach(([key, prop]) => theme[key] && root.style.setProperty(prop, theme[key]));
  }
}
