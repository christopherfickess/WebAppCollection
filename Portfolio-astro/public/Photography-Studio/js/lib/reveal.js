// Brings each section's content in as it scrolls into view: it fades up
// slowly, and items in a group (photos, packages, steps) arrive one after
// another. The hiding itself lives in the stylesheet and only applies for
// people who haven't asked for reduced motion.
const TARGETS = [
  [".band-head", ""],
  [".about-photo", "reveal-left"],
  [".about-text", "reveal-right"],
  [".filters", ""],
  [".shot", ""],
  [".package", ""],
  [".steps li", ""],
  [".faq-item", ""],
  [".contact-copy", "reveal-left"],
  [".contact-form", "reveal-right"],
];
const MAX_STAGGER = 5;

export class Reveal {
  static attach(root = document) {
    if (!("IntersectionObserver" in window)) return;
    const seen = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          seen.unobserve(e.target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    for (const [selector, variant] of TARGETS) {
      root.querySelectorAll(selector).forEach((el, i) => {
        el.classList.add("reveal");
        if (variant) el.classList.add(variant);
        // Stagger siblings that arrive together; the delay is set through
        // the CSSOM because the site's CSP blocks style="" attributes.
        el.style.setProperty("--i", String(i % (MAX_STAGGER + 1)));
        seen.observe(el);
      });
    }
  }
}
