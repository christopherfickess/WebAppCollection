// Runs when the booking form is submitted without paying (Netlify Forms):
// emails the person a copy and tells the owner.
import { notifyBooking } from "./lib/studio.mjs";
import { live } from "./lib/runtime.mjs";
export const handler = async (event) => {
  const data = JSON.parse(event.body || "{}")?.payload?.data || {};
  if (!data.email || data["bot-field"]) return { statusCode: 200, body: "ignored" };
  await notifyBooking(live(), { name: data.name, email: data.email, session: data.session, date: data.date, message: data.message });
  return { statusCode: 200, body: "ok" };
};
