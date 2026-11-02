// Calls our own Netlify Function (/api/uptime), never UptimeRobot
// directly - the function holds the real API key server-side. Only
// runs on the Observability page. In local static preview (no
// serverless runtime) this route doesn't exist, so it fails closed
// into the same "not configured" message rather than throwing.

const STATUS_WORD = {
  up: "Operational",
  down: "Down",
  paused: "Paused",
  unknown: "Unknown",
};

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname + new URL(url).pathname.replace(/\/$/, "");
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

function dataItem(label, value, warn, full) {
  if (!value) return "";
  return (
    '<div class="obs-uptime-data-item' +
    (full ? " obs-uptime-data-full" : "") +
    '"><dt>' +
    label +
    "</dt><dd" +
    (warn ? ' class="obs-uptime-data-warn"' : "") +
    ">" +
    value +
    "</dd></div>"
  );
}

function expiryValue(dateString) {
  const days = daysUntil(dateString);
  if (days === null) return { value: null, warn: false };
  if (days < 0) return { value: "Expired", warn: true };
  return { value: days + " days", warn: days <= 14 };
}

function incidentValue(incident) {
  if (!incident || !incident.startedAt) return { value: "None recorded", warn: false };
  const started = new Date(incident.startedAt).getTime();
  if (Number.isNaN(started)) return { value: "None recorded", warn: false };
  if (!incident.endedAt) {
    return { value: "Ongoing since " + (formatDate(incident.startedAt) || "recently"), warn: true };
  }
  const daysAgo = Math.floor((Date.now() - started) / 86400000);
  return { value: daysAgo <= 0 ? "Today" : daysAgo + "d ago", warn: false };
}

function monitorCard(monitor) {
  const statusWord = STATUS_WORD[monitor.status] || STATUS_WORD.unknown;
  const duration = formatDuration(monitor.stateDurationSeconds);
  const name = escapeHtml(monitor.name);
  const host = monitor.url ? escapeHtml(hostnameOf(monitor.url)) : "";
  const showHost = host && host !== name;
  const monitoringSince = formatDate(monitor.monitoringSince);
  const ssl = expiryValue(monitor.sslExpiryDateTime);
  const domain = expiryValue(monitor.domainExpireDate);
  const incident = incidentValue(monitor.lastIncident);

  const items = [
    dataItem(monitor.status === "down" ? "Down for" : "Up for", duration),
    dataItem("Checks every", monitor.intervalSeconds && monitor.intervalSeconds % 60 === 0 ? monitor.intervalSeconds / 60 + " min" : null),
    dataItem("Monitoring since", monitoringSince),
    dataItem("SSL cert", ssl.value, ssl.warn),
    dataItem("Domain", domain.value, domain.warn),
    dataItem("Last incident", incident.value, incident.warn, true),
  ]
    .filter(Boolean)
    .join("");

  const nameEl = monitor.url
    ? '<a href="' + monitor.url + '" target="_blank" rel="noopener" title="' + name + '">' + name + "</a>"
    : name;

  return (
    '<div class="obs-uptime-card obs-uptime-card-' + monitor.status + '">' +
    '<div class="obs-uptime-card-status">' +
    '<span class="obs-uptime-ring obs-uptime-ring-' + monitor.status + '"><span class="obs-uptime-dot obs-uptime-' + monitor.status + '"></span></span>' +
    '<span class="obs-uptime-status-word obs-uptime-status-word-' + monitor.status + '">' + statusWord + "</span>" +
    "</div>" +
    '<div class="obs-uptime-card-name">' + nameEl + "</div>" +
    (showHost ? '<div class="obs-uptime-card-host">' + host + "</div>" : "") +
    '<dl class="obs-uptime-datagrid">' + items + "</dl>" +
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
    '<span class="obs-uptime-ring obs-uptime-ring-' + tone + '"><span class="obs-uptime-dot obs-uptime-' + tone + '"></span></span>' +
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
