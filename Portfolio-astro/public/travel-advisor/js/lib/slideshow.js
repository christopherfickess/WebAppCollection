// Timing and state for a set of slides; knows nothing about the DOM.
// The component that owns it renders whatever onChange reports.
export class Slideshow {
  constructor({ count, interval = 6500, onChange }) {
    this.count = count;
    this.interval = interval;
    this.onChange = onChange;
    this.index = 0;
    this.timer = null;
    this.paused = false;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.onVisibility = () => (document.hidden ? this.stop() : this.start());
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  goTo(i) {
    this.index = (i + this.count) % this.count;
    this.onChange(this.index);
  }

  next() {
    this.goTo(this.index + 1);
  }

  // Never auto-advances for people who asked for reduced motion, while
  // the page is hidden, or while paused (hover or keyboard focus).
  start() {
    this.stop();
    if (this.count < 2 || this.reducedMotion || this.paused || document.hidden) return;
    this.timer = setInterval(() => this.next(), this.interval);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }

  pause() {
    this.paused = true;
    this.stop();
  }

  resume() {
    this.paused = false;
    this.start();
  }

  destroy() {
    this.stop();
    document.removeEventListener("visibilitychange", this.onVisibility);
  }
}
