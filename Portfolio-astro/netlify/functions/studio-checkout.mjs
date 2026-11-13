import { createCheckout, json, sameOrigin, limited } from "./lib/studio.mjs";
import { live, originOf } from "./lib/runtime.mjs";
export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "post-only" });
  if (!sameOrigin(req)) return json(403, { error: "bad-origin" });
  const ip = req.headers.get("x-nf-client-connection-ip") || "unknown";
  const deps = live();
  if (await limited(deps.store, "co:" + ip, 20, 3600000, deps.now)) return json(429, { error: "slow-down" });
  let body;
  try { body = await req.json(); } catch { return json(400, { error: "bad-json" }); }
  try { return await createCheckout(body, { ...deps, origin: originOf(req) }); }
  catch (e) { return json(e.status || 500, { error: "checkout-failed" }); }
};
export const config = { path: "/api/checkout" };
