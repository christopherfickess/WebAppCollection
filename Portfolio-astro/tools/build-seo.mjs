// Writes the search and sharing files for Photography-Studio:
//   public/sitemap.xml, public/robots.txt, and the block of <meta> tags and
//   structured data between the "seo:start" and "seo:end" markers in index.html.
// Runs before every build. The site address comes from Netlify (URL or
// DEPLOY_PRIME_URL); set SITE_URL to override. Without one it uses example.com.
import { readFileSync, writeFileSync } from "node:fs";
import { content } from "../public/Photography-Studio/js/data.js";

const origin = (process.env.SITE_URL || process.env.URL || process.env.DEPLOY_PRIME_URL || "https://example.com").replace(/\/$/, "");
const base = `${origin}/Photography-Studio/`;
const s = content.site;
const desc = "Landscape and wildlife photography sessions, with packages and online booking.";
const esc = (v) => String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

const ld = {
  "@context": "https://schema.org",
  "@type": s.business?.type || "ProfessionalService",
  name: s.name,
  url: base,
  image: `${base}img/og.jpg`,
  description: desc,
  priceRange: s.business?.priceRange,
  address: { "@type": "PostalAddress", addressLocality: s.location.place.split(",")[0], addressRegion: s.business?.region, addressCountry: s.business?.country },
  geo: { "@type": "GeoCoordinates", latitude: s.location.lat, longitude: s.location.lon },
};
if (s.business?.phone) ld.telephone = s.business.phone;

const block = `<!-- seo:start (written by tools/build-seo.mjs) -->
  <link rel="canonical" href="${base}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${esc(s.name)}" />
  <meta property="og:title" content="${esc(s.name)} | Landscape and wildlife photographer" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:url" content="${base}" />
  <meta property="og:image" content="${base}img/og.jpg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <script type="application/ld+json">${JSON.stringify(ld)}</script>
  <!-- seo:end -->`;

// The header and hero are also written straight into the HTML, so the browser
// can paint them before any script runs. The components keep the markup as is
// (data-prerendered) and only attach their behaviour.
globalThis.HTMLElement ??= class {};
const { setStore } = await import("../public/Photography-Studio/js/core.js");
const { SiteHeader } = await import("../public/Photography-Studio/js/components/layout.js");
const { Hero } = await import("../public/Photography-Studio/js/components/sections.js");
setStore(content);
const prerender = (html, tag, C, data) =>
  html.replace(new RegExp(`(<${tag}[^>]*data-prerendered[^>]*>)[\\s\\S]*?(</${tag}>)`), (_, open, close) => `${open}<!-- pre:start -->${String(C.prototype.render.call({}, data))}<!-- pre:end -->${close}`);

const file = new URL("../public/Photography-Studio/index.html", import.meta.url);
let html = readFileSync(file, "utf8");
html = /<!-- seo:start[\s\S]*?seo:end -->/.test(html)
  ? html.replace(/<!-- seo:start[\s\S]*?seo:end -->/, block)
  : html.replace("</head>", `  ${block}\n</head>`);
html = prerender(prerender(html, "fx-header", SiteHeader, content.site), "fx-hero", Hero, content.hero);
writeFileSync(file, html);

const pages = ["", "privacy/", "terms/"].map((p) => `  <url><loc>${base}${p}</loc></url>`).join("\n");
writeFileSync(new URL("../public/sitemap.xml", import.meta.url), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages}\n</urlset>\n`);
writeFileSync(new URL("../public/robots.txt", import.meta.url), `User-agent: *\nAllow: /\nDisallow: /Photography-Studio/admin/\n\nSitemap: ${origin}/sitemap.xml\n`);
console.log("SEO files written for", base);
