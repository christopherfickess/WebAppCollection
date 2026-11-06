import { createCheckout, json } from "./lib/studio.mjs";
import { live, originOf } from "./lib/runtime.mjs";
export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "post-only" });
  let body;
  try { body = await req.json(); } catch { return json(400, { error: "bad-json" }); }
  try { return await createCheckout(body, { ...live(), origin: originOf(req) }); }
  catch (e) { return json(e.status || 500, { error: "checkout-failed" }); }
};
export const config = { path: "/api/checkout" };
