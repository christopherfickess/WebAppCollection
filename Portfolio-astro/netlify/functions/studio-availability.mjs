import { availability, json } from "./lib/studio.mjs";
import { live } from "./lib/runtime.mjs";
export default async (req) => {
  const deps = live();
  const body = await availability(deps);
  // /api/availability?setup=1 also reports which settings this deploy can see
  // (yes or no only, never the values), to help with first-time set-up.
  if (new URL(req.url).searchParams.has("setup")) {
    const names = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "RESEND_API_KEY", "EMAIL_FROM", "OWNER_EMAIL", "STATS_TOKEN"];
    body.setup = Object.fromEntries(names.map((n) => [n, Boolean(deps.env[n])]));
    body.setup.stripeKeyLooksRight = /^sk_(test|live)_/.test(deps.env.STRIPE_SECRET_KEY || "");
    body.setup.stripeMode = (/^sk_(test|live)_/.exec(deps.env.STRIPE_SECRET_KEY || "") || [])[1] || "unknown";
    body.setup.context = deps.env.CONTEXT || "unknown";
    // On *.netlify.app test deploys only: a masked view of the two addresses, to catch typos and mismatches.
    if (new URL(req.url).hostname.endsWith(".netlify.app")) {
      const mask = (v) => { if (!v) return null; const [u, d = ""] = String(v).trim().replace(/^.*</, "").replace(/>$/, "").split("@"); return `${u.slice(0, 2)}***@${d}`; };
      body.setup.ownerEmailLooksLike = mask(deps.env.OWNER_EMAIL);
      body.setup.emailFromLooksLike = mask(deps.env.EMAIL_FROM);
      body.setup.ownerEmailHasSpaces = /\s/.test((deps.env.OWNER_EMAIL || "").trim());
    }
  }
  return json(200, body);
};
export const config = { path: "/api/availability" };
