import { availability, json } from "./lib/studio.mjs";
import { live } from "./lib/runtime.mjs";
export default async () => json(200, await availability(live()));
export const config = { path: "/api/availability" };
