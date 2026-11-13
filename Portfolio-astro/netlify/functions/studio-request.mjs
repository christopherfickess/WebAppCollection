import { handleRequest, json } from "./lib/studio.mjs";
import { live } from "./lib/runtime.mjs";
export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "post-only" });
  let body;
  try { body = await req.json(); } catch { return json(400, { error: "bad-json" }); }
  // On *.netlify.app test deploys, include the email provider's reason in an error so set-up problems are visible.
  return handleRequest(body, { ...live(), expose: new URL(req.url).hostname.endsWith(".netlify.app") });
};
export const config = { path: "/api/request" };
