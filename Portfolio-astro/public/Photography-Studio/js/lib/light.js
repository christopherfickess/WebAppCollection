// The page follows the light. As you scroll, the sky behind the page moves
// through four moods (dawn, day, dusk, night), a small fox walks along the
// bottom edge to show how far you are, and a label names the light.
//
// Colours are set as CSS custom properties through the CSSOM, because the
// site's CSP blocks inline style attributes. The stylesheet does the rest.
import { link } from "../core.js";

const DEFAULT_SKY = [
  { name: "Dawn", a: [26, 40, 38], b: [58, 62, 56] },
  { name: "Day", a: [17, 40, 31], b: [29, 66, 49] },
  { name: "Dusk", a: [38, 34, 38], b: [72, 46, 44] },
  { name: "Night", a: [9, 18, 22], b: [16, 31, 35] },
];

const mix = (p, q, t) => p.map((v, i) => Math.round(v + (q[i] - v) * t));
const rgb = (c) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;

export class Light {
  static attach(skyOverride) {
    const SKY = skyOverride?.length === 4 ? skyOverride : DEFAULT_SKY;
    const root = document.documentElement;
    const bar = document.createElement("div");
    bar.className = "walker";
    bar.setAttribute("aria-hidden", "true");
    bar.innerHTML = `<span class="walker-line"></span><img class="walker-fox" src="${link("img/fox-walk.svg")}" alt="" width="48" height="28" /><span class="walker-label"></span>`;
    document.body.append(bar);
    const label = bar.querySelector(".walker-label");
    let frame = 0;

    const update = () => {
      frame = 0;
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      const p = Math.min(1, Math.max(0, scrollY / max));
      const f = p * (SKY.length - 1);
      const i = Math.min(SKY.length - 2, Math.floor(f));
      const t = f - i;
      root.style.setProperty("--sky-a", rgb(mix(SKY[i].a, SKY[i + 1].a, t)));
      root.style.setProperty("--sky-b", rgb(mix(SKY[i].b, SKY[i + 1].b, t)));
      root.style.setProperty("--progress", p.toFixed(4));
      const name = SKY[Math.round(f)].name;
      if (label.textContent !== name) label.textContent = name;
    };
    const onScroll = () => frame || (frame = requestAnimationFrame(update));
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    update();
  }
}
