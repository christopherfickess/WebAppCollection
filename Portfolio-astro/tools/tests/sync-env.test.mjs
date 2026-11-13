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
assert.equal(JSON.parse(posts[1].body)[0].key, "OWNER_EMAIL"); assert.equal(JSON.parse(posts[1].body)[0].is_secret, false); assert.equal(JSON.parse(posts[1].body)[0].scopes, undefined); assert.deepEqual(JSON.parse(posts[1].body)[0].values, [{ context: "all", value: "o@b.co" }]);
assert.deepEqual(body.values.map((v) => v.context), ["production", "deploy-preview", "branch-deploy"]);
assert.ok(posts[0].url.includes("/accounts/A1/env?site_id=S1"));
assert.ok(out.includes("skip RESEND_API_KEY (empty)")); assert.ok(!out.join("\n").includes("sk_test_x"));
await assert.rejects(sync({ NETLIFY_AUTH_TOKEN: "", NETLIFY_SITE_ID: "" }), /required/);
// live mode: production gets live Stripe values, previews keep test values; mistakes are refused
{
  calls.length = 0; const o2 = [];
  const base = { NETLIFY_AUTH_TOKEN: "t", NETLIFY_SITE_ID: "S1", STRIPE_SECRET_KEY: "sk_test_x", STRIPE_WEBHOOK_SECRET: "whsec_test", SYNC_MODE: "live", LIVE_STRIPE_SECRET_KEY: "sk_live_y", LIVE_STRIPE_WEBHOOK_SECRET: "whsec_live" };
  await sync(base, fakeFetch, (m) => o2.push(m));
  const vals = Object.fromEntries(calls.filter((c) => c.method === "POST").map((c) => [JSON.parse(c.body)[0].key, JSON.parse(c.body)[0].values]));
  assert.equal(vals.STRIPE_SECRET_KEY.find((v) => v.context === "production").value, "sk_live_y");
  assert.equal(vals.STRIPE_SECRET_KEY.find((v) => v.context === "branch-deploy").value, "sk_test_x");
  assert.equal(vals.STRIPE_WEBHOOK_SECRET.find((v) => v.context === "production").value, "whsec_live");
  assert.ok(!o2.join("\n").includes("sk_live_y"));
  await assert.rejects(sync({ ...base, LIVE_STRIPE_SECRET_KEY: "sk_test_y" }, fakeFetch, () => {}), /sk_live_/);
  await assert.rejects(sync({ ...base, STRIPE_SECRET_KEY: "sk_live_z" }, fakeFetch, () => {}), /must stay a test key/);
  await assert.rejects(sync({ ...base, SYNC_MODE: "test", STRIPE_SECRET_KEY: "sk_live_z" }, fakeFetch, () => {}), /refuses a live/);
}
console.log("ok sync env: replaces secrets per context, skips empty, never logs values");
