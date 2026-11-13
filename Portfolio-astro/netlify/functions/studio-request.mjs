import { handleRequest, json } from "./lib/studio.mjs";
import { live } from "./lib/runtime.mjs";
export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "post-only" });
  let body;
  try { body = await req.json(); } catch { return json(400, { error: "bad-json" }); }
  return handleRequest(body, live());
};
export const config = { path: "/api/request" };
