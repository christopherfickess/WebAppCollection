(function () {
  var themePref = localStorage.getItem("portfolio-theme-pref") || localStorage.getItem("portfolio-theme") || "dark";
  var appliedTheme = themePref === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : themePref;
  var preset = localStorage.getItem("portfolio-preset") || "verdant";
  var railExpanded = localStorage.getItem("rail-expanded") === "true";
  document.documentElement.setAttribute("data-theme", appliedTheme);
  document.documentElement.setAttribute("data-theme-pref", themePref);
  document.documentElement.setAttribute("data-preset", preset);
  document.documentElement.setAttribute("data-rail-expanded", railExpanded ? "true" : "false");
})();
