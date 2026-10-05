(function () {
  "use strict";

  var root = document.querySelector("[data-invoice-sell]");
  if (!root) return;

  var catalog = Array.isArray(window.JudiInvoiceCatalog)
    ? window.JudiInvoiceCatalog
    : [];
  var categories = Array.isArray(window.JudiInvoiceCategories)
    ? window.JudiInvoiceCategories
    : [];
  var labels = window.JudiInvoiceLabels || {};
  var maxDiscount = Number(window.JudiInvoiceMaxDiscount) || 0;
  var maxGift = Number(window.JudiInvoiceMaxGift) || 0;
  var cart = [];
  var oldLines = Array.isArray(window.JudiInvoiceOldLines)
    ? window.JudiInvoiceOldLines
    : [];
  var selectedCategoryId = "";
  var selectedSubcategoryId = "";
  var wizardStep = 1;
  var editingKey = null;
  var sheetMode = "add";
  var sheetProductId = null;
  var UNIT_ORDER = ["carton", "packet", "piece"];
  var TILE_COLORS = [
    "#0f766e",
    "#0369a1",
    "#7c3aed",
    "#c2410c",
    "#be185d",
    "#15803d",
    "#b45309",
    "#1d4ed8",
  ];

  var productList = root.querySelector("[data-product-list]");
  var productFilter = root.querySelector("[data-product-filter]");
  var categoryRail = root.querySelector("[data-category-rail]");
  var subcategoryRail = root.querySelector("[data-subcategory-rail]");
  var subBlock = root.querySelector("[data-sub-block]");
  var clearFiltersBtn = root.querySelector("[data-clear-filters]");
  var storeFilter = root.querySelector("[data-store-filter]");
  var storeOptions = Array.prototype.slice.call(
    root.querySelectorAll("[data-store-option]")
  );
  var storeIdInput = root.querySelector("[data-store-id-input]");
  var lockedStore = root.querySelector("[data-locked-store]");
  var lockedName = root.querySelector("[data-locked-name]");
  var lockedDebt = root.querySelector("[data-locked-debt]");
  var lockedImg = root.querySelector("[data-locked-img]");
  var changeStoreBtn = root.querySelector("[data-change-store]");
  var cartEl = root.querySelector("[data-cart]");
  var cartEmpty = root.querySelector("[data-cart-empty]");
  var linesInputs = root.querySelector("[data-lines-inputs]");
  var subtotalEls = root.querySelectorAll("[data-cart-subtotal]");
  var totalEls = root.querySelectorAll("[data-cart-total-sticky]");
  var submitBtn = root.querySelector("[data-submit-sale]");
  var discountInput = root.querySelector("[data-discount]");
  var form = root.querySelector("#invoice-sell-form");
  var storePanel = root.querySelector('[data-panel="store"]');
  var catalogPanel = root.querySelector('[data-panel="catalog"]');
  var cartCountEl = root.querySelector("[data-cart-count]");
  var storeNeededEl = root.querySelector("[data-store-needed]");
  var wizardTitle = root.querySelector("[data-wizard-title]");
  var wizardBack = root.querySelector("[data-wizard-back]");
  var exitSell = root.querySelector("[data-exit-sell]");
  var sellContext = root.querySelector("[data-sell-context]");
  var stickyCta = root.querySelector("[data-sell-cta]");
  var lineSheet = root.querySelector("[data-line-sheet]");
  var lineSheetTitle = root.querySelector("[data-line-sheet-title]");
  var lineSheetName = root.querySelector("[data-line-sheet-name]");
  var lineSheetPieceHint = root.querySelector("[data-line-sheet-piece-hint]");
  var lineSheetUnits = root.querySelector("[data-line-sheet-units]");
  var lineSheetExtras = root.querySelector("[data-line-sheet-extras]");
  var lineSheetGift = root.querySelector("[data-line-sheet-gift]");
  var lineSheetDiscount = root.querySelector("[data-line-sheet-discount]");
  var lineSheetSave = root.querySelector("[data-line-sheet-save]");
  var lineSheetCancel = root.querySelector("[data-line-sheet-cancel]");

  function money(n) {
    return Math.round(Number(n) || 0).toLocaleString("en-US");
  }

  function preferredUnit(product) {
    if (!product || !product.units || !product.units.length) return null;
    var carton = product.units.find(function (u) {
      return u.unit === "carton";
    });
    return carton || product.units[0];
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

  function findProduct(productId) {
    return catalog.find(function (p) {
      return String(p.id) === String(productId);
    });
  }

  function findUnit(product, unitId) {
    return (product.units || []).find(function (u) {
      return String(u.id) === String(unitId);
    });
  }

  function cartKey(productId, unitId) {
    return String(productId) + ":" + String(unitId);
  }

  function unitLabel(unit) {
    if (!unit) return "";
    return unit.label || unit.unit || "";
  }

  function addLine(productId, unitId, qty, giftQty, discountPercent) {
    var product = findProduct(productId);
    var unit = findUnit(product, unitId) || preferredUnit(product);
    if (!product || !unit) return;

    var key = cartKey(product.id, unit.id);
    var existing = cart.find(function (line) {
      return line.key === key;
    });
    var amount = Math.max(0, Math.round(Number(qty) || 0));
    var gift = Math.max(0, Math.round(Number(giftQty) || 0));
    var disc = Math.max(
      0,
      Math.min(maxDiscount, Number(discountPercent) || 0)
    );

    if (amount <= 0 && gift <= 0) return;

    if (existing) {
      existing.quantity += amount;
      existing.giftQuantity += gift;
      if (discountPercent != null && discountPercent !== "") {
        existing.discountPercent = disc;
      }
    } else {
      cart.push({
        key: key,
        productId: product.id,
        unitId: unit.id,
        productUnitId: unit.id,
        unitCode: unit.unit,
        unitLabel: unitLabel(unit),
        name: product.name,
        price: Number(unit.price) || 0,
        quantity: amount || (gift ? 0 : 1),
        giftQuantity: gift,
        discountPercent: disc,
      });
    }
    renderCart();
  }

  function setQty(key, qty) {
    var line = cart.find(function (item) {
      return item.key === key;
    });
    if (!line) return;
    line.quantity = Math.max(0, Math.round(Number(qty) || 0));
    if (line.quantity <= 0 && line.giftQuantity <= 0) {
      cart = cart.filter(function (item) {
        return item.key !== key;
      });
    }
    renderCart();
  }

  function setGift(key, qty) {
    var line = cart.find(function (item) {
      return item.key === key;
    });
    if (!line) return;
    line.giftQuantity = Math.max(0, Math.round(Number(qty) || 0));
    if (line.quantity <= 0 && line.giftQuantity <= 0) {
      cart = cart.filter(function (item) {
        return item.key !== key;
      });
    }
    renderCart();
  }

  function setLineDiscount(key, pct) {
    var line = cart.find(function (item) {
      return item.key === key;
    });
    if (!line) return;
    line.discountPercent = Math.max(
      0,
      Math.min(maxDiscount, Number(pct) || 0)
    );
    renderCart();
  }

  function changeUnit(key, unitId) {
    var line = cart.find(function (item) {
      return item.key === key;
    });
    if (!line) return;
    var product = findProduct(line.productId);
    var unit = findUnit(product, unitId);
    if (!unit) return;
    var nextKey = cartKey(line.productId, unit.id);
    var other = cart.find(function (item) {
      return item.key === nextKey && item !== line;
    });
    if (other) {
      other.quantity += line.quantity;
      other.giftQuantity += line.giftQuantity;
      cart = cart.filter(function (item) {
        return item !== line;
      });
    } else {
      line.key = nextKey;
      line.unitId = unit.id;
      line.productUnitId = unit.id;
      line.unitCode = unit.unit;
      line.unitLabel = unitLabel(unit);
      line.price = Number(unit.price) || 0;
    }
    renderCart();
  }

  function removeLine(key) {
    cart = cart.filter(function (item) {
      return item.key !== key;
    });
    renderCart();
  }

  function lineNet(line) {
    var gross = line.price * line.quantity;
    var disc = gross * ((Number(line.discountPercent) || 0) / 100);
    return Math.max(0, gross - disc);
  }

  function cartSubtotal() {
    return cart.reduce(function (sum, line) {
      return sum + lineNet(line);
    }, 0);
  }

  function cartTotal() {
    var sub = cartSubtotal();
    var pct = discountInput ? Number(discountInput.value) || 0 : 0;
    return Math.max(0, sub - sub * (pct / 100));
  }

  function hasStore() {
    return !!(storeIdInput && String(storeIdInput.value).trim());
  }

  function showNeedStore() {
    if (storeNeededEl) storeNeededEl.hidden = false;
    if (storePanel) storePanel.classList.add("is-need-store");
    goToStep(1);
  }

  function hideNeedStore() {
    if (storeNeededEl) storeNeededEl.hidden = true;
    if (storePanel) storePanel.classList.remove("is-need-store");
  }

  function stepperHtml(unitId, qty) {
    return (
      '<div class="qty-stepper line-sheet__stepper">' +
      '<button type="button" data-sheet-qty-delta="-1" data-sheet-unit-id="' +
      escapeAttr(String(unitId)) +
      '" aria-label="-">−</button>' +
      '<input class="num" type="number" min="0" step="1" inputmode="numeric" dir="ltr" value="' +
      qty +
      '" data-sheet-qty data-sheet-unit-id="' +
      escapeAttr(String(unitId)) +
      '">' +
      '<button type="button" data-sheet-qty-delta="1" data-sheet-unit-id="' +
      escapeAttr(String(unitId)) +
      '" aria-label="+">+</button>' +
      "</div>"
    );
  }

  function openAddSheet(productId) {
    var product = findProduct(productId);
    if (!product || !lineSheet) return;

    sheetMode = "add";
    sheetProductId = product.id;
    editingKey = null;

    if (lineSheetTitle) {
      lineSheetTitle.textContent = labels.addToOrder || "Add to order";
    }
    if (lineSheetName) lineSheetName.textContent = product.name;
    if (lineSheetSave) {
      lineSheetSave.textContent = labels.addToOrder || "Add to order";
    }

    var piece = pieceUnit(product);
    if (lineSheetPieceHint) {
      if (piece) {
        lineSheetPieceHint.hidden = false;
        lineSheetPieceHint.textContent =
          (labels.piecePrice || "Piece price") + ": " + money(piece.price);
      } else {
        lineSheetPieceHint.hidden = true;
        lineSheetPieceHint.textContent = "";
      }
    }

    var units = sortedUnits(product);
    if (lineSheetUnits) {
      lineSheetUnits.hidden = false;
      lineSheetUnits.innerHTML = units
        .map(function (unit) {
          var preferred = preferredUnit(product);
          var defaultQty =
            preferred && String(preferred.id) === String(unit.id) ? 1 : 0;
          return (
            '<div class="line-sheet__unit" data-sheet-unit-row="' +
            escapeAttr(String(unit.id)) +
            '">' +
            '<div class="line-sheet__unit-meta">' +
            "<strong>" +
            escapeHtml(unitLabel(unit)) +
            "</strong>" +
            '<span class="num" dir="ltr">' +
            money(unit.price) +
            "</span>" +
            "</div>" +
            stepperHtml(unit.id, defaultQty) +
            "</div>"
          );
        })
        .join("");
    }
    if (lineSheetExtras) lineSheetExtras.hidden = true;
    if (lineSheetGift) lineSheetGift.value = "0";
    if (lineSheetDiscount) lineSheetDiscount.value = "0";

    if (typeof lineSheet.showModal === "function") {
      lineSheet.showModal();
    }
  }

  function openLineSheet(key) {
    var line = cart.find(function (item) {
      return item.key === key;
    });
    if (!line || !lineSheet) return;

    sheetMode = "edit";
    sheetProductId = line.productId;
    editingKey = key;

    if (lineSheetTitle) {
      lineSheetTitle.textContent = labels.editLineTitle || "Edit line";
    }
    if (lineSheetName) {
      lineSheetName.textContent =
        line.name + " · " + (line.unitLabel || "");
    }
    if (lineSheetSave) {
      lineSheetSave.textContent = labels.editLine || "Save";
    }

    var product = findProduct(line.productId);
    var piece = pieceUnit(product);
    if (lineSheetPieceHint) {
      if (piece && line.unitCode !== "piece") {
        lineSheetPieceHint.hidden = false;
        lineSheetPieceHint.textContent =
          (labels.piecePrice || "Piece price") + ": " + money(piece.price);
      } else {
        lineSheetPieceHint.hidden = true;
      }
    }

    if (lineSheetUnits) {
      lineSheetUnits.hidden = true;
      lineSheetUnits.innerHTML = "";
    }
    if (lineSheetExtras) lineSheetExtras.hidden = false;
    if (lineSheetGift) lineSheetGift.value = String(line.giftQuantity || 0);
    if (lineSheetDiscount) {
      lineSheetDiscount.value = String(line.discountPercent || 0);
    }

    if (typeof lineSheet.showModal === "function") {
      lineSheet.showModal();
    }
  }

  function closeLineSheet() {
    editingKey = null;
    sheetProductId = null;
    sheetMode = "add";
    if (lineSheetExtras) lineSheetExtras.hidden = true;
    if (lineSheet && lineSheet.open) {
      try {
        lineSheet.close();
      } catch (e) {}
    }
  }

  function readSheetQty(unitId) {
    if (!lineSheetUnits) return 0;
    var input = lineSheetUnits.querySelector(
      '[data-sheet-qty][data-sheet-unit-id="' + unitId + '"]'
    );
    return Math.max(0, Math.round(Number(input && input.value) || 0));
  }

  function bumpSheetQty(unitId, delta) {
    if (!lineSheetUnits) return;
    var input = lineSheetUnits.querySelector(
      '[data-sheet-qty][data-sheet-unit-id="' + unitId + '"]'
    );
    if (!input) return;
    input.value = String(
      Math.max(0, Math.round(Number(input.value) || 0) + delta)
    );
  }

  function saveLineSheet() {
    if (sheetMode === "edit") {
      if (!editingKey) return;
      if (lineSheetGift) setGift(editingKey, lineSheetGift.value);
      if (lineSheetDiscount) {
        setLineDiscount(editingKey, lineSheetDiscount.value);
      }
      closeLineSheet();
      return;
    }

    var product = findProduct(sheetProductId);
    if (!product) return;

    var units = sortedUnits(product);
    var any = false;
    units.forEach(function (unit) {
      var qty = readSheetQty(unit.id);
      if (qty <= 0) return;
      any = true;
      addLine(product.id, unit.id, qty, 0, 0);
    });

    if (!any) {
      window.alert(labels.needQty || "Enter a quantity.");
      return;
    }

    closeLineSheet();
  }

  function renderCart() {
    var sub = cartSubtotal();
    var total = cartTotal();
    subtotalEls.forEach(function (el) {
      el.textContent = money(sub);
    });
    totalEls.forEach(function (el) {
      el.textContent = money(total);
    });
    if (submitBtn) submitBtn.disabled = cart.length === 0;
    if (cartCountEl) {
      cartCountEl.textContent =
        (labels.lines || "Lines") + ": " + cart.length;
    }
    if (cartEmpty) cartEmpty.hidden = cart.length > 0;

    if (cartEl) {
      cartEl.innerHTML = cart
        .map(function (line) {
          var product = findProduct(line.productId);
          var options = (product && product.units ? product.units : [])
            .map(function (u) {
              return (
                '<option value="' +
                u.id +
                '"' +
                (String(u.id) === String(line.unitId) ? " selected" : "") +
                ">" +
                escapeHtml(unitLabel(u)) +
                " · " +
                money(u.price) +
                "</option>"
              );
            })
            .join("");
          var badges = [];
          if (line.giftQuantity > 0) {
            badges.push(
              '<span class="sell-cart__badge">' +
                '<i class="fi fi-sr-gift" aria-hidden="true"></i> ' +
                escapeHtml(labels.gift || "Gift") +
                " " +
                line.giftQuantity +
                "</span>"
            );
          }
          if (line.discountPercent > 0) {
            badges.push(
              '<span class="sell-cart__badge sell-cart__badge--disc">' +
                '<i class="fi fi-sr-badge-percent" aria-hidden="true"></i> ' +
                escapeHtml(labels.discount || "Disc") +
                " " +
                line.discountPercent +
                "%</span>"
            );
          }
          return (
            '<li class="sell-cart__item sell-cart__item--calm" data-key="' +
            escapeAttr(line.key) +
            '">' +
            '<div class="sell-cart__row">' +
            '<span class="sell-cart__name">' +
            escapeHtml(line.name) +
            ' <em class="sell-cart__unit-tag">' +
            escapeHtml(line.unitLabel || "") +
            "</em></span>" +
            '<strong class="sell-cart__line-total num" dir="ltr">' +
            money(lineNet(line)) +
            "</strong>" +
            '<button type="button" class="sell-cart__remove" data-remove aria-label="' +
            escapeAttr(labels.remove || "×") +
            '">×</button>' +
            "</div>" +
            '<div class="sell-cart__row sell-cart__row--controls">' +
            '<select class="sell-cart__unit" data-unit aria-label="' +
            escapeAttr(labels.chooseUnits || "Unit") +
            '">' +
            options +
            "</select>" +
            '<div class="qty-stepper">' +
            '<button type="button" data-qty-delta="-1" aria-label="-">−</button>' +
            '<input class="num" type="number" min="0" step="1" inputmode="numeric" dir="ltr" value="' +
            line.quantity +
            '" data-qty>' +
            '<button type="button" data-qty-delta="1" aria-label="+">+</button>' +
            "</div>" +
            '<button type="button" class="btn btn--ghost btn--sm sell-cart__more" data-line-edit>' +
            escapeHtml(labels.editLine || "Edit") +
            "</button>" +
            "</div>" +
            (badges.length
              ? '<div class="sell-cart__badges">' + badges.join("") + "</div>"
              : "") +
            "</li>"
          );
        })
        .join("");
    }

    if (linesInputs) {
      linesInputs.innerHTML = cart
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
            '">' +
            '<input type="hidden" name="lines[' +
            index +
            '][gift_quantity]" value="' +
            line.giftQuantity +
            '">' +
            '<input type="hidden" name="lines[' +
            index +
            '][discount_percent]" value="' +
            (line.discountPercent || 0) +
            '">'
          );
        })
        .join("");
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function productMatches(product, needle) {
    if (!needle) return true;
    var hay = [product.name, product.sku, product.barcode || ""]
      .concat(
        (product.units || []).map(function (u) {
          return u.barcode || "";
        })
      )
      .join(" ")
      .toLowerCase();
    return hay.indexOf(needle) !== -1;
  }

  function normalizeBarcode(value) {
    return String(value || "").trim();
  }

  function cartonUnit(product) {
    if (!product || !product.units) return null;
    return (
      product.units.find(function (u) {
        return u.unit === "carton";
      }) || null
    );
  }

  /** Match carton (product.barcode) or packet/piece unit barcodes. */
  function findScanMatch(code) {
    var needle = normalizeBarcode(code);
    if (!needle) return null;

    var i;
    var product;
    var unit;

    for (i = 0; i < catalog.length; i += 1) {
      product = catalog[i];
      if (normalizeBarcode(product.barcode) === needle) {
        unit = cartonUnit(product) || preferredUnit(product);
        if (unit) return { product: product, unit: unit };
      }
      unit = (product.units || []).find(function (u) {
        return normalizeBarcode(u.barcode) === needle;
      });
      if (unit) return { product: product, unit: unit };
    }
    return null;
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
    if (!productFilter || wizardStep !== 2) return;
    try {
      productFilter.focus({ preventScroll: true });
    } catch (e) {
      productFilter.focus();
    }
    if (typeof productFilter.select === "function") {
      try {
        productFilter.select();
      } catch (err) {}
    }
  }

  function tryScanBarcode(raw) {
    var code = normalizeBarcode(raw);
    if (!code) return false;

    var match = findScanMatch(code);
    if (!match) {
      flashScanMessage(
        labels.barcodeNotFound || "No product with this barcode."
      );
      return false;
    }

    addLine(match.product.id, match.unit.id, 1, 0, 0);
    if (productFilter) {
      productFilter.value = "";
      renderCatalog();
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

  function currentSubs() {
    var cat = categories.find(function (c) {
      return String(c.id) === String(selectedCategoryId);
    });
    return cat ? cat.subcategories || [] : [];
  }

  function countProducts(catId, subId) {
    return catalog.filter(function (p) {
      if (catId && String(p.category_id) !== String(catId)) return false;
      if (subId && String(p.subcategory_id) !== String(subId)) return false;
      return true;
    }).length;
  }

  function renderCategoryRail() {
    if (!categoryRail) return;
    var html =
      '<button type="button" class="sell-pill' +
      (selectedCategoryId ? "" : " is-active") +
      '" data-category-id="">' +
      escapeHtml(labels.allCategories || labels.all || "All") +
      "</button>";
    categories.forEach(function (cat, i) {
      var color = TILE_COLORS[i % TILE_COLORS.length];
      var active = String(selectedCategoryId) === String(cat.id);
      html +=
        '<button type="button" class="sell-pill' +
        (active ? " is-active" : "") +
        '" data-category-id="' +
        escapeAttr(String(cat.id)) +
        '" style="--pill:' +
        color +
        '">' +
        '<span class="sell-pill__label">' +
        escapeHtml(cat.name) +
        "</span>" +
        '<span class="sell-pill__count num" dir="ltr">' +
        countProducts(cat.id) +
        "</span>" +
        "</button>";
    });
    categoryRail.innerHTML = html;
  }

  function renderSubcategoryRail() {
    if (!subcategoryRail) return;
    var subs = currentSubs();
    if (!selectedCategoryId || !subs.length) {
      subcategoryRail.innerHTML = "";
      if (subBlock) subBlock.hidden = true;
      return;
    }
    if (subBlock) subBlock.hidden = false;
    var html =
      '<button type="button" class="sell-pill sell-pill--sub' +
      (selectedSubcategoryId ? "" : " is-active") +
      '" data-subcategory-id="">' +
      escapeHtml(labels.allInCategory || labels.all || "All") +
      "</button>";
    subs.forEach(function (sub, i) {
      var color = TILE_COLORS[i % TILE_COLORS.length];
      var active = String(selectedSubcategoryId) === String(sub.id);
      html +=
        '<button type="button" class="sell-pill sell-pill--sub' +
        (active ? " is-active" : "") +
        '" data-subcategory-id="' +
        escapeAttr(String(sub.id)) +
        '" style="--pill:' +
        color +
        '">' +
        '<span class="sell-pill__label">' +
        escapeHtml(sub.name) +
        "</span>" +
        "</button>";
    });
    subcategoryRail.innerHTML = html;
  }

  function refreshFilters() {
    renderCategoryRail();
    renderSubcategoryRail();
    if (clearFiltersBtn) {
      clearFiltersBtn.hidden = !(selectedCategoryId || selectedSubcategoryId);
    }
    renderCatalog();
  }

  function pickCategoryFilter(id) {
    selectedCategoryId = id || "";
    selectedSubcategoryId = "";
    refreshFilters();
  }

  function pickSubcategoryFilter(id) {
    selectedSubcategoryId = id || "";
    refreshFilters();
  }

  function clearFilters() {
    selectedCategoryId = "";
    selectedSubcategoryId = "";
    refreshFilters();
  }

  function renderCatalog() {
    if (!productList) return;
    var needle = (productFilter ? productFilter.value : "")
      .trim()
      .toLowerCase();
    var matches = catalog.filter(function (p) {
      if (
        selectedCategoryId &&
        String(p.category_id) !== String(selectedCategoryId)
      ) {
        return false;
      }
      if (
        selectedSubcategoryId &&
        String(p.subcategory_id) !== String(selectedSubcategoryId)
      ) {
        return false;
      }
      return productMatches(p, needle);
    });

    if (!matches.length) {
      productList.innerHTML =
        '<p class="empty">' +
        escapeHtml(labels.noProducts || "No products") +
        "</p>";
      return;
    }

    productList.innerHTML = matches
      .map(function (product) {
        var unit = preferredUnit(product);
        var piece = pieceUnit(product);
        var priceLine = unit
          ? (labels.cartonPrice || unitLabel(unit)) +
            ": " +
            money(unit.price)
          : "—";
        var pieceLine =
          piece && unit && piece.id !== unit.id
            ? (labels.piecePrice || "Piece") + ": " + money(piece.price)
            : "";
        return (
          '<button type="button" class="sell-product sell-product--calm" data-add-product="' +
          escapeAttr(String(product.id)) +
          '" aria-label="' +
          escapeAttr((labels.addToOrder || "Add") + ": " + product.name) +
          '">' +
          '<img class="sell-product__img" src="' +
          escapeAttr(product.image || "") +
          '" alt="" loading="lazy">' +
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
          escapeHtml(priceLine) +
          "</span>" +
          (pieceLine
            ? '<span class="sell-product__piece num" dir="ltr">' +
              escapeHtml(pieceLine) +
              "</span>"
            : "") +
          "</span>" +
          "</span>" +
          '<span class="sell-product__chevron" aria-hidden="true"></span>' +
          "</button>"
        );
      })
      .join("");
  }

  function filterStores() {
    var needle = (storeFilter ? storeFilter.value : "")
      .trim()
      .toLowerCase();
    storeOptions.forEach(function (el) {
      var hay = el.getAttribute("data-search") || "";
      el.hidden = needle !== "" && hay.indexOf(needle) === -1;
    });
  }

  function selectedStoreOption() {
    var id = storeIdInput ? storeIdInput.value : "";
    if (!id) return null;
    return (
      storeOptions.find(function (el) {
        return String(el.getAttribute("data-store-id")) === String(id);
      }) || null
    );
  }

  function updateWizardTitle() {
    if (!wizardTitle) return;
    wizardTitle.textContent =
      wizardStep === 1
        ? labels.pickStoreTitle || "Store"
        : labels.pickProductsTitle || "Products";
  }

  function goToStep(n) {
    wizardStep = n;
    root.setAttribute("data-step", String(n));
    if (storePanel) storePanel.hidden = n !== 1;
    if (catalogPanel) catalogPanel.hidden = n !== 2;
    if (stickyCta) stickyCta.hidden = n !== 2;
    if (sellContext) sellContext.hidden = n === 1;
    if (wizardBack) wizardBack.hidden = n === 1;
    if (exitSell) exitSell.hidden = n !== 1;
    updateWizardTitle();
    if (n === 2) {
      refreshFilters();
      window.setTimeout(focusProductSearch, 50);
    }
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      window.scrollTo(0, 0);
    }
  }

  function lockStore(opt) {
    if (!opt) return;
    var name = opt.getAttribute("data-store-name") || "";
    var debt = opt.getAttribute("data-store-debt") || "0";
    var image = opt.getAttribute("data-store-image") || "";
    var id = opt.getAttribute("data-store-id") || "";

    if (storeIdInput) storeIdInput.value = id;
    storeOptions.forEach(function (el) {
      el.classList.toggle("is-selected", el === opt);
    });

    if (lockedName) lockedName.textContent = name;
    if (lockedImg) lockedImg.src = image;
    if (lockedDebt) {
      var hasDebt = debt && debt !== "0";
      lockedDebt.hidden = !hasDebt;
      lockedDebt.innerHTML = hasDebt
        ? '<span class="sell-locked__debt-label">' +
          escapeHtml(labels.currentDebt || "Debt") +
          "</span><strong dir=\"ltr\">" +
          escapeHtml(debt) +
          "</strong>"
        : "";
    }
    if (lockedStore) lockedStore.hidden = false;
    if (storePanel) storePanel.classList.add("is-locked");
    hideNeedStore();
    goToStep(2);
  }

  function selectStore(opt) {
    if (!opt) return;
    var currentId = storeIdInput ? storeIdInput.value : "";
    var nextId = opt.getAttribute("data-store-id") || "";
    if (currentId && currentId !== nextId && cart.length > 0) {
      var ok = window.confirm(
        labels.confirmChangeStore || "Change store? Cart lines stay."
      );
      if (!ok) return;
    }
    lockStore(opt);
  }

  function formatPct(value) {
    var n = Number(value) || 0;
    var text = String(Math.round(n * 100) / 100);
    return text.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
  }

  function limitErrors() {
    var errors = [];
    var sold = 0;
    var gift = 0;
    var i;

    for (i = 0; i < cart.length; i += 1) {
      sold += Math.max(0, Number(cart[i].quantity) || 0);
      gift += Math.max(0, Number(cart[i].giftQuantity) || 0);
      var lineDisc = Number(cart[i].discountPercent) || 0;
      if (lineDisc > maxDiscount + 0.0001) {
        errors.push(
          (labels.lineDiscountOverLimit || "Line discount over limit (:max%).").replace(
            ":max",
            formatPct(maxDiscount)
          )
        );
        break;
      }
    }

    var invoiceDisc = discountInput ? Number(discountInput.value) || 0 : 0;
    if (invoiceDisc > maxDiscount + 0.0001) {
      errors.push(
        (labels.discountOverLimit || "Discount over limit (:max%).").replace(
          ":max",
          formatPct(maxDiscount)
        )
      );
    }

    if (gift > 0) {
      var allowed =
        sold > 0
          ? Math.round(sold * (maxGift / 100) * 100) / 100
          : maxGift >= 100
            ? gift
            : 0;
      if (gift > allowed + 0.0001) {
        errors.push(
          (labels.giftOverLimit || "Gift over limit (:max% of sold).").replace(
            ":max",
            formatPct(maxGift)
          )
        );
      }
    }

    return errors;
  }

  function trySubmitSale() {
    if (cart.length === 0) return;
    if (!hasStore()) {
      showNeedStore();
      return;
    }
    hideNeedStore();

    var errs = limitErrors();
    if (errs.length) {
      window.alert(errs.join("\n"));
      return;
    }

    var ok = window.confirm(
      labels.confirmSavePrint || "Save and print this order?"
    );
    if (!ok) return;
    if (submitBtn) submitBtn.disabled = true;
    try {
      sessionStorage.setItem("judiPrintAfterSave", "a4");
    } catch (e) {}
    if (form) form.submit();
  }

  if (productFilter) {
    productFilter.addEventListener("input", renderCatalog);
    productFilter.addEventListener("keydown", function (event) {
      var code = normalizeBarcode(productFilter.value);
      if (!code) return;
      if (event.key === "Enter") {
        event.preventDefault();
        tryScanBarcode(code);
        return;
      }
      // Some wedges send Tab after the code
      if (event.key === "Tab" && findScanMatch(code)) {
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

  if (storeFilter) storeFilter.addEventListener("input", filterStores);
  if (discountInput) discountInput.addEventListener("input", renderCart);

  if (submitBtn) {
    submitBtn.addEventListener("click", function (event) {
      event.preventDefault();
      trySubmitSale();
    });
  }

  if (form) {
    form.addEventListener("submit", function (event) {
      if (cart.length === 0 || !hasStore()) {
        event.preventDefault();
        if (!hasStore()) showNeedStore();
        return;
      }
      // Native submit (e.g. Enter): still require confirm once
      if (!form.getAttribute("data-confirmed")) {
        event.preventDefault();
        trySubmitSale();
      }
    });
  }

  // Mark confirmed just before programmatic submit
  var originalSubmit = form && form.submit ? form.submit.bind(form) : null;
  if (form && originalSubmit) {
    form.submit = function () {
      form.setAttribute("data-confirmed", "1");
      originalSubmit();
    };
  }

  storeOptions.forEach(function (el) {
    el.addEventListener("click", function () {
      selectStore(el);
    });
  });

  if (changeStoreBtn) {
    changeStoreBtn.addEventListener("click", function () {
      goToStep(1);
      if (storeFilter) storeFilter.focus();
    });
  }

  if (wizardBack) {
    wizardBack.addEventListener("click", function () {
      if (wizardStep === 2) goToStep(1);
    });
  }

  if (categoryRail) {
    categoryRail.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-category-id]");
      if (!btn) return;
      pickCategoryFilter(btn.getAttribute("data-category-id"));
    });
  }

  if (subcategoryRail) {
    subcategoryRail.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-subcategory-id]");
      if (!btn) return;
      pickSubcategoryFilter(btn.getAttribute("data-subcategory-id"));
    });
  }

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", clearFilters);
  }

  if (productList) {
    productList.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-add-product]");
      if (!btn) return;
      openAddSheet(btn.getAttribute("data-add-product"));
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
      if (event.target.closest("[data-line-edit]")) {
        openLineSheet(key);
        return;
      }
      var deltaBtn = event.target.closest("[data-qty-delta]");
      if (deltaBtn) {
        var line = cart.find(function (row) {
          return row.key === key;
        });
        if (!line) return;
        var delta = Number(deltaBtn.getAttribute("data-qty-delta")) || 0;
        setQty(key, line.quantity + delta);
      }
    });

    cartEl.addEventListener("change", function (event) {
      var item = event.target.closest(".sell-cart__item");
      if (!item) return;
      var key = item.getAttribute("data-key");
      if (event.target.matches("[data-unit]")) {
        changeUnit(key, event.target.value);
      }
      if (event.target.matches("[data-qty]")) setQty(key, event.target.value);
    });

    cartEl.addEventListener("input", function (event) {
      var item = event.target.closest(".sell-cart__item");
      if (!item) return;
      var key = item.getAttribute("data-key");
      if (event.target.matches("[data-qty]")) setQty(key, event.target.value);
    });
  }

  if (lineSheet) {
    lineSheet.addEventListener("click", function (event) {
      var deltaBtn = event.target.closest("[data-sheet-qty-delta]");
      if (!deltaBtn) return;
      var unitId = deltaBtn.getAttribute("data-sheet-unit-id");
      var delta = Number(deltaBtn.getAttribute("data-sheet-qty-delta")) || 0;
      bumpSheetQty(unitId, delta);
    });
  }

  if (lineSheetSave) {
    lineSheetSave.addEventListener("click", saveLineSheet);
  }
  if (lineSheetCancel) {
    lineSheetCancel.addEventListener("click", closeLineSheet);
  }

  oldLines.forEach(function (line) {
    if (!line || !line.product_unit_id) return;
    var product = catalog.find(function (p) {
      return (p.units || []).some(function (u) {
        return String(u.id) === String(line.product_unit_id);
      });
    });
    if (!product) return;
    addLine(
      product.id,
      line.product_unit_id,
      line.quantity || 0,
      line.gift_quantity || 0,
      line.discount_percent || 0
    );
  });

  refreshFilters();
  renderCart();
  filterStores();
  var restoredStore = selectedStoreOption();
  if (restoredStore) {
    lockStore(restoredStore);
  } else if (root.getAttribute("data-visit-locked-store")) {
    goToStep(2);
  } else {
    goToStep(1);
  }
})();
