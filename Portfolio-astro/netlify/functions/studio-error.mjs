// Receives JavaScript error reports from visitors' browsers (see js/lib/errors.js).
import { reportError, json, sameOrigin, limited } from "./lib/studio.mjs";
import { live } from "./lib/runtime.mjs";
export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "post-only" });
  if (!sameOrigin(req)) return json(403, { error: "bad-origin" });
  const deps = live();
  const ip = req.headers.get("x-nf-client-connection-ip") || "unknown";
  if (await limited(deps.store, "er:" + ip, 30, 3600000, deps.now)) return json(204, null);
  let body;
  try { const text = await req.text(); if (text.length > 4000) return json(413, { error: "too-big" }); body = JSON.parse(text); } catch { return json(400, { error: "bad-json" }); }
  try { return await reportError(req, body, deps); } catch { return json(204, null); }
};
export const config = { path: "/api/client-error" };
