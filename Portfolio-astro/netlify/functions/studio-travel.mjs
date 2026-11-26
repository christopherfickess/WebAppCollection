import { json, limited } from "./lib/studio.mjs";
import { live } from "./lib/runtime.mjs";
import { catalog } from "./lib/catalog.mjs";
import { quoteTravel } from "./lib/travel.mjs";
// GET /api/travel-quote?to=<city or address>: an estimate for the booking form.
export default async (req) => {
  if (req.method !== "GET") return json(405, { error: "get-only" });
  const travelConfig = catalog.booking.travel;
  if (!travelConfig || travelConfig.enabled === false) return json(404, { error: "travel-off" });
  const deps = live();
  const ip = req.headers.get("x-nf-client-connection-ip") || "unknown";
  if (await limited(deps.store, "tq:" + ip, 30, 3600000, deps.now)) return json(429, { error: "slow-down" });
  const to = new URL(req.url).searchParams.get("to") || "";
  const quote = await quoteTravel(to, deps, travelConfig);
  return json(quote.ok ? 200 : 422, quote);
};
export const config = { path: "/api/travel-quote" };
