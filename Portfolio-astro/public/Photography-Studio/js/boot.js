// Runs before the page paints (a plain, non-module script in <head>).
// Marks the page as script-enabled so the scroll-in animation only hides
// content when the script that reveals it is going to run.
document.documentElement.classList.add("js");

try { if (localStorage.getItem("fx-calm") === "1") document.documentElement.classList.add("calm"); } catch {}
