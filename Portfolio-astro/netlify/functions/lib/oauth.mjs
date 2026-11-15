// GitHub sign-in for the content editor (Decap CMS), so it does not depend on Netlify's sign-in service.
// Flow: the editor opens /api/oauth/auth in a popup -> GitHub -> /api/oauth/callback, which hands the
// token back to the editor window with postMessage. Only people with write access to the repository
// can save anything, because the token is theirs.
import { createHmac, randomBytes, createHash, timingSafeEqual } from "node:crypto";

const STATE_TTL_MS = 10 * 60 * 1000;
const sign = (secret, v) => createHmac("sha256", secret).update(v).digest("hex");
const same = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const html = (status, body, headers = {}) => new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", ...headers } });

export function begin({ env, url, now }) {
  const id = env.OAUTH_GITHUB_CLIENT_ID, secret = env.OAUTH_GITHUB_CLIENT_SECRET;
  if (!id || !secret) return html(503, "<p>Editor sign-in is not set up yet. Add OAUTH_GITHUB_CLIENT_ID and OAUTH_GITHUB_CLIENT_SECRET.</p>");
  const u = new URL(url);
  const nonce = randomBytes(16).toString("hex");
  const exp = now + STATE_TTL_MS;
  const state = `${nonce}.${exp}.${sign(secret, `${nonce}.${exp}`)}`;
  const gh = new URL("https://github.com/login/oauth/authorize");
  gh.searchParams.set("client_id", id);
  gh.searchParams.set("redirect_uri", `${u.origin}/api/oauth/callback`);
  gh.searchParams.set("scope", u.searchParams.get("scope") === "public_repo" ? "public_repo" : "repo");
  gh.searchParams.set("state", state);
  return new Response(null, { status: 302, headers: { Location: gh.toString(), "Cache-Control": "no-store", "Set-Cookie": `oauth_state=${nonce}; Path=/api/oauth; Max-Age=600; HttpOnly; Secure; SameSite=Lax` } });
}

export const originsAllowed = (env, url) => [...new Set([new URL(url).origin, env.URL, ...(env.OAUTH_ALLOWED_ORIGINS || "").split(",")].map((o) => (o || "").trim().replace(/\/$/, "")).filter((o) => /^https:\/\/[^/]+$/.test(o)))];

// The page the popup shows: it passes the result to the editor window that opened it, but only to our own origins.
export function relay(provider, ok, payload, origins) {
  const message = `authorization:${provider}:${ok ? "success" : "error"}:${JSON.stringify(payload)}`;
  const script = `(function(){var allowed=${JSON.stringify(origins).replace(/</g, "\\u003c")};var msg=${JSON.stringify(message).replace(/</g, "\\u003c")};function done(e){if(allowed.indexOf(e.origin)<0)return;window.opener.postMessage(msg,e.origin);window.removeEventListener("message",done,false);}window.addEventListener("message",done,false);if(window.opener)window.opener.postMessage("authorizing:${provider}","*");})();`;
  const hash = createHash("sha256").update(script).digest("base64");
  return html(200, `<!doctype html><meta charset="utf-8"><title>Signing in</title><p>${ok ? "Signed in. This window will close." : "Sign-in failed. You can close this window."}</p><script>${script}</script>`, {
    "Content-Security-Policy": `default-src 'none'; script-src 'sha256-${hash}'`,
    "Set-Cookie": "oauth_state=; Path=/api/oauth; Max-Age=0; HttpOnly; Secure; SameSite=Lax",
  });
}

export async function finish({ env, url, cookie, fetch: fetchFn, now }) {
  const u = new URL(url);
  const origins = originsAllowed(env, url);
  const fail = (message) => relay("github", false, { message }, origins);
  const secret = env.OAUTH_GITHUB_CLIENT_SECRET, id = env.OAUTH_GITHUB_CLIENT_ID;
  if (!id || !secret) return fail("Editor sign-in is not set up.");
  if (u.searchParams.get("error")) return fail("GitHub sign-in was cancelled.");
  const [nonce, exp, mac] = (u.searchParams.get("state") || "").split(".");
  const cookieNonce = /(?:^|;\s*)oauth_state=([0-9a-f]+)/.exec(cookie || "")?.[1];
  if (!nonce || !mac || !cookieNonce || nonce !== cookieNonce || !same(sign(secret, `${nonce}.${exp}`), mac) || Number(exp) < now) return fail("This sign-in link expired or did not start here. Try again.");
  const code = u.searchParams.get("code");
  if (!code) return fail("GitHub did not send a code.");
  const res = await fetchFn("https://github.com/login/oauth/access_token", { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ client_id: id, client_secret: secret, code, redirect_uri: `${u.origin}/api/oauth/callback` }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) return fail(data.error_description || "GitHub refused the sign-in.");
  return relay("github", true, { token: data.access_token, provider: "github" }, origins);
}
