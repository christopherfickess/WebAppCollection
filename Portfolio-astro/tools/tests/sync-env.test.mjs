import assert from "node:assert/strict";
import { sync } from "../sync-netlify-env.mjs";
const calls = [];
const fakeFetch = async (url, opt = {}) => {
  calls.push({ method: opt.method || "GET", url, body: opt.body });
  if (url.endsWith("/sites/S1")) return { ok: true, status: 200, json: async () => ({ name: "demo", account_id: "A1", account_slug: "me" }), text: async () => "" };
  return { ok: true, status: opt.method === "DELETE" ? 404 : 201, text: async () => "" };
};
const out = [];
await sync({ NETLIFY_AUTH_TOKEN: "t", NETLIFY_SITE_ID: "S1", STRIPE_SECRET_KEY: "sk_test_x", OWNER_EMAIL: "o@b.co" }, (u, o) => { const r = fakeFetch(u, o); return r.then((x) => (x.status === 404 && o?.method === "DELETE" ? { ...x, ok: false } : x)); }, (m) => out.push(m));
const posts = calls.filter((c) => c.method === "POST");
assert.equal(posts.length, 2);
const body = JSON.parse(posts[0].body)[0];
assert.equal(body.key, "STRIPE_SECRET_KEY"); assert.equal(body.is_secret, true);
assert.deepEqual(body.values.map((v) => v.context), ["production", "deploy-preview", "branch-deploy"]);
assert.ok(posts[0].url.includes("/accounts/A1/env?site_id=S1"));
assert.ok(out.includes("skip RESEND_API_KEY (empty)")); assert.ok(!out.join("\n").includes("sk_test_x"));
await assert.rejects(sync({ NETLIFY_AUTH_TOKEN: "", NETLIFY_SITE_ID: "" }), /required/);
console.log("ok sync env: replaces secrets per context, skips empty, never logs values");
