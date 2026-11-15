import { json, limited } from "./lib/studio.mjs";
import { live } from "./lib/runtime.mjs";
import { catalog } from "./lib/catalog.mjs";
import { quoteTravel } from "./lib/travel.mjs";
// GET /api/travel-quote?to=<city or address>: an estimate for the booking form.
export default async (req) => {
  if (req.method !== "GET") return json(405, { error: "get-only" });
  const t = catalog.booking.travel;
  if (!t || t.enabled === false) return json(404, { error: "travel-off" });
  const deps = live();
  const ip = req.headers.get("x-nf-client-connection-ip") || "unknown";
  if (await limited(deps.store, "tq:" + ip, 30, 3600000, deps.now)) return json(429, { error: "slow-down" });
  const to = new URL(req.url).searchParams.get("to") || "";
  const q = await quoteTravel(to, deps, t);
  return json(q.ok ? 200 : 422, q);
};
export const config = { path: "/api/travel-quote" };
