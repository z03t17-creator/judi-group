(function () {
  "use strict";

  var root = document.querySelector("[data-product-barcode-scan]");
  if (!root) return;

  var lookupUrl = root.getAttribute("data-lookup-url") || "";
  var createUrl = root.getAttribute("data-create-url") || "";
  var canManage = root.getAttribute("data-can-manage") === "1";
  var labels = {
    scan: root.getAttribute("data-label-scan") || "Scan barcode",
    hint: root.getAttribute("data-label-hint") || "Place the code inside the frame",
    error: root.getAttribute("data-label-error") || "Camera could not start.",
    found: root.getAttribute("data-label-found") || "Product found",
    missing: root.getAttribute("data-label-missing") || "Product not in system",
    view: root.getAttribute("data-label-view") || "View",
    edit: root.getAttribute("data-label-edit") || "Edit",
    create: root.getAttribute("data-label-create") || "Create product",
    close: root.getAttribute("data-label-close") || "Close",
    brand: root.getAttribute("data-label-brand") || "Judy's Shelter",
  };

  function flash(title, body) {
    var host = document.querySelector("[data-notif-toast-host]");
    if (!host) {
      window.alert((title || "") + (body ? "\n" + body : ""));
      return;
    }
    host.querySelectorAll("[data-scan-toast]").forEach(function (node) {
      node.remove();
    });
    var el = document.createElement("div");
    el.className = "notif-toast";
    el.setAttribute("data-notif-toast", "");
    el.setAttribute("data-scan-toast", "");
    el.innerHTML =
      '<span class="notif-toast__body"><strong class="notif-toast__title"></strong>' +
      '<span class="notif-toast__text"></span></span>';
    el.querySelector(".notif-toast__title").textContent = title || labels.brand;
    el.querySelector(".notif-toast__text").textContent = body || "";
    host.appendChild(el);
    window.setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 3200);
  }

  function showResult(data, code) {
    var existing = document.querySelector("[data-barcode-result]");
    if (existing) existing.remove();

    var dialog = document.createElement("dialog");
    dialog.className = "barcode-result-dialog";
    dialog.setAttribute("data-barcode-result", "");

    if (data && data.found) {
      dialog.innerHTML =
        '<div class="barcode-result-dialog__card">' +
        "<h2>" +
        escapeHtml(labels.found) +
        "</h2>" +
        '<p class="barcode-result-dialog__name"></p>' +
        '<p class="barcode-result-dialog__meta num" dir="ltr"></p>' +
        '<div class="barcode-result-dialog__actions"></div>' +
        "</div>";
      dialog.querySelector(".barcode-result-dialog__name").textContent =
        data.name || "";
      dialog.querySelector(".barcode-result-dialog__meta").textContent =
        (data.sku ? data.sku + " · " : "") + (data.barcode || code || "");

      var actions = dialog.querySelector(".barcode-result-dialog__actions");
      if (data.view_url) {
        actions.appendChild(linkBtn(data.view_url, labels.view, "btn btn--regular"));
      }
      if (canManage && data.edit_url) {
        actions.appendChild(linkBtn(data.edit_url, labels.edit, "btn btn--primary"));
      }
      actions.appendChild(closeBtn());
    } else {
      dialog.innerHTML =
        '<div class="barcode-result-dialog__card">' +
        "<h2>" +
        escapeHtml(labels.missing) +
        "</h2>" +
        '<p class="barcode-result-dialog__meta num" dir="ltr"></p>' +
        '<div class="barcode-result-dialog__actions"></div>' +
        "</div>";
      dialog.querySelector(".barcode-result-dialog__meta").textContent = code || "";
      var missingActions = dialog.querySelector(".barcode-result-dialog__actions");
      if (canManage && createUrl) {
        var href =
          createUrl +
          (createUrl.indexOf("?") === -1 ? "?" : "&") +
          "barcode=" +
          encodeURIComponent(code || "");
        missingActions.appendChild(
          linkBtn(href, labels.create, "btn btn--primary")
        );
      }
      missingActions.appendChild(closeBtn());
    }

    document.body.appendChild(dialog);
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "open");

    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) closeDialog(dialog);
    });
  }

  function linkBtn(href, text, className) {
    var a = document.createElement("a");
    a.href = href;
    a.className = className;
    a.textContent = text;
    return a;
  }

  function closeBtn() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn--ghost";
    btn.textContent = labels.close;
    btn.addEventListener("click", function () {
      var dialog = btn.closest("dialog");
      if (dialog) closeDialog(dialog);
    });
    return btn;
  }

  function closeDialog(dialog) {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
    if (dialog.parentNode) dialog.parentNode.removeChild(dialog);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function lookup(code) {
    if (!lookupUrl) {
      flash(labels.error, code);
      return;
    }
    var url =
      lookupUrl +
      (lookupUrl.indexOf("?") === -1 ? "?" : "&") +
      "barcode=" +
      encodeURIComponent(code);

    fetch(url, {
      headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
      credentials: "same-origin",
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        var data = result.data || {};
        if (data.found) {
          flash(labels.found, data.name || code);
        } else {
          flash(labels.missing, code);
        }
        showResult(data, code);
      })
      .catch(function () {
        flash(labels.error, code);
      });
  }

  function openScanner(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!window.JudiBarcodeScanner || typeof window.JudiBarcodeScanner.open !== "function") {
      flash(labels.brand, labels.error);
      return;
    }
    window.JudiBarcodeScanner.open({
      labels: {
        scanTitle: labels.scan,
        scanHint: labels.hint,
        scanCameraError: labels.error,
        close: labels.close,
      },
      onDetected: function (code) {
        lookup(code);
      },
      onUnsupported: function () {
        flash(labels.brand, labels.error);
      },
    });
  }

  root.querySelectorAll("[data-open-product-barcode-scan]").forEach(function (btn) {
    btn.addEventListener("click", openScanner);
  });
})();
