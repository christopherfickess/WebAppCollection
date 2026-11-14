import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { begin, finish, originsAllowed } from "../../netlify/functions/lib/oauth.mjs";

const env = { OAUTH_GITHUB_CLIENT_ID: "cid", OAUTH_GITHUB_CLIENT_SECRET: "csecret", URL: "https://main.example" };
const NOW = 1_800_000_000_000;
const site = "https://s.test";

// not configured
assert.equal(begin({ env: {}, url: `${site}/api/oauth/auth`, now: NOW }).status, 503);

// begin: redirects to GitHub with our callback, a signed state, and a matching cookie
const r = begin({ env, url: `${site}/api/oauth/auth?provider=github&site_id=x&scope=repo`, now: NOW });
assert.equal(r.status, 302);
const loc = new URL(r.headers.get("location"));
assert.equal(loc.origin + loc.pathname, "https://github.com/login/oauth/authorize");
assert.equal(loc.searchParams.get("client_id"), "cid");
assert.equal(loc.searchParams.get("redirect_uri"), `${site}/api/oauth/callback`);
assert.equal(loc.searchParams.get("scope"), "repo");
const cookie = r.headers.get("set-cookie").split(";")[0];
assert.match(r.headers.get("set-cookie"), /HttpOnly; Secure; SameSite=Lax/);
const state = loc.searchParams.get("state");
console.log("ok begin redirects to GitHub with signed state and cookie");

const gh = (body, ok = true) => async (u, o) => { gh.last = { u, body: JSON.parse(o.body) }; return { ok, status: ok ? 200 : 400, json: async () => body }; };
const cb = (over = {}) => finish({ env, url: `${site}/api/oauth/callback?code=abc&state=${over.state ?? state}`, cookie: over.cookie ?? cookie, fetch: over.fetch ?? gh({ access_token: "gho_TOKEN" }), now: over.now ?? NOW + 1000 });

// success: token is relayed, only to our own origins, and the page's CSP hash matches its script
let res = await cb(); let page = await res.text();
assert.equal(res.status, 200);
assert.ok(page.includes("gho_TOKEN") && page.includes("authorization:github:success"));
assert.deepEqual(gh.last.body, { client_id: "cid", client_secret: "csecret", code: "abc", redirect_uri: `${site}/api/oauth/callback` });
const script = /<script>(.*)<\/script>/s.exec(page)[1];
assert.equal(res.headers.get("content-security-policy"), `default-src 'none'; script-src 'sha256-${createHash("sha256").update(script).digest("base64")}'`);
assert.ok(page.includes('"https://s.test"') && page.includes('"https://main.example"')); assert.ok(!page.includes("csecret"));
console.log("ok success relays the token to allowed origins only, with a matching CSP hash");

// refusals never contain a token and never call GitHub
for (const [name, over] of [["bad state", { state: "x.1.y" }], ["no cookie", { cookie: "" }], ["other cookie", { cookie: "oauth_state=" + "0".repeat(32) }], ["expired", { now: NOW + 11 * 60 * 1000 }], ["tampered", { state: state.replace(/.$/, (c) => (c === "0" ? "1" : "0")) }]]) {
  gh.last = null; res = await cb(over); page = await res.text();
  assert.ok(page.includes("authorization:github:error"), name); assert.equal(gh.last, null, name);
}
res = await cb({ fetch: gh({ error_description: "bad code" }, false) }); assert.ok((await res.text()).includes("bad code"));
console.log("ok forged, expired and refused sign-ins fail safely");

assert.deepEqual(originsAllowed({ URL: "https://a.test/", OAUTH_ALLOWED_ORIGINS: "https://b.test, http://evil" }, "https://s.test/x"), ["https://s.test", "https://a.test", "https://b.test"]);
console.log("ok allowed origins are https only");
