(function () {
  var root = document.documentElement;
  var themeToggle = document.getElementById("theme-toggle");

  var yearEls = document.querySelectorAll(".copyright-year");
  for (var i = 0; i < yearEls.length; i++) {
    yearEls[i].textContent = new Date().getFullYear();
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      localStorage.setItem("portfolio-theme", next);
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

  var contactForm = document.getElementById("contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var data = new FormData(contactForm);
      var firstName = data.get("first-name") || "";
      var lastName = data.get("last-name") || "";
      var email = data.get("email") || "";
      var message = data.get("message") || "";
      var name = (firstName + " " + lastName).trim();

      var subject = "Portfolio contact from " + name;
      var body = message + "\n\n- " + name + " (" + email + ")";

      window.location.href =
        "mailto:cfickess20@gmail.com" +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(body);
    });
  }
})();
