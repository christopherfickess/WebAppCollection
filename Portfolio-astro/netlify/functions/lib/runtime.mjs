// Wires the pure logic in studio.mjs to the real Netlify store, clock, and fetch.
// The booking test (tools/tests/e2e.mjs) sets globalThis.__studioDeps to swap in a
// fake store, Stripe and email provider, so the real handlers run without any service.
import { getStore } from "@netlify/blobs";
export const live = () => (globalThis.__studioDeps
  ? { ...globalThis.__studioDeps, now: Date.now() }
  : { store: getStore("studio"), env: process.env, fetch, now: Date.now(), origin: process.env.URL || "" });
export const originOf = (req) => new URL(req.url).origin;
