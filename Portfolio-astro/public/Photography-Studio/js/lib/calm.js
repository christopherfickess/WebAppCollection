// Calm mode: switches off the motion (moving sky, walking fox, reveals,
// sway) for visitors who find it distracting. Remembered in the browser.
// boot.js applies a saved choice before the page paints.
const KEY = "fx-calm";

export class Calm {
  static attach(button) {
    if (!button) return;
    const root = document.documentElement;
    const show = () => {
      const on = root.classList.contains("calm");
      button.setAttribute("aria-pressed", String(on));
      button.textContent = on ? "Calm mode: on" : "Calm mode: off";
    };
    button.addEventListener("click", () => {
      const on = root.classList.toggle("calm");
      try { localStorage.setItem(KEY, on ? "1" : "0"); } catch {}
      show();
    });
    show();
  }
}
