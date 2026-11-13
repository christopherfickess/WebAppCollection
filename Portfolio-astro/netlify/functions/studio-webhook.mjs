import { handleStripeEvent, verifySignature, alertOwner, json } from "./lib/studio.mjs";
import { live } from "./lib/runtime.mjs";
export default async (req) => {
  const deps = live();
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get("stripe-signature"), deps.env.STRIPE_WEBHOOK_SECRET, Math.floor(deps.now / 1000))) return json(400, { error: "bad-signature" });
  try {
    return json(200, await handleStripeEvent(JSON.parse(raw), deps));
  } catch (e) {
    await alertOwner(deps, "A payment notice could not be processed", e);
    return json(500, { error: "processing-failed" }); // Stripe retries on a 500
  }
};
export const config = { path: "/api/stripe-webhook" };
