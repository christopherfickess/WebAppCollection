// Travel estimate: from the studio's home base to a session location.
// Within the free radius there is no fee. Beyond it the fee is either a per-mile driving charge (counted both ways)
// or, when the drive is too long, a flight estimate. Distances come from OpenStreetMap's Nominatim (address lookup)
// and the public OSRM server (driving distance); if routing is unavailable the straight-line distance x 1.25 is used.
import { createHash } from "node:crypto";

export const DEFAULTS = {
  homeBase: "Oklahoma City, OK",
  freeMiles: 60,
  perMile: 0.75,          // dollars per mile, for each mile beyond the free radius, counted both ways
  maxDriveHours: 5,       // longer one-way drives are quoted as a flight
  flight: { base: 350, perMile: 0.2, ground: 120, lodging: 150 }, // round-trip airfare floor, per straight-line mile, rental car + bags, one night
};

const rad = (d) => (d * Math.PI) / 180;
export function haversineMiles(a, b) {
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

const usd = (n) => `$${Math.round(n).toLocaleString("en-US")}`;
const cfgOf = (t = {}) => ({ ...DEFAULTS, ...t, flight: { ...DEFAULTS.flight, ...(t.flight || {}) } });

// Pure pricing. road = { miles, hours } or null when there is no driving route; straight = straight-line miles.
// noRoute is true only when routing answered "no road route" (an ocean, say); when routing is merely unavailable the drive
// is estimated from the straight line instead of being quoted as a flight.
export function priceTravel({ road, straight, noRoute = !road }, travel) {
  const t = cfgOf(travel);
  const miles = road ? road.miles : straight * 1.25;
  const hours = road ? road.hours : miles / 55;
  const driveFee = Math.max(0, miles - t.freeMiles) * 2 * t.perMile;
  const flightFee = t.flight.base + t.flight.perMile * straight + t.flight.ground + t.flight.lodging;
  let mode = "none", fee = 0;
  if (miles > t.freeMiles) {
    const fly = (!road && noRoute) || hours > t.maxDriveHours || driveFee > flightFee;
    mode = fly ? "flight" : "drive";
    fee = fly ? flightFee : driveFee;
  }
  fee = Math.round(fee);
  const mi = Math.round(miles);
  const summary = mode === "none"
    ? `About ${mi} miles from ${t.homeBase}: inside the ${t.freeMiles}-mile area, no travel fee.`
    : mode === "drive"
      ? `About ${mi} miles each way from ${t.homeBase} (${Math.round(hours * 10) / 10} h drive): estimated travel fee ${usd(fee)}.`
      : `About ${Math.round(straight)} miles from ${t.homeBase}: too far to drive, so this is quoted as a flight. Estimated travel fee ${usd(fee)}.`;
  return { mode, fee, miles: mi, hours: Math.round(hours * 10) / 10, straightMiles: Math.round(straight), driveFee: Math.round(driveFee), flightFee: Math.round(flightFee), summary: `${summary} Final amount confirmed before the session.` };
}

const ua = (deps) => `FoxAndFern-booking/1.0 (travel estimates${deps.origin ? `; +${deps.origin}` : ""})`;
const wait = () => ({ signal: AbortSignal.timeout(4000) }); // a slow public service must not hang a request
const key = (prefix, s) => `${prefix}:${createHash("sha1").update(String(s).trim().toLowerCase()).digest("hex").slice(0, 24)}`;
const MONTH = 30 * 864e5, DAY = 864e5;

async function cached(store, k, now, make) {
  const hit = await store.get(k, { type: "json" }).catch(() => null);
  // "No road route" is remembered for a day only, so one odd answer from the router cannot price flights for a month.
  if (hit && now - hit.at < (hit.v?.none ? DAY : MONTH)) return hit.v;
  const v = await make();
  if (v) await store.setJSON(k, { at: now, v }).catch(() => {});
  return v;
}

export async function geocode(q, deps) {
  const { fetch: f, store, now } = deps;
  return cached(store, key("geo", q), now, async () => {
    const r = await f(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`, { headers: { "User-Agent": ua(deps), Accept: "application/json" }, ...wait() });
    if (!r.ok) throw new Error(`geocoder HTTP ${r.status}`); // an outage is not "place not found"
    const j = await r.json();
    return j?.[0] ? { lat: Number(j[0].lat), lon: Number(j[0].lon), label: String(j[0].display_name || q).split(",").slice(0, 3).join(",") } : null;
  });
}

// Resolves to { miles, hours }, or { none: true } when routing says there is no road route, and throws if routing is down.
async function route(a, b, deps) {
  const { fetch: f, store, now } = deps;
  return cached(store, key("rt", `${a.lat},${a.lon}>${b.lat},${b.lon}`), now, async () => {
    const r = await f(`https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`, { headers: { "User-Agent": ua(deps) }, ...wait() });
    if (!r.ok) throw new Error(`router HTTP ${r.status}`);
    const j = await r.json();
    const x = j?.routes?.[0];
    if (x) return { miles: x.distance / 1609.344, hours: x.duration / 3600 };
    // Only the router's own "NoRoute" answer means there is no road. Anything else (an empty or odd reply) is a failure: not cached.
    if (j?.code === "NoRoute") return { none: true };
    throw new Error(`router answered ${j?.code || "without a route"}`);
  });
}

// Returns { ok: true, destination, ...priceTravel } or { ok: false, error }.
export async function quoteTravel(destination, deps, travel) {
  const dest = String(destination || "").trim().slice(0, 120);
  if (dest.length < 3) return { ok: false, error: "too-short" };
  const t = cfgOf(travel);
  try {
    const [home, to] = [await geocode(t.homeBase, deps), await geocode(dest, deps)];
    if (!home) return { ok: false, error: "home-not-found" };
    if (!to) return { ok: false, error: "not-found" };
    const straight = haversineMiles(home, to);
    let road = null, noRoute = straight > 4000; // across an ocean there is no drive
    if (!noRoute) {
      const r = await route(home, to, deps).catch(() => undefined); // undefined: routing is down, so estimate from the straight line
      if (r?.none) noRoute = true; else if (r) road = r;
    }
    return { ok: true, destination: to.label, ...priceTravel({ road, straight, noRoute }, t) };
  } catch { return { ok: false, error: "lookup-failed" }; }
}
