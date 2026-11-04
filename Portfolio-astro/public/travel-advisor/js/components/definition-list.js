import { Component, html } from "../core.js";

// <gta-definitions data-from="..."> - a list of { term, text } pairs.
// Subclasses change the CSS class or map other data shapes onto
// term/text by overriding items().
export class DefinitionList extends Component {
  static tag = "gta-definitions";
  static listClass = "definition-list";

  items(data) {
    return data;
  }

  render(data) {
    return html`
      <dl class="${this.constructor.listClass}">
        ${this.items(data).map((item) => html`<div><dt>${item.term}</dt><dd>${item.text}</dd></div>`)}
      </dl>
    `;
  }
}

// <gta-included data-from="included"> - what every booking covers.
export class IncludedList extends DefinitionList {
  static tag = "gta-included";
  static listClass = "included-list";
}

// <gta-places data-from="destinations.london.neighbourhoods">
export class PlaceList extends DefinitionList {
  static tag = "gta-places";
  static listClass = "place-list";

  items(places) {
    return places.map((p) => ({ term: p.name, text: p.note }));
  }
}

// <gta-facts data-from="destinations.london.basics">
export class FactList extends DefinitionList {
  static tag = "gta-facts";
  static listClass = "fact-list";
}
