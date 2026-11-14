// Tells the studio when a visitor's browser hits a JavaScript error, so a broken page is noticed.
// Sends only the message, the script, the line and the page path. Respects Do Not Track.
export class ErrorReporter {
  static attach() {
    if (navigator.doNotTrack === "1" || navigator.globalPrivacyControl) return;
    let sent = 0;
    const send = (message, source, line) => {
      if (sent >= 3 || !message) return; // a loop of errors must not become a flood of requests
      if (/^Script error\.?$/i.test(message) || /^(chrome|moz|safari)-extension:/i.test(source || "")) return; // not our code
      sent += 1;
      try {
        const body = JSON.stringify({ message: String(message).slice(0, 200), source: String(source || "").slice(0, 200), line: line || 0, path: location.pathname });
        if (!navigator.sendBeacon?.("/api/client-error", new Blob([body], { type: "text/plain" }))) fetch("/api/client-error", { method: "POST", body, keepalive: true }).catch(() => {});
      } catch {}
    };
    window.addEventListener("error", (e) => send(e.message, e.filename, e.lineno));
    window.addEventListener("unhandledrejection", (e) => send(`Unhandled rejection: ${e.reason?.message || e.reason}`, "", 0));
  }
}
