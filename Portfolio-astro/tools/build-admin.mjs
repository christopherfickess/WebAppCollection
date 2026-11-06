// Copies the editor's script from node_modules into the site, so it is served
// from our own domain (the strict Content-Security-Policy blocks CDNs).
import { copyFileSync, mkdirSync } from "node:fs";
const dir = "public/Photography-Studio/admin";
mkdirSync(dir, { recursive: true });
copyFileSync("node_modules/decap-cms/dist/decap-cms.js", `${dir}/decap-cms.js`);
console.log("admin ok: editor script copied");
