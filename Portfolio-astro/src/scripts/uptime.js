// Calls our own Netlify Function (/api/uptime), never UptimeRobot
// directly - the function holds the real API key server-side. Only
// runs on the Observability page. In local static preview (no
// serverless runtime) this route doesn't exist, so it fails closed
// into the same "not configured" message rather than throwing.

const STATUS_LABEL = {
  up: "Up",
  down: "Down",
  paused: "Paused",
  unknown: "Unknown",
};

function monitorRow(monitor) {
  const label = STATUS_LABEL[monitor.status] || STATUS_LABEL.unknown;
  const ratio =
    monitor.uptimeRatio !== null && monitor.uptimeRatio !== undefined
      ? '<span class="obs-uptime-ratio">' + Number(monitor.uptimeRatio).toFixed(2) + "% (30d)</span>"
      : "";
  const name = monitor.url
    ? '<a href="' + monitor.url + '" target="_blank" rel="noopener">' + monitor.name + "</a>"
    : monitor.name;

  return (
    '<div class="obs-uptime-row">' +
    '<span class="obs-uptime-dot obs-uptime-' + monitor.status + '"></span>' +
    '<span class="obs-uptime-name">' + name + "</span>" +
    '<span class="obs-uptime-badge obs-uptime-' + monitor.status + '">' + label + "</span>" +
    ratio +
    "</div>"
  );
}

async function loadUptime(container) {
  try {
    const res = await fetch("/api/uptime");
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error("not available");
    }

    if (res.status === 503) {
      container.innerHTML =
        '<p class="obs-empty">Not wired up yet - this section is ready to go the moment a monitor and API key are in place.</p>';
      return;
    }

    if (!res.ok) throw new Error("uptime function " + res.status);

    const data = await res.json();
    if (!data.monitors || !data.monitors.length) {
      container.innerHTML = '<p class="obs-empty">No monitors configured yet.</p>';
      return;
    }

    container.innerHTML = data.monitors.map(monitorRow).join("");
  } catch (err) {
    container.innerHTML =
      '<p class="obs-empty">Not wired up yet - this section is ready to go the moment a monitor and API key are in place.</p>';
  }
}

const uptimeContainer = document.getElementById("uptime-status");
if (uptimeContainer) loadUptime(uptimeContainer);
