import { Component, html } from "../core.js";

// <gta-included data-from="included">
// What every booking covers, as term + description pairs.
export class IncludedList extends Component {
  static tag = "gta-included";

  render(items) {
    return html`
      <dl class="included-list">
        ${items.map((item) => html`<div><dt>${item.term}</dt><dd>${item.text}</dd></div>`)}
      </dl>
    `;
  }
}
