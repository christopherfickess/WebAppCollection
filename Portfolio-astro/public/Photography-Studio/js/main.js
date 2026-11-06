// Entry point: hand the content to the components, then register them.
import { setStore } from "./core.js";
import { content } from "./data.js";
import { SiteHeader, SiteFooter } from "./components/layout.js";
import { Hero, About, Gallery, Packages, Day, Trail, Wall, Faq } from "./components/sections.js";
import { Photo } from "./lib/photo.js";
import { Lightbox } from "./lib/lightbox.js";
import { Reveal } from "./lib/reveal.js";
import { Light } from "./lib/light.js";
import { LightNote } from "./lib/sun.js";

setStore(content);
[SiteHeader, SiteFooter, Hero, About, Gallery, Packages, Day, Trail, Wall, Faq].forEach((C) => C.define());

Photo.applyPositions(document);
Lightbox.attach();
Reveal.attach();
Light.attach();
LightNote.attach(content.site.location);

// ?package=Half%20day#contact fills the form's "Session" field.
const wanted = new URLSearchParams(location.search).get("package");
const select = document.querySelector("#session");
if (wanted && select) [...select.options].forEach((o) => o.value === wanted && (select.value = wanted));
