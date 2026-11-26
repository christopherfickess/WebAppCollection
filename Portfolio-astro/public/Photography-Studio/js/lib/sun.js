// Best light on your date: sunrise, sunset, and golden hour for the day a
// client picks, worked out in the browser from the site's latitude and
// longitude (no outside service). Uses the standard solar-position
// formulas from Astronomy Answers. Golden hour here means the sun is
// within 6 degrees of the horizon.
const RAD = Math.PI / 180;
const DAY_MS = 864e5;
const J1970 = 2440588;
const J2000 = 2451545;
const OBLIQUITY = RAD * 23.4397;
const J0 = 0.0009;

const toDays = (ms) => ms / DAY_MS - 0.5 + J1970 - J2000;
const fromJulian = (j) => (j + 0.5 - J1970) * DAY_MS;

export function sunTimes(year, month, day, lat, lon) {
  // Start from about local solar noon, so the right day's transit is found.
  const ref = Date.UTC(year, month - 1, day, 12 - lon / 15);
  const lw = RAD * -lon;
  const phi = RAD * lat;
  const d = toDays(ref);
  const n = Math.round(d - J0 - lw / (2 * Math.PI));
  const ds = J0 + (0 + lw) / (2 * Math.PI) + n;
  const M = RAD * (357.5291 + 0.98560028 * ds);
  const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + RAD * 102.9372 + Math.PI;
  const dec = Math.asin(Math.sin(OBLIQUITY) * Math.sin(L));
  const noon = J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);

  const setFor = (altitudeDeg) => {
    const h = altitudeDeg * RAD;
    const w = Math.acos((Math.sin(h) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)));
    const a = J0 + (w + lw) / (2 * Math.PI) + n;
    return J2000 + a + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  };
  const out = {};
  for (const [key, alt] of [["sun", -0.833], ["golden", 6]]) {
    const set = setFor(alt);
    out[key] = { rise: fromJulian(noon - (set - noon)), set: fromJulian(set) };
  }
  return out; // times are UTC milliseconds; NaN where the sun never crosses
}

export class LightNote {
  static attach(location) {
    const input = document.querySelector("#date");
    const note = document.querySelector("#light-note");
    if (!input || !note || !location) return;
    const update = () => {
      note.textContent = "";
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.value);
      if (!m) return;
      const t = sunTimes(+m[1], +m[2], +m[3], location.lat, location.lon);
      if ([t.sun.rise, t.sun.set, t.golden.rise, t.golden.set].some(Number.isNaN)) return;
      const fmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: location.timeZone });
      const f = (ms) => fmt.format(ms);
      note.textContent =
        `Light near ${location.place} on that day: sunrise ${f(t.sun.rise)}, golden hour until ${f(t.golden.rise)}; ` +
        `golden hour from ${f(t.golden.set)}, sunset ${f(t.sun.set)}. Weather and terrain change what you see.`;
    };
    input.addEventListener("input", update);
    input.addEventListener("change", update);
    update();
  }
}
