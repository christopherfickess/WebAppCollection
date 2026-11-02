// Server-side proxy: the Observability page's browser JS calls this
// function instead of UptimeRobot directly, so the account's API key
// (UPTIMEROBOT_API_KEY, set as a Netlify env var - never committed)
// stays on the server. Only a trimmed, normalized shape goes back to
// the client: no account-wide details beyond what the Uptime section
// needs to render a status list.
//
// Field mapping confirmed live against the real v3 response (GET
// /v3/monitors): top level is {data: [...]}, name is friendlyName,
// status is an uppercase string. Response-time data (min/max/avg/p95)
// does not appear to exist in v3 yet - probed the obvious query-param
// and sub-resource shapes and none added a responseTimes field, only
// a v2-era blog post mentions it. SSL/domain expiry and last-incident
// are real fields already in this same payload at no extra request
// cost; they're null unless the account enables SSL/domain checking
// on a given monitor (an UptimeRobot-side setting, not ours to flip).
// lastDayUptimes stayed an empty histogram even after the monitor had
// run for hours, so it's not a usable uptime-percentage source either.

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

export default async () => {
  const apiKey = process.env.UPTIMEROBOT_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Uptime monitoring isn't configured yet." }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const res = await fetch("https://api.uptimerobot.com/v3/monitors", {
      headers: {
        Authorization: "Bearer " + apiKey,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("UptimeRobot API " + res.status);
    }

    const data = await res.json();
    const rawMonitors = Array.isArray(data) ? data : data.data || data.monitors || [];

    const monitors = rawMonitors.map((m) => ({
      name: m.friendlyName || m.friendly_name || m.name || "Unnamed monitor",
      url: m.url || m.link || null,
      status: normalizeStatus(m.status),
      stateDurationSeconds:
        typeof m.currentStateDuration === "number" ? m.currentStateDuration : null,
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
    }));

    return new Response(JSON.stringify({ monitors }), {
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=120",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Couldn't reach UptimeRobot right now." }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
};

export const config = { path: "/api/uptime" };
