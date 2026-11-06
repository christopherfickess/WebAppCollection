// Serves public/ with the site's real security headers, for Lighthouse and manual checks.
import { createServer } from "node:http";
import { createSecureServer } from "node:http2";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname, resolve } from "node:path";
const ROOT = resolve("public");
const PORT = Number(process.env.PORT || 4489);
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2", ".json": "application/json", ".xml": "application/xml", ".txt": "text/plain" };
const headers = {};
let inAll = false;
for (const line of readFileSync(join(ROOT, "_headers"), "utf8").split("\n")) {
  if (/^\/\*\s*$/.test(line)) inAll = true;
  else if (/^\S/.test(line) && !line.startsWith("#")) inAll = false;
  else if (inAll && /^\s+\S+:/.test(line)) { const i = line.indexOf(":"); headers[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
}
// H2=1 serves over HTTP/2 with a throwaway certificate, like Netlify does, so
// Lighthouse timings are not skewed by HTTP/1.1's six-connection limit.
const handler = (req, res) => {
  let f = join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
  if (!f.startsWith(ROOT) || !existsSync(f)) return res.writeHead(404, headers).end("not found");
  res.writeHead(200, { ...headers, "Content-Type": TYPES[extname(f)] || "application/octet-stream", "Cache-Control": "public, max-age=3600" });
  res.end(readFileSync(f));
};
if (process.env.H2) {
  const dir = process.env.TMPDIR || "/tmp";
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", `${dir}/h2.key`, "-out", `${dir}/h2.crt`, "-days", "1", "-subj", "/CN=localhost"], { stdio: "ignore" });
  createSecureServer({ key: readFileSync(`${dir}/h2.key`), cert: readFileSync(`${dir}/h2.crt`), allowHTTP1: true }, handler).listen(PORT, () => console.log(`serving public/ on https://localhost:${PORT} (HTTP/2)`));
} else {
  createServer(handler).listen(PORT, () => console.log(`serving public/ on http://localhost:${PORT}`));
}
