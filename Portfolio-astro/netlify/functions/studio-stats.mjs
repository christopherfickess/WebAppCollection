import { stats, tokenOk, json } from "./lib/studio.mjs";
import { live } from "./lib/runtime.mjs";
export default async (req) => {
  const deps = live();
  if (!tokenOk(req, deps.env)) return json(401, { error: "unauthorised" });
  const days = Math.min(90, Math.max(1, Number(new URL(req.url).searchParams.get("days")) || 30));
  return json(200, await stats(days, deps));
};
export const config = { path: "/api/stats" };
