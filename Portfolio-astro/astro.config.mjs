import { defineConfig } from "astro/config";

// Static output (default) - every page is pre-rendered to plain HTML at
// build time, nothing runs server-side after that. Deploys to Netlify
// exactly like the hand-written HTML version did: Netlify runs
// `npm run build` and publishes `dist/`, no container, no server.
export default defineConfig({
  site: "https://main--fickess.netlify.app",
  trailingSlash: "always",
  build: {
    format: "directory",
  },
  vite: {
    build: {
      // Vite inlines any built asset under 4kb as a data URI / inline
      // <script> by default - site.js and starfield.js are both small
      // enough to hit that threshold, which would bake their JS
      // directly into each page's HTML instead of a separate hashed
      // file. That breaks a strict CSP (script-src 'self' only allows
      // same-origin SRC'd scripts, not inline content) and defeats the
      // whole point of hashed, cacheable, written-once assets. Forcing
      // this to 0 keeps every script/style as its own external file
      // regardless of size.
      assetsInlineLimit: 0,
    },
  },
});
