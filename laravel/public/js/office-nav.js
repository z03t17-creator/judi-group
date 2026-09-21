(function () {
  "use strict";

  var shell = document.querySelector("[data-office-shell]");
  if (!shell) return;

  var backdrop = shell.querySelector("[data-office-menu-backdrop]");

  function openMenu() {
    shell.classList.add("is-menu-open");
    document.documentElement.classList.add("office-menu-lock");
    if (backdrop) backdrop.hidden = false;
  }

  function closeMenu() {
    shell.classList.remove("is-menu-open");
    document.documentElement.classList.remove("office-menu-lock");
    if (backdrop) backdrop.hidden = true;
  }

  document.addEventListener("click", function (event) {
    if (event.target.closest("[data-office-menu-open]")) {
      event.preventDefault();
      openMenu();
      return;
    }
    if (event.target.closest("[data-office-menu-close]")) {
      event.preventDefault();
      closeMenu();
      return;
    }
    if (backdrop && event.target === backdrop) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeMenu();
  });

  // Close drawer after navigating via a nav link on small screens.
  shell.querySelectorAll(".office-sidebar .nav-item").forEach(function (link) {
    link.addEventListener("click", function () {
      if (window.matchMedia("(max-width: 1023px)").matches) {
        closeMenu();
      }
    });
  });
})();
