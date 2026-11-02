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

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return url;
  }
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return null;
  if (seconds < 60) return "under 1m";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + "m";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + "h " + (minutes % 60) + "m";
  const days = Math.floor(hours / 24);
  return days + "d " + (hours % 24) + "h";
}

function formatDate(dateString) {
  if (!dateString) return null;
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function daysUntil(dateString) {
  if (!dateString) return null;
  const target = new Date(dateString).getTime();
  if (Number.isNaN(target)) return null;
  return Math.ceil((target - Date.now()) / 86400000);
}

function detailRow(text, warn) {
  return '<div class="obs-uptime-detail' + (warn ? " obs-uptime-detail-warn" : "") + '">' + text + "</div>";
}

function expiryDetail(label, dateString) {
  const days = daysUntil(dateString);
  if (days === null) return "";
  const urgent = days <= 14;
  const text = days < 0 ? label + " cert expired" : label + " expires in " + days + "d";
  return detailRow(text, urgent);
}

function incidentDetail(incident) {
  if (!incident || !incident.startedAt) return detailRow("No incidents recorded");
  const started = new Date(incident.startedAt).getTime();
  if (Number.isNaN(started)) return "";
  if (!incident.endedAt) {
    return detailRow("Ongoing incident since " + (formatDate(incident.startedAt) || "recently"), true);
  }
  const daysAgo = Math.floor((Date.now() - started) / 86400000);
  return detailRow("Last incident " + (daysAgo <= 0 ? "today" : daysAgo + "d ago"));
}

function monitorCard(monitor) {
  const label = STATUS_LABEL[monitor.status] || STATUS_LABEL.unknown;
  const duration = formatDuration(monitor.stateDurationSeconds);
  const sinceWord = monitor.status === "up" ? "Up for " : monitor.status === "down" ? "Down for " : "For ";
  const name = escapeHtml(monitor.name);
  const host = monitor.url ? escapeHtml(hostnameOf(monitor.url)) : "";
  const monitoringSince = formatDate(monitor.monitoringSince);

  const details = [
    duration ? detailRow(sinceWord + duration) : "",
    monitor.intervalSeconds && monitor.intervalSeconds % 60 === 0
      ? detailRow("Checked every " + monitor.intervalSeconds / 60 + "m")
      : "",
    monitoringSince ? detailRow("Monitoring since " + monitoringSince) : "",
    expiryDetail("SSL", monitor.sslExpiryDateTime),
    expiryDetail("Domain", monitor.domainExpireDate),
    incidentDetail(monitor.lastIncident),
  ]
    .filter(Boolean)
    .join("");

  const nameEl = monitor.url
    ? '<a href="' + monitor.url + '" target="_blank" rel="noopener" title="' + name + '">' + name + "</a>"
    : name;

  return (
    '<div class="obs-uptime-card obs-uptime-card-' + monitor.status + '">' +
    '<div class="obs-uptime-card-head">' +
    '<span class="obs-uptime-dot obs-uptime-' + monitor.status + '"></span>' +
    '<span class="obs-uptime-badge obs-uptime-' + monitor.status + '">' + label + "</span>" +
    "</div>" +
    '<div class="obs-uptime-card-name">' + nameEl + "</div>" +
    (host ? '<div class="obs-uptime-card-host">' + host + "</div>" : "") +
    '<div class="obs-uptime-details">' + details + "</div>" +
    "</div>"
  );
}

function summaryBar(monitors) {
  const total = monitors.length;
  const upCount = monitors.filter((m) => m.status === "up").length;
  const downCount = monitors.filter((m) => m.status === "down").length;

  let tone = "up";
  let text = "All systems operational (" + upCount + "/" + total + " up)";
  if (downCount > 0) {
    tone = "down";
    text = downCount + " of " + total + " down right now";
  } else if (upCount < total) {
    tone = "paused";
    text = upCount + "/" + total + " up, rest paused or unchecked";
  }

  return (
    '<div class="obs-uptime-summary obs-uptime-summary-' + tone + '">' +
    '<span class="obs-uptime-dot obs-uptime-' + tone + '"></span>' +
    text +
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

    container.innerHTML =
      summaryBar(data.monitors) +
      '<div class="obs-uptime-grid">' +
      data.monitors.map(monitorCard).join("") +
      "</div>";
  } catch (err) {
    container.innerHTML =
      '<p class="obs-empty">Not wired up yet - this section is ready to go the moment a monitor and API key are in place.</p>';
  }
}

const uptimeContainer = document.getElementById("uptime-status");
if (uptimeContainer) loadUptime(uptimeContainer);
