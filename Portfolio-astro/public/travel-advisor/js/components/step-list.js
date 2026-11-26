import { Component, html } from "../core.js";

// <gta-steps data-from="steps">
// The booking process, in order. Numbering comes from CSS counters.
export class StepList extends Component {
  static tag = "gta-steps";

  render(steps) {
    return html`
      <ol class="steps">
        ${steps.map((step) => html`<li><h3>${step.title}</h3><p>${step.text}</p></li>`)}
      </ol>
    `;
  }
}
