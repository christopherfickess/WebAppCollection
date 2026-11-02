// Server-side proxy: the Observability page's browser JS calls this
// function instead of UptimeRobot directly, so the account's API key
// (UPTIMEROBOT_API_KEY, set as a Netlify env var - never committed)
// stays on the server. Only a trimmed, normalized shape goes back to
// the client: no account-wide details beyond what the Uptime section
// needs to render a status list.

function normalizeStatus(raw) {
  // Confirmed live against the real v3 response: status is an
  // uppercase string like "UP". Matched loosely in case other values
  // ("SEEMS_DOWN", "NOT_CHECKED_YET", etc.) show up for other monitor
  // states.
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
