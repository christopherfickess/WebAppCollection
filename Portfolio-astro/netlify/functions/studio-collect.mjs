import { collect, json } from "./lib/studio.mjs";
import { live } from "./lib/runtime.mjs";
export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "post-only" });
  let body = {};
  try { body = JSON.parse(await req.text()); } catch {}
  return collect(req, body, live());
};
export const config = { path: "/api/collect" };
