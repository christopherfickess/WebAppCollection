import { finish } from "./lib/oauth.mjs";
export default async (req) => finish({ env: process.env, url: req.url, cookie: req.headers.get("cookie"), fetch, now: Date.now() });
export const config = { path: "/api/oauth/callback" };
