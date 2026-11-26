(function () {
  // Saved choices are checked before use: a stale or edited value (or storage that is blocked) falls back to the defaults.
  function saved(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function pick(value, allowed, fallback) { return allowed.indexOf(value) >= 0 ? value : fallback; }
  var themePref = pick(saved("portfolio-theme-pref") || saved("portfolio-theme"), ["system", "light", "dark"], "system");
  var appliedTheme = themePref === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : themePref;
  var preset = pick(saved("portfolio-preset"), ["verdant", "ember", "signal"], "verdant");
  var railExpanded = saved("rail-expanded") === "true";
  document.documentElement.setAttribute("data-theme", appliedTheme);
  document.documentElement.setAttribute("data-theme-pref", themePref);
  document.documentElement.setAttribute("data-preset", preset);
  document.documentElement.setAttribute("data-rail-expanded", railExpanded ? "true" : "false");
})();
