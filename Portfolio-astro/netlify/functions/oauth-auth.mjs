import { begin } from "./lib/oauth.mjs";
export default async (req) => begin({ env: process.env, url: req.url, now: Date.now() });
export const config = { path: "/api/oauth/auth" };
