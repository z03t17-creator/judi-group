(function () {
  "use strict";

  var root = document.querySelector("[data-reject-form]");
  if (!root) return;

  var catalog = Array.isArray(window.JudiRejectCatalog)
    ? window.JudiRejectCatalog
    : [];
  var labels = window.JudiRejectLabels || {};
  var cart = [];
  var sheetProductId = null;
  var UNIT_ORDER = ["carton", "packet", "piece"];

  var catalogEl = root.querySelector("[data-reject-catalog]");
  var filterEl = root.querySelector("[data-reject-filter]");
  var cartEl = root.querySelector("[data-reject-cart]");
  var emptyEl = root.querySelector("[data-reject-empty]");
  var inputsEl = root.querySelector("[data-reject-inputs]");
  var submitBtn = root.querySelector("[data-reject-submit]");
  var form = root.querySelector("#reject-form");
  var creditEls = root.querySelectorAll(
    "[data-reject-credit], [data-reject-credit-sticky]"
  );
  var sheet = root.querySelector("[data-reject-sheet]");
  var sheetName = root.querySelector("[data-reject-sheet-name]");
  var sheetUnits = root.querySelector("[data-reject-sheet-units]");
  var sheetSave = root.querySelector("[data-reject-sheet-save]");
  var sheetCancel = root.querySelector("[data-reject-sheet-cancel]");

  function money(n) {
    return Math.round(Number(n) || 0).toLocaleString("en-US");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function preferredUnit(product) {
    if (!product || !product.units || !product.units.length) return null;
    var carton = product.units.find(function (u) {
      return u.unit === "carton" && maxAvailable(u) > 0;
    });
    if (carton) return carton;
    return (
      product.units.find(function (u) {
        return maxAvailable(u) > 0;
      }) || product.units[0]
    );
  }

  function pieceUnit(product) {
    if (!product || !product.units) return null;
    return (
      product.units.find(function (u) {
        return u.unit === "piece";
      }) || null
    );
  }

  function sortedUnits(product) {
    if (!product || !product.units) return [];
    return product.units.slice().sort(function (a, b) {
      var ia = UNIT_ORDER.indexOf(a.unit);
      var ib = UNIT_ORDER.indexOf(b.unit);
      if (ia < 0) ia = 99;
      if (ib < 0) ib = 99;
      return ia - ib;
    });
  }

  function findProduct(id) {
    return catalog.find(function (p) {
      return String(p.id) === String(id);
    });
  }

  function normalizeBarcode(value) {
    return String(value || "").trim();
  }

  function findProductByBarcode(code) {
    var needle = normalizeBarcode(code);
    if (!needle) return null;
    return (
      catalog.find(function (p) {
        return normalizeBarcode(p.barcode) === needle;
      }) || null
    );
  }

  function scanUnit(product) {
    var piece = pieceUnit(product);
    if (piece && maxAvailable(piece) - cartQtyForUnit(piece.id) > 0) {
      return piece;
    }
    return preferredUnit(product);
  }

  function flashScanMessage(message) {
    if (!message) return;
    var host = document.querySelector("[data-notif-toast-host]");
    if (!host) {
      window.alert(message);
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
    el.querySelector(".notif-toast__title").textContent =
      labels.brandShort || "Judy's Shelter";
    el.querySelector(".notif-toast__text").textContent = message;
    host.appendChild(el);
    window.setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 2800);
  }

  function focusProductSearch() {
    if (!filterEl) return;
    try {
      filterEl.focus({ preventScroll: true });
    } catch (e) {
      filterEl.focus();
    }
    if (typeof filterEl.select === "function") {
      try {
        filterEl.select();
      } catch (err) {}
    }
  }

  function tryScanBarcode(raw) {
    var code = normalizeBarcode(raw);
    if (!code) return false;

    var product = findProductByBarcode(code);
    if (!product) {
      flashScanMessage(
        labels.barcodeNotFound || "No product with this barcode."
      );
      return false;
    }

    var unit = scanUnit(product);
    if (!unit || maxAvailable(unit) - cartQtyForUnit(unit.id) < 1) {
      flashScanMessage(
        labels.barcodeNoStock || "No returnable stock for this product."
      );
      return false;
    }

    addLine(product.id, unit.id, 1);
    if (filterEl) {
      filterEl.value = "";
      renderCatalog("");
    }
    focusProductSearch();
    return true;
  }

  function openCameraScanner() {
    if (!window.JudiBarcodeScanner || typeof window.JudiBarcodeScanner.open !== "function") {
      flashScanMessage(labels.barcodeScanError || "Camera could not start.");
      return;
    }
    window.JudiBarcodeScanner.open({
      labels: {
        scanTitle: labels.barcodeScan || "Scan barcode",
        scanHint: labels.barcodeScanHint || "Place the code inside the frame",
        scanCameraError: labels.barcodeScanError || "Camera could not start.",
        close: labels.close || "Close",
      },
      onDetected: function (code) {
        tryScanBarcode(code);
      },
      onUnsupported: function () {
        flashScanMessage(labels.barcodeScanError || "Camera could not start.");
      },
    });
  }

  function findUnit(product, unitId) {
    return ((product && product.units) || []).find(function (u) {
      return String(u.id) === String(unitId);
    });
  }

  function cartKey(productId, unitId) {
    return String(productId) + ":" + String(unitId);
  }

  function cartQtyForUnit(unitId) {
    return cart.reduce(function (sum, line) {
      return String(line.unitId) === String(unitId)
        ? sum + line.quantity
        : sum;
    }, 0);
  }

  function maxAvailable(unit) {
    return Math.max(0, Math.round(Number(unit && unit.available) || 0));
  }

  function addLine(productId, unitId, qty) {
    var product = findProduct(productId);
    var unit = findUnit(product, unitId) || preferredUnit(product);
    if (!product || !unit) return;

    var max = maxAvailable(unit);
    if (max < 1) return;

    var key = cartKey(product.id, unit.id);
    var existing = cart.find(function (line) {
      return line.key === key;
    });
    var amount = Math.max(0, Math.round(Number(qty) || 0));
    if (amount < 1) return;

    var used = existing ? existing.quantity : 0;
    var room = max - used;
    if (room < 1) return;
    amount = Math.min(amount, room);

    if (existing) {
      existing.quantity += amount;
    } else {
      cart.push({
        key: key,
        productId: product.id,
        unitId: unit.id,
        productUnitId: unit.id,
        name: product.name,
        price: Number(unit.price) || 0,
        quantity: amount,
        unitLabel: unit.label,
        available: max,
      });
    }
    render();
  }

  function setQty(key, qty) {
    var line = cart.find(function (item) {
      return item.key === key;
    });
    if (!line) return;
    var max = Math.max(0, Number(line.available) || 0);
    line.quantity = Math.max(0, Math.min(max, Math.round(Number(qty) || 0)));
    if (line.quantity <= 0) {
      cart = cart.filter(function (item) {
        return item.key !== key;
      });
    }
    render();
  }

  function removeLine(key) {
    cart = cart.filter(function (item) {
      return item.key !== key;
    });
    render();
  }

  function creditTotal() {
    return cart.reduce(function (sum, line) {
      return sum + line.price * line.quantity;
    }, 0);
  }

  function stepperHtml(unitId, qty, max) {
    return (
      '<div class="qty-stepper line-sheet__stepper">' +
      '<button type="button" data-sheet-qty-delta="-1" data-sheet-unit-id="' +
      escapeHtml(String(unitId)) +
      '">−</button>' +
      '<input class="num" type="number" min="0" max="' +
      max +
      '" step="1" inputmode="numeric" dir="ltr" value="' +
      qty +
      '" data-sheet-qty data-sheet-unit-id="' +
      escapeHtml(String(unitId)) +
      '">' +
      '<button type="button" data-sheet-qty-delta="1" data-sheet-unit-id="' +
      escapeHtml(String(unitId)) +
      '">+</button>' +
      "</div>"
    );
  }

  function openSheet(productId) {
    var product = findProduct(productId);
    if (!product || !sheet) return;
    sheetProductId = product.id;
    if (sheetName) sheetName.textContent = product.name;

    var units = sortedUnits(product).filter(function (u) {
      return maxAvailable(u) - cartQtyForUnit(u.id) > 0 || maxAvailable(u) > 0;
    });

    if (sheetUnits) {
      sheetUnits.innerHTML = units
        .map(function (unit) {
          var max = maxAvailable(unit);
          var inCart = cartQtyForUnit(unit.id);
          var left = Math.max(0, max - inCart);
          var preferred = preferredUnit(product);
          var defaultQty =
            preferred &&
            String(preferred.id) === String(unit.id) &&
            left > 0
              ? 1
              : 0;
          return (
            '<div class="line-sheet__unit">' +
            '<div class="line-sheet__unit-meta">' +
            "<strong>" +
            escapeHtml(unit.label) +
            "</strong>" +
            '<span class="num" dir="ltr">' +
            money(unit.price) +
            " · " +
            escapeHtml(labels.available || "max") +
            " " +
            money(left) +
            "</span>" +
            "</div>" +
            stepperHtml(unit.id, Math.min(defaultQty, left), left) +
            "</div>"
          );
        })
        .join("");
    }

    if (typeof sheet.showModal === "function") {
      sheet.showModal();
    }
  }

  function closeSheet() {
    sheetProductId = null;
    if (sheet && sheet.open) {
      try {
        sheet.close();
      } catch (e) {}
    }
  }

  function readSheetQty(unitId) {
    if (!sheetUnits) return 0;
    var input = sheetUnits.querySelector(
      '[data-sheet-qty][data-sheet-unit-id="' + unitId + '"]'
    );
    return Math.max(0, Math.round(Number(input && input.value) || 0));
  }

  function bumpSheetQty(unitId, delta) {
    if (!sheetUnits) return;
    var input = sheetUnits.querySelector(
      '[data-sheet-qty][data-sheet-unit-id="' + unitId + '"]'
    );
    if (!input) return;
    var max = Math.max(0, Number(input.getAttribute("max")) || 0);
    var next = Math.max(
      0,
      Math.min(max, Math.round(Number(input.value) || 0) + delta)
    );
    input.value = String(next);
  }

  function saveSheet() {
    var product = findProduct(sheetProductId);
    if (!product) return;
    var any = false;
    sortedUnits(product).forEach(function (unit) {
      var qty = readSheetQty(unit.id);
      if (qty <= 0) return;
      any = true;
      addLine(product.id, unit.id, qty);
    });
    if (!any) {
      window.alert(labels.needQty || "Enter a quantity.");
      return;
    }
    closeSheet();
  }

  function renderCatalog(needle) {
    if (!catalogEl) return;
    var q = (needle || "").trim().toLowerCase();
    var rows = catalog.filter(function (product) {
      var hasAvail = (product.units || []).some(function (u) {
        return maxAvailable(u) > 0;
      });
      if (!hasAvail) return false;
      if (!q) return true;
      var hay = [product.name, product.sku, product.barcode || ""]
        .join(" ")
        .toLowerCase();
      return hay.indexOf(q) !== -1;
    });

    if (!rows.length) {
      catalogEl.innerHTML =
        '<p class="empty">' +
        escapeHtml(labels.noProducts || "—") +
        "</p>";
      return;
    }

    catalogEl.innerHTML = rows
      .slice(0, 60)
      .map(function (product) {
        var unit = preferredUnit(product);
        var piece = pieceUnit(product);
        var max = unit ? maxAvailable(unit) : 0;
        var left = unit ? Math.max(0, max - cartQtyForUnit(unit.id)) : 0;
        var priceLine = unit
          ? escapeHtml(unit.label) +
            ": " +
            money(unit.price) +
            " · " +
            escapeHtml(labels.available || "max") +
            " " +
            money(max)
          : "—";
        var pieceLine =
          piece && unit && piece.id !== unit.id
            ? (labels.piecePrice || "Piece") + ": " + money(piece.price)
            : "";
        return (
          '<button type="button" class="sell-product sell-product--calm"' +
          (left < 1 &&
          !(product.units || []).some(function (u) {
            return maxAvailable(u) - cartQtyForUnit(u.id) > 0;
          })
            ? " disabled"
            : "") +
          ' data-open-product="' +
          product.id +
          '" aria-label="' +
          escapeHtml((labels.addToReturn || "Add") + ": " + product.name) +
          '">' +
          (product.image
            ? '<img class="sell-product__img" src="' +
              escapeHtml(product.image) +
              '" alt="" loading="lazy">'
            : '<span class="sell-product__img"></span>') +
          '<span class="sell-product__body">' +
          '<strong class="sell-product__name">' +
          escapeHtml(product.name) +
          "</strong>" +
          (product.sku
            ? '<span class="sell-product__sku num" dir="ltr">' +
              escapeHtml(product.sku) +
              "</span>"
            : "") +
          '<span class="sell-product__meta">' +
          '<span class="sell-product__price num" dir="ltr">' +
          priceLine +
          "</span>" +
          (pieceLine
            ? '<span class="sell-product__piece num" dir="ltr">' +
              escapeHtml(pieceLine) +
              "</span>"
            : "") +
          "</span></span>" +
          '<span class="sell-product__chevron" aria-hidden="true"></span></button>'
        );
      })
      .join("");
  }

  function render() {
    var total = creditTotal();
    creditEls.forEach(function (el) {
      el.textContent = money(total);
    });
    if (submitBtn) submitBtn.disabled = cart.length === 0;
    if (emptyEl) emptyEl.hidden = cart.length > 0;

    if (cartEl) {
      cartEl.innerHTML = cart
        .map(function (line) {
          return (
            '<li class="sell-cart__item sell-cart__item--calm" data-key="' +
            escapeHtml(line.key) +
            '">' +
            '<div class="sell-cart__row">' +
            '<strong class="sell-cart__name">' +
            escapeHtml(line.name) +
            ' <em class="sell-cart__unit-tag">' +
            escapeHtml(line.unitLabel || "") +
            "</em></strong>" +
            '<button type="button" class="btn btn--ghost btn--sm" data-remove>' +
            escapeHtml(labels.remove || "×") +
            "</button></div>" +
            '<div class="sell-cart__row sell-cart__row--controls">' +
            '<div class="qty-stepper">' +
            '<button type="button" data-qty-delta="-1">−</button>' +
            '<input class="num" type="number" min="1" max="' +
            line.available +
            '" step="1" inputmode="numeric" dir="ltr" value="' +
            line.quantity +
            '" data-qty>' +
            '<button type="button" data-qty-delta="1">+</button></div>' +
            '<span class="num" dir="ltr">' +
            money(line.price * line.quantity) +
            " · ≤" +
            money(line.available) +
            "</span></div></li>"
          );
        })
        .join("");
    }

    if (inputsEl) {
      inputsEl.innerHTML = cart
        .map(function (line, index) {
          return (
            '<input type="hidden" name="lines[' +
            index +
            '][product_unit_id]" value="' +
            line.productUnitId +
            '">' +
            '<input type="hidden" name="lines[' +
            index +
            '][quantity]" value="' +
            line.quantity +
            '">'
          );
        })
        .join("");
    }

    renderCatalog(filterEl ? filterEl.value : "");
  }

  function trySubmit() {
    if (cart.length === 0) return;
    var ok = window.confirm(
      labels.confirmSubmit || "Confirm this return?"
    );
    if (!ok) return;
    if (submitBtn) submitBtn.disabled = true;
    if (form) {
      form.setAttribute("data-confirmed", "1");
      form.submit();
    }
  }

  if (catalogEl) {
    catalogEl.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-open-product]");
      if (!btn || btn.disabled) return;
      openSheet(btn.getAttribute("data-open-product"));
    });
  }

  if (cartEl) {
    cartEl.addEventListener("click", function (event) {
      var item = event.target.closest(".sell-cart__item");
      if (!item) return;
      var key = item.getAttribute("data-key");
      if (event.target.closest("[data-remove]")) {
        removeLine(key);
        return;
      }
      var deltaBtn = event.target.closest("[data-qty-delta]");
      if (deltaBtn) {
        var line = cart.find(function (row) {
          return row.key === key;
        });
        if (!line) return;
        setQty(
          key,
          line.quantity + (Number(deltaBtn.getAttribute("data-qty-delta")) || 0)
        );
      }
    });
    cartEl.addEventListener("change", function (event) {
      var item = event.target.closest(".sell-cart__item");
      if (!item || !event.target.matches("[data-qty]")) return;
      setQty(item.getAttribute("data-key"), event.target.value);
    });
  }

  if (sheet) {
    sheet.addEventListener("click", function (event) {
      var deltaBtn = event.target.closest("[data-sheet-qty-delta]");
      if (!deltaBtn) return;
      bumpSheetQty(
        deltaBtn.getAttribute("data-sheet-unit-id"),
        Number(deltaBtn.getAttribute("data-sheet-qty-delta")) || 0
      );
    });
  }

  if (sheetSave) sheetSave.addEventListener("click", saveSheet);
  if (sheetCancel) sheetCancel.addEventListener("click", closeSheet);

  if (submitBtn) {
    submitBtn.addEventListener("click", function (event) {
      event.preventDefault();
      trySubmit();
    });
  }

  if (form) {
    form.addEventListener("submit", function (event) {
      if (cart.length === 0) {
        event.preventDefault();
        return;
      }
      if (!form.getAttribute("data-confirmed")) {
        event.preventDefault();
        trySubmit();
      }
    });
  }

  if (filterEl) {
    filterEl.addEventListener("input", function () {
      renderCatalog(filterEl.value);
    });
    filterEl.addEventListener("keydown", function (event) {
      var code = normalizeBarcode(filterEl.value);
      if (!code) return;
      if (event.key === "Enter") {
        event.preventDefault();
        tryScanBarcode(code);
        return;
      }
      if (event.key === "Tab" && findProductByBarcode(code)) {
        event.preventDefault();
        tryScanBarcode(code);
      }
    });
  }

  var scanBtn = root.querySelector("[data-open-barcode-scan]");
  if (scanBtn) {
    scanBtn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      openCameraScanner();
    });
  }

  renderCatalog("");
  render();
  window.setTimeout(focusProductSearch, 50);
})();
