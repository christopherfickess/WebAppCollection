import assert from "node:assert/strict";
import { priceTravel, quoteTravel, haversineMiles } from "../../netlify/functions/lib/travel.mjs";

// pricing: inside the free radius, a driveable trip, a drive that is too long, and no road at all
let r = priceTravel({ road: { miles: 40, hours: 0.8 }, straight: 35 });
assert.equal(r.mode, "none"); assert.equal(r.fee, 0); assert.match(r.summary, /no travel fee/);
r = priceTravel({ road: { miles: 100, hours: 1.6 }, straight: 90 });
assert.equal(r.mode, "drive"); assert.equal(r.fee, 60, "(100-60) miles x 2 ways x $0.75"); assert.match(r.summary, /\$60/);
r = priceTravel({ road: { miles: 450, hours: 6.5 }, straight: 400 });
assert.equal(r.mode, "flight", "more than 5 hours one way is quoted as a flight");
assert.equal(r.fee, 350 + 80 + 120 + 150);
r = priceTravel({ road: null, straight: 1200 });
assert.equal(r.mode, "flight"); assert.equal(r.fee, 350 + 240 + 120 + 150);
r = priceTravel({ road: { miles: 300, hours: 4.5 }, straight: 270 }, { perMile: 5 });
assert.equal(r.mode, "flight", "a drive that costs more than flying is quoted as a flight");
r = priceTravel({ road: { miles: 100, hours: 1.6 }, straight: 90 }, { homeBase: "Tulsa, OK", freeMiles: 120 });
assert.equal(r.mode, "none"); assert.match(r.summary, /Tulsa, OK/);
console.log("ok travel pricing");

// distance sanity: Oklahoma City to Tulsa is about 100 miles in a straight line
const d = haversineMiles({ lat: 35.4676, lon: -97.5164 }, { lat: 36.154, lon: -95.9928 });
assert.ok(d > 90 && d < 110, String(d));

// lookup with a fake network and an in-memory store; the second ask is served from the cache
const mem = new Map();
const store = { get: async (k) => mem.get(k) ?? null, setJSON: async (k, v) => void mem.set(k, v) };
const calls = [];
const places = { "oklahoma city, ok": { lat: "35.4676", lon: "-97.5164", display_name: "Oklahoma City, Oklahoma, USA" }, "tulsa": { lat: "36.154", lon: "-95.9928", display_name: "Tulsa, Tulsa County, Oklahoma, USA" }, "paris": { lat: "48.8566", lon: "2.3522", display_name: "Paris, France" } };
const f = async (url) => {
  calls.push(url);
  const j = (b) => ({ ok: true, status: 200, json: async () => b });
  if (url.includes("nominatim")) { const q = decodeURIComponent(url.split("q=")[1]).toLowerCase(); return j(places[q] ? [places[q]] : []); }
  if (url.includes("osrm")) return url.includes("2.3522") ? j({ code: "NoRoute", routes: [] }) : j({ routes: [{ distance: 105 * 1609.344, duration: 1.7 * 3600 }] });
  throw new Error("unexpected " + url);
};
const deps = { fetch: f, store, now: Date.UTC(2026, 10, 15) };
let q = await quoteTravel("Tulsa", deps);
assert.equal(q.ok, true); assert.equal(q.mode, "drive"); assert.equal(q.fee, 68, "45 miles over, both ways, $0.75"); assert.match(q.destination, /Tulsa/);
const n = calls.length; await quoteTravel("Tulsa", deps);
assert.equal(calls.length, n, "second lookup uses the cache");
q = await quoteTravel("Paris", deps);
assert.equal(q.mode, "flight"); assert.ok(q.fee > 1000);
assert.deepEqual(await quoteTravel("zz", deps), { ok: false, error: "too-short" });
assert.equal((await quoteTravel("Nowhereville", deps)).error, "not-found");
assert.equal((await quoteTravel("Tulsa", { ...deps, fetch: async () => { throw new Error("down"); }, store: { get: async () => null, setJSON: async () => {} } })).error, "lookup-failed");
console.log("ok travel lookup, cache and failures");

// routing down: estimate from the straight line as a drive instead of jumping to a flight; no road at all: flight
{
  const mk = () => ({ get: async () => null, setJSON: async () => {} });
  const base = (routing) => async (url) => {
    const j = (b) => ({ ok: true, status: 200, json: async () => b });
    if (url.includes("nominatim")) { const q = decodeURIComponent(url.split("q=")[1]).toLowerCase(); return j([q.startsWith("oklahoma") ? { lat: "35.4676", lon: "-97.5164", display_name: "OKC" } : { lat: "36.154", lon: "-95.9928", display_name: "Tulsa" }]); }
    return routing(url);
  };
  const down = await quoteTravel("Tulsa", { store: mk(), now: 1, fetch: base(async () => ({ ok: false, status: 503, json: async () => ({}) })) });
  assert.equal(down.ok, true); assert.equal(down.mode, "drive", "routing outage must not turn Tulsa into a flight");
  const none = await quoteTravel("Tulsa", { store: mk(), now: 1, fetch: base(async () => ({ ok: true, status: 200, json: async () => ({ code: "NoRoute", routes: [] }) })) });
  assert.equal(none.mode, "flight", "no road route means a flight");
  // an empty reply WITHOUT the router's NoRoute code is a failure, not "no road": drive estimate, and nothing cached
  const written = [];
  const spy = { get: async () => null, setJSON: async (k) => { written.push(k); } };
  const odd = await quoteTravel("Tulsa", { store: spy, now: 1, fetch: base(async () => ({ ok: true, status: 200, json: async () => ({ routes: [] }) })) });
  assert.equal(odd.mode, "drive", "an odd router reply must not price a flight");
  assert.ok(!written.some((k) => k.startsWith("rt:")), "odd reply is not cached");
  // a remembered "no road" is trusted for a day, not a month
  const keep = new Map();
  const mem = { get: async (k) => keep.get(k) ?? null, setJSON: async (k, v) => { keep.set(k, v); } };
  const t0 = 1_000_000;
  await quoteTravel("Tulsa", { store: mem, now: t0, fetch: base(async () => ({ ok: true, status: 200, json: async () => ({ code: "NoRoute", routes: [] }) })) });
  const later = await quoteTravel("Tulsa", { store: mem, now: t0 + 2 * 864e5, fetch: base(async () => ({ ok: true, status: 200, json: async () => ({ routes: [{ distance: 105 * 1609.344, duration: 1.7 * 3600 }] }) })) });
  assert.equal(later.mode, "drive", "after a day the router is asked again");
  const geoDown = await quoteTravel("Tulsa", { store: mk(), now: 1, fetch: async () => ({ ok: false, status: 503, json: async () => ({}) }) });
  assert.equal(geoDown.error, "lookup-failed", "a geocoder outage is not 'place not found'");
}
console.log("ok routing outage, no road, geocoder outage");
