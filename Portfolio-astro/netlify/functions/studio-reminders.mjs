// Runs once a day (Netlify scheduled function) and emails clients two days before their session.
import { sendReminders, alertOwner } from "./lib/studio.mjs";
import { live } from "./lib/runtime.mjs";
export default async () => {
  const deps = live();
  try { await sendReminders(deps); } catch (e) { await alertOwner(deps, "Session reminders failed", e); }
};
export const config = { schedule: "0 15 * * *" };
