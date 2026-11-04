// Enhances the page's static contact form (it has to stay plain HTML for
// Netlify to detect it). Not a custom element: it wraps an existing <form>.
export class ContactForm {
  constructor(form) {
    this.form = form;
  }

  static attach(selector = "form.contact-form") {
    const form = document.querySelector(selector);
    return form ? new ContactForm(form) : null;
  }

  // Guide pages link to "?to=Paris#contact"; fill "Where to" with it.
  prefillFromQuery(param = "to", field = "destination") {
    const value = new URLSearchParams(window.location.search).get(param);
    const input = this.form.elements[field];
    if (value && input && !input.value) input.value = value.slice(0, 80);
    return this;
  }
}
