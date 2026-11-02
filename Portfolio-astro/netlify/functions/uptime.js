// Server-side proxy: the Observability page's browser JS calls this
// function instead of UptimeRobot directly, so the account's API key
// (UPTIMEROBOT_API_KEY, set as a Netlify env var - never committed)
// stays on the server. Only a trimmed, normalized shape goes back to
// the client: no account-wide details beyond what the Uptime section
// needs to render a status list.

function normalizeStatus(raw) {
  // v3 is expected to use a string status; fall back to legacy v2's
  // numeric codes (0 paused, 1 not-checked-yet, 2 up, 8 seems-down,
  // 9 down) in case the account/endpoint still answers in that shape.
  if (typeof raw === "string") {
    const s = raw.toLowerCase();
    if (s.includes("down")) return "down";
    if (s.includes("pause")) return "paused";
    if (s.includes("up")) return "up";
    return "unknown";
  }
  if (typeof raw === "number") {
    if (raw === 2) return "up";
    if (raw === 9 || raw === 8) return "down";
    if (raw === 0) return "paused";
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
    const rawMonitors = Array.isArray(data) ? data : data.monitors || data.data || [];

    const monitors = rawMonitors.map((m) => ({
      name: m.friendly_name || m.friendlyName || m.name || "Unnamed monitor",
      url: m.url || m.link || null,
      status: normalizeStatus(m.status),
      uptimeRatio:
        m.custom_uptime_ratio ??
        m.uptime_ratio ??
        m.uptimeRatio ??
        (m.uptime && m.uptime.ratio) ??
        null,
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
