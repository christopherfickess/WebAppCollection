// Wires the pure logic in studio.mjs to the real Netlify store, clock, and fetch.
import { getStore } from "@netlify/blobs";
export const live = () => ({ store: getStore("studio"), env: process.env, fetch, now: Date.now() });
export const originOf = (req) => new URL(req.url).origin;
