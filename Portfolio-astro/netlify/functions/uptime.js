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

export default async (req) => {
  const apiKey = process.env.UPTIMEROBOT_API_KEY;
  const debugRT = new URL(req.url).searchParams.has("debugrt");

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Uptime monitoring isn't configured yet." }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }

  // TEMP: probes a few candidate v3 response-time endpoint shapes
  // against the real API and reports which ones actually work, since
  // the public docs don't give an exact path. Removed once confirmed.
  if (debugRT) {
    const monitorsRes = await fetch("https://api.uptimerobot.com/v3/monitors", {
      headers: { Authorization: "Bearer " + apiKey, Accept: "application/json" },
    });
    const monitorsData = await monitorsRes.json();
    const firstId = (monitorsData.data || monitorsData.monitors || [])[0]?.id;

    const candidates = [
      "https://api.uptimerobot.com/v3/monitors/" + firstId + "/response-times",
      "https://api.uptimerobot.com/v3/monitors?responseTimes=1",
      "https://api.uptimerobot.com/v3/response-times?monitorId=" + firstId,
      "https://api.uptimerobot.com/v3/monitors/" + firstId + "?include=responseTimes",
    ];

    const results = {};
    for (const url of candidates) {
      try {
        const r = await fetch(url, { headers: { Authorization: "Bearer " + apiKey, Accept: "application/json" } });
        const bodyText = await r.text();
        results[url] = { status: r.status, body: bodyText.slice(0, 600) };
      } catch (e) {
        results[url] = { error: String(e) };
      }
    }
    return new Response(JSON.stringify({ firstId, results }, null, 2), {
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
