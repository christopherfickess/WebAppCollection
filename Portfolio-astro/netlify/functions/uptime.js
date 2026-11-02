// Server-side proxy: the Observability page's browser JS calls this
// function instead of UptimeRobot directly, so the account's API key
// (UPTIMEROBOT_API_KEY, set as a Netlify env var - never committed)
// stays on the server. Only a trimmed, normalized shape goes back to
// the client: no account-wide details beyond what the Uptime section
// needs to render a status list.
//
// Field mapping confirmed live against the real v3 response (GET
// /v3/monitors): top level is {data: [...]}, name is friendlyName,
// status is an uppercase string. SSL/domain expiry and last-incident
// are real fields already in this same payload at no extra request
// cost; they're null unless the account enables SSL/domain checking
// on a given monitor (an UptimeRobot-side setting, not ours to flip).
//
// Per-monitor uptime % comes from a second call per monitor, GET
// /monitors/{id}/stats/uptime (confirmed against the official OpenAPI
// spec at cdn.uptimerobot.com/api/openapi.yaml - response time has an
// equivalent /stats/response-time endpoint but isn't fetched yet: at
// 1 (list) + 1 (uptime) + 1 (response-time) per monitor, 5 monitors
// would be 16 calls in one refresh, over the free tier's 10 req/min
// cap in a single page load. Adding both without a bigger rework
// (e.g. alternating which stat refreshes) risks 429s, so only uptime
// is wired in for now.
//
// Caching: Netlify Blobs holds the last computed snapshot so repeat
// visitors inside CACHE_TTL_MS are served from cache instead of each
// triggering a fresh UptimeRobot call - this is required, not just an
// optimization, since testing this function directly (no cache) by
// hitting it repeatedly already triggered real 429s from UptimeRobot
// earlier in this project. On a cache miss that errors, falls back to
// the last good cached snapshot rather than breaking the section.

import { getStore } from "@netlify/blobs";

const CACHE_KEY = "uptime-snapshot";
const CACHE_TTL_MS = 150000; // under the 5-minute monitor check interval

function normalizeStatus(raw) {
  if (typeof raw === "string") {
    const s = raw.toLowerCase();
    if (s.includes("down")) return "down";
    if (s.includes("pause")) return "paused";
    if (s.includes("up")) return "up";
    return "unknown";
  }
  return "unknown";
}

async function fetchUptimePercent(apiKey, monitorId) {
  const from = new Date(Date.now() - 30 * 86400000).toISOString();
  const to = new Date().toISOString();
  const url =
    "https://api.uptimerobot.com/v3/monitors/" +
    monitorId +
    "/stats/uptime?from=" +
    encodeURIComponent(from) +
    "&to=" +
    encodeURIComponent(to);
  try {
    const res = await fetch(url, { headers: { Authorization: "Bearer " + apiKey, Accept: "application/json" } });
    if (!res.ok) return null;
    const stats = await res.json();
    return {
      uptimePercent: typeof stats.uptime === "number" ? stats.uptime : null,
      incidentCount: typeof stats.incident_count === "number" ? stats.incident_count : null,
      mtbfSeconds: typeof stats.mtbf === "number" ? stats.mtbf : null,
    };
  } catch (e) {
    return null;
  }
}

async function buildSnapshot(apiKey) {
  const res = await fetch("https://api.uptimerobot.com/v3/monitors", {
    headers: { Authorization: "Bearer " + apiKey, Accept: "application/json" },
  });
  if (!res.ok) throw new Error("UptimeRobot API " + res.status);

  const data = await res.json();
  const rawMonitors = Array.isArray(data) ? data : data.data || data.monitors || [];

  const uptimeStats = await Promise.all(rawMonitors.map((m) => fetchUptimePercent(apiKey, m.id)));

  return rawMonitors.map((m, i) => ({
    name: m.friendlyName || m.friendly_name || m.name || "Unnamed monitor",
    url: m.url || m.link || null,
    status: normalizeStatus(m.status),
    stateDurationSeconds: typeof m.currentStateDuration === "number" ? m.currentStateDuration : null,
    intervalSeconds: typeof m.interval === "number" ? m.interval : null,
    sslExpiryDateTime: m.sslExpiryDateTime || null,
    domainExpireDate: m.domainExpireDate || null,
    lastIncident: m.lastIncident
      ? {
          startedAt: m.lastIncident.startedAt || m.lastIncident.started_at || null,
          endedAt: m.lastIncident.endedAt || m.lastIncident.ended_at || null,
        }
      : null,
    monitoringSince: m.createDateTime || null,
    type: m.type || null,
    region: Array.isArray(m.regionalData?.REGION) ? m.regionalData.REGION.join(", ") : null,
    timeoutSeconds: typeof m.timeout === "number" ? m.timeout : null,
    expectedCodes: Array.isArray(m.successHttpResponseCodes) ? m.successHttpResponseCodes : null,
    tags: Array.isArray(m.tags) ? m.tags : [],
    maintenanceWindowCount: Array.isArray(m.maintenanceWindows) ? m.maintenanceWindows.length : 0,
    uptimePercent30d: uptimeStats[i]?.uptimePercent ?? null,
    incidentCount30d: uptimeStats[i]?.incidentCount ?? null,
    mtbfSeconds: uptimeStats[i]?.mtbfSeconds ?? null,
  }));
}

export default async () => {
  const apiKey = process.env.UPTIMEROBOT_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Uptime monitoring isn't configured yet." }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }

  const store = getStore("observability");
  let cached = null;
  try {
    cached = await store.get(CACHE_KEY, { type: "json" });
  } catch (e) {
    cached = null;
  }

  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return new Response(JSON.stringify({ monitors: cached.monitors }), {
      headers: { "content-type": "application/json", "x-uptime-cache": "hit" },
    });
  }

  try {
    const monitors = await buildSnapshot(apiKey);
    try {
      await store.setJSON(CACHE_KEY, { fetchedAt: Date.now(), monitors });
    } catch (e) {
      // cache write failure shouldn't fail the request - just means the
      // next visitor triggers a fresh fetch too
    }
    return new Response(JSON.stringify({ monitors }), {
      headers: { "content-type": "application/json", "x-uptime-cache": "miss" },
    });
  } catch (err) {
    if (cached) {
      return new Response(JSON.stringify({ monitors: cached.monitors }), {
        headers: { "content-type": "application/json", "x-uptime-cache": "stale" },
      });
    }
    return new Response(JSON.stringify({ error: "Couldn't reach UptimeRobot right now." }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
};

export const config = { path: "/api/uptime" };
