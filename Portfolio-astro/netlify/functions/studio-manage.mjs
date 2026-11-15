// A client manages their own booking from the link in their emails (see manageLink in lib/studio.mjs).
import { manageView, manageAct, json, sameOrigin, limited } from "./lib/studio.mjs";
import { live, originOf } from "./lib/runtime.mjs";
export default async (req) => {
  const deps = { ...live(), origin: originOf(req) };
  const ip = req.headers.get("x-nf-client-connection-ip") || "unknown";
  if (await limited(deps.store, "mg:" + ip, 60, 3600000, deps.now)) return json(429, { error: "slow-down" });
  if (req.method === "GET") {
    const u = new URL(req.url);
    return manageView({ date: u.searchParams.get("d") || "", t: u.searchParams.get("t") || "" }, deps);
  }
  if (req.method !== "POST") return json(405, { error: "get-or-post" });
  if (!sameOrigin(req)) return json(403, { error: "bad-origin" });
  let body;
  try { body = await req.json(); } catch { return json(400, { error: "bad-json" }); }
  try { return await manageAct(body, deps); } catch { return json(500, { error: "manage-failed" }); }
};
export const config = { path: "/api/manage" };
