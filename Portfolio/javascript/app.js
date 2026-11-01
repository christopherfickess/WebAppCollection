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
    applyThemePreference(root.getAttribute("data-theme-pref") || "dark");
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

    var activePreset = root.getAttribute("data-preset") || "verdant";
    displayOptions.forEach(function (opt) {
      opt.setAttribute("data-active", opt.dataset.preset === activePreset);
      opt.addEventListener("click", function () {
        var preset = opt.dataset.preset;
        root.setAttribute("data-preset", preset);
        localStorage.setItem("portfolio-preset", preset);
        displayOptions.forEach(function (o) {
          o.setAttribute("data-active", o === opt);
        });
        closeDisplayMenu();
      });
    });
  }

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

  function closeDrawer() {
    drawer.classList.remove("open");
    overlay.classList.remove("open");
  }

  if (burger && drawer && overlay) {
    burger.addEventListener("click", function () {
      drawer.classList.toggle("open");
      overlay.classList.toggle("open");
    });
    overlay.addEventListener("click", closeDrawer);
  }

  // Contact form: posts to Netlify Forms in the background (the form
  // already carries the `netlify` attribute Netlify's build bot scans
  // for) instead of handing off to a mailto: link, so submitting never
  // launches a separate mail app - it just sends from the page.
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
