(function () {
  "use strict";

  var root = document.querySelector("[data-approvals]");
  if (!root) return;

  root.querySelectorAll("[data-approval-section]").forEach(function (section) {
    var selectAll = section.querySelector("[data-select-all]");
    var checks = Array.prototype.slice.call(
      section.querySelectorAll("[data-row-check]")
    );
    var countEl = section.querySelector("[data-selected-count]");
    var selectedBtn = section.querySelector("[data-approve-selected]");
    var allBtn = section.querySelector("[data-approve-all]");

    function selected() {
      return checks.filter(function (el) {
        return el.checked;
      });
    }

    function sync() {
      var n = selected().length;
      if (countEl) countEl.textContent = String(n);
      if (selectedBtn) selectedBtn.disabled = n === 0;
      if (selectAll) {
        selectAll.checked = checks.length > 0 && n === checks.length;
        selectAll.indeterminate = n > 0 && n < checks.length;
      }
    }

    if (selectAll) {
      selectAll.addEventListener("change", function () {
        checks.forEach(function (el) {
          el.checked = selectAll.checked;
        });
        sync();
      });
    }

    checks.forEach(function (el) {
      el.addEventListener("change", sync);
    });

    if (selectedBtn) {
      selectedBtn.addEventListener("click", function (event) {
        if (selected().length === 0) {
          event.preventDefault();
          return;
        }
        // Ensure approve_all is not sent as 1
        var hidden = section.querySelector('input[name="approve_all"][type="hidden"]');
        if (!hidden) {
          hidden = document.createElement("input");
          hidden.type = "hidden";
          hidden.name = "approve_all";
          section.appendChild(hidden);
        }
        hidden.value = "0";
      });
    }

    if (allBtn) {
      allBtn.addEventListener("click", function () {
        checks.forEach(function (el) {
          el.checked = true;
        });
        sync();
      });
    }

    sync();
  });
})();
