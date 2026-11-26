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

const rad = (degrees) => (degrees * Math.PI) / 180;
export function haversineMiles(pointA, pointB) {
  const dLat = rad(pointB.lat - pointA.lat), dLon = rad(pointB.lon - pointA.lon);
  const halfChord = Math.sin(dLat / 2) ** 2 + Math.cos(rad(pointA.lat)) * Math.cos(rad(pointB.lat)) * Math.sin(dLon / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(halfChord));
}

const usd = (amount) => `$${Math.round(amount).toLocaleString("en-US")}`;
const cfgOf = (travel = {}) => ({ ...DEFAULTS, ...travel, flight: { ...DEFAULTS.flight, ...(travel.flight || {}) } });

// Pure pricing. road = { miles, hours } or null when there is no driving route; straight = straight-line miles.
// noRoute is true only when routing answered "no road route" (an ocean, say); when routing is merely unavailable the drive
// is estimated from the straight line instead of being quoted as a flight.
export function priceTravel({ road, straight, noRoute = !road }, travel) {
  const config = cfgOf(travel);
  const miles = road ? road.miles : straight * 1.25;
  const hours = road ? road.hours : miles / 55;
  const driveFee = Math.max(0, miles - config.freeMiles) * 2 * config.perMile;
  const flightFee = config.flight.base + config.flight.perMile * straight + config.flight.ground + config.flight.lodging;
  let mode = "none", fee = 0;
  if (miles > config.freeMiles) {
    const fly = (!road && noRoute) || hours > config.maxDriveHours || driveFee > flightFee;
    mode = fly ? "flight" : "drive";
    fee = fly ? flightFee : driveFee;
  }
  fee = Math.round(fee);
  const roundedMiles = Math.round(miles);
  const summary = mode === "none"
    ? `About ${roundedMiles} miles from ${config.homeBase}: inside the ${config.freeMiles}-mile area, no travel fee.`
    : mode === "drive"
      ? `About ${roundedMiles} miles each way from ${config.homeBase} (${Math.round(hours * 10) / 10} h drive): estimated travel fee ${usd(fee)}.`
      : `About ${Math.round(straight)} miles from ${config.homeBase}: too far to drive, so this is quoted as a flight. Estimated travel fee ${usd(fee)}.`;
  return { mode, fee, miles: roundedMiles, hours: Math.round(hours * 10) / 10, straightMiles: Math.round(straight), driveFee: Math.round(driveFee), flightFee: Math.round(flightFee), summary: `${summary} Final amount confirmed before the session.` };
}

const userAgent = (deps) => `FoxAndFern-booking/1.0 (travel estimates${deps.origin ? `; +${deps.origin}` : ""})`;
const wait = () => ({ signal: AbortSignal.timeout(4000) }); // a slow public service must not hang a request
const key = (prefix, text) => `${prefix}:${createHash("sha1").update(String(text).trim().toLowerCase()).digest("hex").slice(0, 24)}`;
const MONTH = 30 * 864e5, DAY = 864e5;

async function cached(store, cacheKey, now, make) {
  const hit = await store.get(cacheKey, { type: "json" }).catch(() => null);
  // "No road route" is remembered for a day only, so one odd answer from the router cannot price flights for a month.
  if (hit && now - hit.at < (hit.v?.none ? DAY : MONTH)) return hit.v;
  const fresh = await make();
  if (fresh) await store.setJSON(cacheKey, { at: now, v: fresh }).catch(() => {});
  return fresh;
}

export async function geocode(query, deps) {
  const { fetch: fetchFn, store, now } = deps;
  return cached(store, key("geo", query), now, async () => {
    const response = await fetchFn(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`, { headers: { "User-Agent": userAgent(deps), Accept: "application/json" }, ...wait() });
    if (!response.ok) throw new Error(`geocoder HTTP ${response.status}`); // an outage is not "place not found"
    const results = await response.json();
    return results?.[0] ? { lat: Number(results[0].lat), lon: Number(results[0].lon), label: String(results[0].display_name || query).split(",").slice(0, 3).join(",") } : null;
  });
}

// Resolves to { miles, hours }, or { none: true } when routing says there is no road route, and throws if routing is down.
async function route(pointA, pointB, deps) {
  const { fetch: fetchFn, store, now } = deps;
  return cached(store, key("rt", `${pointA.lat},${pointA.lon}>${pointB.lat},${pointB.lon}`), now, async () => {
    const response = await fetchFn(`https://router.project-osrm.org/route/v1/driving/${pointA.lon},${pointA.lat};${pointB.lon},${pointB.lat}?overview=false`, { headers: { "User-Agent": userAgent(deps) }, ...wait() });
    if (!response.ok) throw new Error(`router HTTP ${response.status}`);
    const reply = await response.json();
    const firstRoute = reply?.routes?.[0];
    if (firstRoute) return { miles: firstRoute.distance / 1609.344, hours: firstRoute.duration / 3600 };
    // Only the router's own "NoRoute" answer means there is no road. Anything else (an empty or odd reply) is a failure: not cached.
    if (reply?.code === "NoRoute") return { none: true };
    throw new Error(`router answered ${reply?.code || "without a route"}`);
  });
}

// Returns { ok: true, destination, ...priceTravel } or { ok: false, error }.
export async function quoteTravel(destination, deps, travel) {
  const dest = String(destination || "").trim().slice(0, 120);
  if (dest.length < 3) return { ok: false, error: "too-short" };
  const config = cfgOf(travel);
  try {
    const [home, to] = [await geocode(config.homeBase, deps), await geocode(dest, deps)];
    if (!home) return { ok: false, error: "home-not-found" };
    if (!to) return { ok: false, error: "not-found" };
    const straight = haversineMiles(home, to);
    let road = null, noRoute = straight > 4000; // across an ocean there is no drive
    if (!noRoute) {
      const routeResult = await route(home, to, deps).catch(() => undefined); // undefined: routing is down, so estimate from the straight line
      if (routeResult?.none) noRoute = true; else if (routeResult) road = routeResult;
    }
    return { ok: true, destination: to.label, ...priceTravel({ road, straight, noRoute }, config) };
  } catch { return { ok: false, error: "lookup-failed" }; }
}
