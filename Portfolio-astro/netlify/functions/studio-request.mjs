import { handleRequest, alertOwner, json, sameOrigin, limited } from "./lib/studio.mjs";
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
  const res = await handleRequest(body, { ...deps, expose: new URL(req.url).hostname.endsWith(".netlify.app") });
  if (res.status === 502) await alertOwner(deps, "A visitor's request could not be sent", new Error("The email provider refused it. Check the Resend dashboard."));
  return res;
};
export const config = { path: "/api/request" };
