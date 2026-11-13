// Self-service page linked from booking emails. Talks to /api/manage with the signed link's date and token.
const q = new URLSearchParams(location.search);
const date = q.get("d") || "", token = q.get("t") || "";
const $ = (id) => document.getElementById(id);
const say = (t) => { $("manage-msg").textContent = t; };
const WHY = { "already-rescheduled": "This session was already moved once. Reply to your email to move it again.", booked: "That date is taken.", held: "That date is being paid for right now.", "too-soon": "That date is too soon.", closed: "No sessions on that day.", blocked: "I am away that day.", "invalid-date": "Choose a date.", past: "This session has passed.", "refund-failed": "The refund could not be started. I have been told and will fix it.", "slow-down": "Too many attempts. Try again later." };

async function call(body) {
  const res = await fetch("/api/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, t: token, ...body }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(WHY[data.error] || "Something went wrong. Reply to your email and I will sort it out.");
  return data;
}

async function load() {
  try {
    const res = await fetch(`/api/manage?d=${encodeURIComponent(date)}&t=${encodeURIComponent(token)}`);
    if (!res.ok) { $("manage-summary").textContent = "This link is not valid, or the booking was changed. Reply to your confirmation email for help."; return; }
    const b = await res.json();
    const money = (n) => `$${Number(n).toLocaleString("en-US")}`;
    $("manage-summary").textContent = `${b.package} on ${b.date}. ${b.balance ? (b.balancePaid ? "Balance paid." : `Balance of ${money(b.balance)} is due on the day.`) : ""}`;
    $("manage-cancel").title = b.canRefund ? "Full deposit refund" : `Cancelling less than ${b.refundFullDays} days out keeps the deposit`;
    $("manage-move").hidden = b.rescheduled;
    $("manage-date").hidden = b.rescheduled;
    document.querySelector('label[for="manage-date"]').hidden = b.rescheduled;
    $("manage-balance").hidden = !(b.payments && b.balance && !b.balancePaid);
    $("manage-actions").hidden = false;
    if (q.get("paid")) say("Balance received. Thank you.");
    window.__manage = b;
  } catch { $("manage-summary").textContent = "Could not load your booking. Try again in a moment."; }
}

$("manage-move").addEventListener("click", async () => {
  const newDate = $("manage-date").value;
  if (!newDate) return say("Choose a new date first.");
  try { const r = await call({ action: "reschedule", newDate }); say(`Done. Your session is now on ${r.date}. A new link is in your email.`); $("manage-actions").hidden = true; }
  catch (e) { say(e.message); }
});
$("manage-cancel").addEventListener("click", async () => {
  const b = window.__manage;
  const rule = b?.canRefund ? "Your deposit will be refunded in full." : `Cancelling less than ${b?.refundFullDays ?? 14} days before the session keeps the deposit.`;
  if (!confirm(`Cancel this session? ${rule}`)) return;
  try { const r = await call({ action: "cancel" }); say(r.refunded ? "Cancelled. Your deposit is being refunded." : "Cancelled."); $("manage-actions").hidden = true; }
  catch (e) { say(e.message); }
});
$("manage-balance").addEventListener("click", async () => {
  try { const r = await call({ action: "balance" }); location.assign(r.url); } catch (e) { say(e.message); }
});
load();
