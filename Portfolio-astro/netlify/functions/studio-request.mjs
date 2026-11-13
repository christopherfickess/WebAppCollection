import { handleRequest, json, sameOrigin, limited } from "./lib/studio.mjs";
import { live } from "./lib/runtime.mjs";
export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "post-only" });
  if (!sameOrigin(req)) return json(403, { error: "bad-origin" });
  const ip = req.headers.get("x-nf-client-connection-ip") || "unknown";
  const deps = live();
  if (await limited(deps.store, "rq:" + ip, 10, 3600000, deps.now)) return json(429, { error: "slow-down" });
  let body;
  try { body = await req.json(); } catch { return json(400, { error: "bad-json" }); }
  // On *.netlify.app test deploys, include the email provider's reason in an error so set-up problems are visible.
  return handleRequest(body, { ...deps, expose: new URL(req.url).hostname.endsWith(".netlify.app") });
};
export const config = { path: "/api/request" };
