// Single shared behavior module for every page, imported once from
// BaseLayout.astro - this is the "one function, not four copies" fix:
// previously this logic (plus the theme-boot snippet) was hand-copied
// into 4 separate HTML files and kept in sync manually.
(function () {
  var root = document.documentElement;

  var yearEls = document.querySelectorAll(".copyright-year");
  for (var i = 0; i < yearEls.length; i++) {
    yearEls[i].textContent = new Date().getFullYear();
  }

  // Theme: a real 3-way preference (light/dark/system), not a binary
  // flip - "system" stays live, tracking the OS setting via matchMedia
  // rather than just reading it once at click time.
  var themeOpts = document.querySelectorAll(".theme-opt");
  var darkMql = window.matchMedia("(prefers-color-scheme: dark)");

  function computeTheme(pref) {
    return pref === "system" ? (darkMql.matches ? "dark" : "light") : pref;
  }

  function applyThemePreference(pref) {
    root.setAttribute("data-theme", computeTheme(pref));
    root.setAttribute("data-theme-pref", pref);
    localStorage.setItem("portfolio-theme-pref", pref);
    themeOpts.forEach(function (btn) {
      var active = btn.dataset.themePref === pref;
      btn.setAttribute("data-active", active);
      btn.setAttribute("aria-checked", active ? "true" : "false");
    });
  }

  if (themeOpts.length) {
    applyThemePreference(root.getAttribute("data-theme-pref") || "system");
    themeOpts.forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyThemePreference(btn.dataset.themePref);
      });
    });
    darkMql.addEventListener("change", function () {
      if (root.getAttribute("data-theme-pref") === "system") {
        applyThemePreference("system");
      }
    });
  }

  // Display dropdown: named color presets, click to open/select/close.
  var displayToggle = document.getElementById("display-toggle");
  var displayDropdown = document.getElementById("display-dropdown");
  var displayOptions = document.querySelectorAll(".display-option");

  if (displayToggle && displayDropdown) {
    var closeDisplayMenu = function () {
      displayDropdown.hidden = true;
      displayToggle.setAttribute("aria-expanded", "false");
    };
    var openDisplayMenu = function () {
      displayDropdown.hidden = false;
      displayToggle.setAttribute("aria-expanded", "true");
    };

    displayToggle.addEventListener("click", function (event) {
      event.stopPropagation();
      if (displayDropdown.hidden) {
        openDisplayMenu();
      } else {
        closeDisplayMenu();
      }
    });

    document.addEventListener("click", function (event) {
      if (!displayDropdown.hidden && !displayDropdown.contains(event.target) && event.target !== displayToggle) {
        closeDisplayMenu();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !displayDropdown.hidden) {
        closeDisplayMenu();
        displayToggle.focus();
      }
    });

  }

  // Preset buttons exist twice (top-bar dropdown + mobile drawer); mark
  // active by preset key, not by element, so both copies stay in sync.
  var drawerDisplaySwatch = document.getElementById("drawer-display-swatch");
  var drawerDisplayName = document.getElementById("drawer-display-name");

  function markActivePreset(preset) {
    var label = "";
    displayOptions.forEach(function (o) {
      var active = o.dataset.preset === preset;
      o.setAttribute("data-active", active);
      o.setAttribute("aria-pressed", active ? "true" : "false");
      if (active && o.dataset.label) label = o.dataset.label;
    });
    // Mobile drawer's collapsed "Display" row shows the current choice.
    if (drawerDisplaySwatch) drawerDisplaySwatch.className = "display-swatch display-swatch-" + preset;
    if (drawerDisplayName) drawerDisplayName.textContent = label;
  }

  markActivePreset(root.getAttribute("data-preset") || "verdant");
  displayOptions.forEach(function (opt) {
    opt.addEventListener("click", function () {
      var preset = opt.dataset.preset;
      root.setAttribute("data-preset", preset);
      localStorage.setItem("portfolio-preset", preset);
      markActivePreset(preset);
      if (displayDropdown && !displayDropdown.hidden) {
        displayDropdown.hidden = true;
        displayToggle.setAttribute("aria-expanded", "false");
      }
    });
  });

  var railToggle = document.getElementById("rail-toggle");
  if (railToggle) {
    railToggle.addEventListener("click", function () {
      var expanded = root.getAttribute("data-rail-expanded") === "true";
      var next = !expanded;
      root.setAttribute("data-rail-expanded", next ? "true" : "false");
      localStorage.setItem("rail-expanded", next ? "true" : "false");
      railToggle.setAttribute("aria-pressed", next ? "true" : "false");
    });
  }

  var burger = document.getElementById("burger-toggle");
  var drawer = document.getElementById("mobile-drawer");
  var overlay = document.getElementById("drawer-overlay");

  var drawerClose = document.getElementById("drawer-close");
  var panelMain = document.getElementById("drawer-panel-main");
  var panelDisplay = document.getElementById("drawer-panel-display");
  var displayOpen = document.getElementById("drawer-display-open");
  var displayBack = document.getElementById("drawer-display-back");

  // Slide the Display sub-panel in/out. The off-screen panel is `inert`
  // so keyboard focus and screen readers only ever see the visible one.
  function setDisplayPanel(open, moveFocus) {
    if (!panelMain || !panelDisplay) return;
    drawer.classList.toggle("show-sub", open);
    panelMain.inert = open;
    panelDisplay.inert = !open;
    if (displayOpen) displayOpen.setAttribute("aria-expanded", open ? "true" : "false");
    if (moveFocus) (open ? displayBack : displayOpen).focus();
  }

  // One place sets open/closed so the classes, aria-expanded and the
  // body scroll lock never drift out of sync with each other.
  function setDrawer(open) {
    drawer.classList.toggle("open", open);
    overlay.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("drawer-open", open);
    if (!open) setDisplayPanel(false, false); // always reopen on the main menu
    if (open && drawerClose) drawerClose.focus();
  }

  function closeDrawer() {
    if (!drawer.classList.contains("open")) return;
    setDrawer(false);
    burger.focus();
  }

  if (burger && drawer && overlay) {
    burger.addEventListener("click", function () {
      setDrawer(!drawer.classList.contains("open"));
    });
    overlay.addEventListener("click", closeDrawer);
    if (drawerClose) drawerClose.addEventListener("click", closeDrawer);
    if (displayOpen) displayOpen.addEventListener("click", function () { setDisplayPanel(true, true); });
    if (displayBack) displayBack.addEventListener("click", function () { setDisplayPanel(false, true); });
    // Escape steps back one level: sub-panel -> main menu -> closed.
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (drawer.classList.contains("show-sub")) setDisplayPanel(false, true);
      else closeDrawer();
    });
    // Rotating a phone/tablet past the 850px breakpoint hides the
    // burger; don't leave an invisible open drawer + scroll lock behind.
    window.matchMedia("(min-width: 851px)").addEventListener("change", function (e) {
      if (e.matches) setDrawer(false);
    });
  }

  // Resume page: browsers with no built-in PDF viewer (most phones)
  // show the <object>'s fallback - page images - instead of the PDF.
  // Those need the frame to grow to fit them rather than the fixed-height
  // viewer box. navigator.pdfViewerEnabled is false on Android Chrome and
  // iOS; undefined on old browsers, which keep the default (object +
  // fallback inside the fixed frame, still scrollable).
  var resumeFrame = document.querySelector(".resume-pdf-frame");
  if (resumeFrame && navigator.pdfViewerEnabled === false) {
    resumeFrame.classList.add("is-image-preview");
  }

  // Contact form: posts to Netlify Forms in the background instead of
  // a mailto: link, so submitting never launches a separate mail app.
  var contactForm = document.getElementById("contact-form");
  var contactStatus = document.getElementById("contact-status");

  function encodeFormData(data) {
    var pairs = [];
    data.forEach(function (value, key) {
      pairs.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
    });
    return pairs.join("&");
  }

  if (contactForm) {
    contactForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var submitBtn = contactForm.querySelector("button[type=submit]");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending...";
      }

      fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: encodeFormData(new FormData(contactForm)),
      })
        .then(function (response) {
          if (!response.ok) throw new Error("Form submission failed");
          contactForm.hidden = true;
          if (contactStatus) {
            contactStatus.hidden = false;
            contactStatus.className = "contact-status";
            contactStatus.textContent = "Thanks, that's on its way. I'll get back to you soon.";
          }
        })
        .catch(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit";
          }
          if (contactStatus) {
            contactStatus.hidden = false;
            contactStatus.className = "contact-status contact-status-error";
            contactStatus.textContent = "Something went wrong sending that. Try again, or email me directly at cfickess20@gmail.com.";
          }
        });
    });
  }
})();
