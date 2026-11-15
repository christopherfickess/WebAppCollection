import { exportData, tokenOk, json } from "./lib/studio.mjs";
import { live } from "./lib/runtime.mjs";
export default async (req) => {
  const deps = live();
  if (!tokenOk(req, deps.env)) return json(401, { error: "unauthorised" });
  return json(200, await exportData(deps));
};
export const config = { path: "/api/export" };
