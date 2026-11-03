// Small base layer for the template's UI components.
//
// Each piece of repeated UI is a class that extends Component, which is
// itself a native custom element (HTMLElement). A component:
//   - declares its tag name:      static tag = "gta-header"
//   - reads its data by path:     <gta-header data-from="site">
//   - returns markup from render(), built with the html`` helper
//   - wires behaviour in afterRender()
// Components render into the light DOM (no shadow DOM), so the page's one
// stylesheet styles everything.

let store = {};

// Give every component access to the site's content (see data.js).
export function setStore(data) {
  store = data;
}

// Look up "trips.0" or "site.nav" in the store.
function resolve(path) {
  if (!path) return undefined;
  return path.split(".").reduce((obj, key) => (obj == null ? undefined : obj[key]), store);
}

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

// Marks a string as already-safe markup so html`` won't escape it.
class SafeHtml {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

// Tagged template: interpolated values are escaped, arrays are joined,
// null/undefined/false render nothing, and nested html`` stays as markup.
export function html(strings, ...values) {
  const out = strings.reduce((acc, str, i) => acc + str + toMarkup(values[i]), "");
  return new SafeHtml(out);
}

function toMarkup(value) {
  if (value == null || value === false) return "";
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(toMarkup).join("");
  return escapeHtml(value);
}

export class Component extends HTMLElement {
  static tag = "";

  // Register this class as a custom element (safe to call more than once).
  static define() {
    if (!this.tag) throw new Error(`${this.name} needs a static tag`);
    if (!customElements.get(this.tag)) customElements.define(this.tag, this);
    return this;
  }

  // The data this instance renders, from its data-from path.
  get data() {
    return resolve(this.dataset.from);
  }

  connectedCallback() {
    if (this.rendered) return; // moving an element in the DOM shouldn't re-render it
    this.update();
  }

  update() {
    const data = this.data;
    if (data === undefined && this.dataset.from) {
      console.warn(`<${this.localName}>: nothing at data-from="${this.dataset.from}"`);
      return;
    }
    this.innerHTML = String(this.render(data));
    this.rendered = true;
    this.afterRender();
  }

  // Subclasses return markup (an html`` result) for their data.
  render() {
    throw new Error(`${this.constructor.name} must implement render()`);
  }

  // Subclasses add event listeners or other behaviour here.
  afterRender() {}
}
