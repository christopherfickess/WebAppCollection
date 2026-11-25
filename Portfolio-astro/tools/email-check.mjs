// Checks the forwarding setup for hello@<domain>: MX records, Cloudflare routing status and rule, then sends a test
// message to it through Resend (arrives in the owner's inbox if forwarding works).
import { resolveMx } from "node:dns/promises";
import { readFileSync } from "node:fs";
const cfg = JSON.parse(readFileSync(new URL("../services.config.json", import.meta.url), "utf8"));
const env = process.env;
const zone = new URL(cfg.customDomain).hostname.split(".").slice(-2).join(".");
const to = `${cfg.emailRouting?.address || "hello"}@${zone}`;
let bad = 0;
const say = (ok, m) => { console.log(`${ok ? "ok  " : "FAIL"} ${m}`); if (!ok) bad++; };

try { const mx = await resolveMx(zone); say(mx.some((m) => /mx\.cloudflare\.net/.test(m.exchange)), `MX records for ${zone}: ${mx.map((m) => m.exchange).join(", ") || "none"}`); }
catch (e) { say(false, `MX lookup failed: ${e.code || e.message}`); }

if (env.CLOUDFLARE_API_TOKEN) {
  const h = { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` };
  const cf = async (p) => (await fetch(`https://api.cloudflare.com/client/v4${p}`, { headers: h })).json();
  const z = (await cf(`/zones?name=${zone}`)).result?.[0];
  if (z) {
    const st = await cf(`/zones/${z.id}/email/routing`);
    // Reading this status needs a permission the token may not have; the MX records and the rule below prove routing is on.
    if (st.success) say(st.result?.enabled === true, `Email Routing enabled: ${st.result?.enabled} (status ${st.result?.status})`);
    else console.log(`warn could not read routing status (${(st.errors || []).map((e) => e.message).join("; ")}); relying on the MX records and the rule`);
    const rules = await cf(`/zones/${z.id}/email/routing/rules`);
    const r = (rules.result || []).find((x) => (x.matchers || []).some((m) => m.value?.toLowerCase() === to));
    say(Boolean(r?.enabled), `rule for ${to}: ${r ? (r.enabled ? "enabled" : "disabled") : "missing"}`);
    // Only the owner's own forwarding destination matters; other addresses on the account are none of our business.
    const owner = String(env.OWNER_EMAIL || "").trim().toLowerCase();
    if (!owner) say(false, "OWNER_EMAIL is not set, so the forwarding destination cannot be checked");
    else {
      const d = await cf(`/accounts/${z.account.id}/email/routing/addresses`);
      const dest = (d.result || []).find((a) => a.email?.toLowerCase() === owner);
      say(Boolean(dest?.verified), dest ? `destination ${owner.replace(/^(.).*(@.*)$/, "$1***$2")} verified: ${dest.verified ? "yes" : "NO, click the Cloudflare email link"}` : `destination ${owner.replace(/^(.).*(@.*)$/, "$1***$2")} is not on the Cloudflare account${d.success === false ? " (could not read the list: " + (d.errors || []).map((e) => e.message).join("; ") + ")" : ""}`);
      say(Boolean(r?.actions?.some((a) => a.type === "forward" && (a.value || []).map((v) => v.toLowerCase()).includes(owner))), `rule for ${to} forwards to the owner inbox`);
    }
  } else say(false, `token cannot see zone ${zone}`);
}

if (env.RESEND_API_KEY && env.EMAIL_FROM) {
  const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject: `Forwarding test ${new Date().toISOString()}`, text: "If you can read this in your inbox, hello@ forwarding works." }) });
  const j = await r.json().catch(() => ({}));
  say(r.ok, r.ok ? `test message sent to ${to} (id ${j.id}); check the owner inbox` : `Resend refused the test message: ${j.message || r.status}. Sending domain in EMAIL_FROM: ${(env.EMAIL_FROM.match(/@([^>\s]+)/) || [])[1] || "none found"}`);
}
process.exit(bad ? 1 : 0);
// rerun 1794755846
// rerun 1794757036
