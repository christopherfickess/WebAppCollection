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
    say(st.success && st.result?.enabled === true, st.success ? `Email Routing enabled: ${st.result?.enabled} (status ${st.result?.status})` : `could not read routing status: ${(st.errors || []).map((e) => e.message).join("; ")}`);
    const rules = await cf(`/zones/${z.id}/email/routing/rules`);
    const r = (rules.result || []).find((x) => (x.matchers || []).some((m) => m.value?.toLowerCase() === to));
    say(Boolean(r?.enabled), `rule for ${to}: ${r ? (r.enabled ? "enabled" : "disabled") : "missing"}`);
    const d = await cf(`/accounts/${z.account.id}/email/routing/addresses`);
    for (const a of d.result || []) say(Boolean(a.verified), `destination ${a.email.replace(/^(.).*(@.*)$/, "$1***$2")} verified: ${a.verified ? "yes" : "NO, click the Cloudflare email link"}`);
  } else say(false, `token cannot see zone ${zone}`);
}

if (env.RESEND_API_KEY && env.EMAIL_FROM) {
  const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject: `Forwarding test ${new Date().toISOString()}`, text: "If you can read this in your inbox, hello@ forwarding works." }) });
  const j = await r.json().catch(() => ({}));
  say(r.ok, r.ok ? `test message sent to ${to} (id ${j.id}); check the owner inbox` : `Resend refused the test message: ${j.message || r.status}. From address in use: ${env.EMAIL_FROM.replace(/.*</, "").replace(/>.*/, "")}`);
}
process.exit(bad ? 1 : 0);
// rerun 1794755846
// rerun 1794757036
