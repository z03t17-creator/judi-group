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
  var cart = [];
  var oldLines = Array.isArray(window.JudiInvoiceOldLines)
    ? window.JudiInvoiceOldLines
    : [];
  var selectedCategoryId = "";
  var selectedSubcategoryId = "";
  var wizardStep = 1;
  var editingKey = null;
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
  var lockedMeta = root.querySelector("[data-locked-meta]");
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
  var lineSheetName = root.querySelector("[data-line-sheet-name]");
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

    if (existing) {
      existing.quantity += amount || (gift ? 0 : 1);
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

  function openLineSheet(key) {
    var line = cart.find(function (item) {
      return item.key === key;
    });
    if (!line || !lineSheet) return;
    editingKey = key;
    if (lineSheetName) lineSheetName.textContent = line.name;
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
    if (lineSheet && lineSheet.open) {
      try {
        lineSheet.close();
      } catch (e) {}
    }
  }

  function saveLineSheet() {
    if (!editingKey) return;
    if (lineSheetGift) setGift(editingKey, lineSheetGift.value);
    if (lineSheetDiscount) setLineDiscount(editingKey, lineSheetDiscount.value);
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
                escapeHtml(u.label) +
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
                escapeHtml(labels.gift || "Gift") +
                " " +
                line.giftQuantity +
                "</span>"
            );
          }
          if (line.discountPercent > 0) {
            badges.push(
              '<span class="sell-cart__badge sell-cart__badge--disc">' +
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
            "</span>" +
            '<strong class="sell-cart__line-total" dir="ltr">' +
            money(lineNet(line)) +
            "</strong>" +
            '<button type="button" class="sell-cart__remove" data-remove aria-label="×">×</button>' +
            "</div>" +
            '<div class="sell-cart__row sell-cart__row--controls">' +
            '<select class="sell-cart__unit" data-unit>' +
            options +
            "</select>" +
            '<div class="qty-stepper">' +
            '<button type="button" data-qty-delta="-1" aria-label="-">−</button>' +
            '<input type="number" min="0" step="1" inputmode="numeric" value="' +
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
        '<span class="sell-pill__count">' +
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
      if (selectedCategoryId && String(p.category_id) !== String(selectedCategoryId)) {
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
        var price = unit ? money(unit.price) : "—";
        return (
          '<button type="button" class="sell-product sell-product--calm" data-add-product="' +
          escapeAttr(String(product.id)) +
          '">' +
          '<img class="sell-product__img" src="' +
          escapeAttr(product.image || "") +
          '" alt="">' +
          '<span class="sell-product__body">' +
          "<strong>" +
          escapeHtml(product.name) +
          "</strong>" +
          '<span class="sell-product__price" dir="ltr">' +
          price +
          "</span>" +
          "</span>" +
          '<span class="sell-product__add">' +
          escapeHtml(labels.add || "+") +
          "</span>" +
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
    if (n === 2) refreshFilters();
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      window.scrollTo(0, 0);
    }
  }

  function lockStore(opt) {
    if (!opt) return;
    var name = opt.getAttribute("data-store-name") || "";
    var phone = opt.getAttribute("data-store-phone") || "";
    var debt = opt.getAttribute("data-store-debt") || "0";
    var image = opt.getAttribute("data-store-image") || "";
    var id = opt.getAttribute("data-store-id") || "";

    if (storeIdInput) storeIdInput.value = id;
    storeOptions.forEach(function (el) {
      el.classList.toggle("is-selected", el === opt);
    });

    if (lockedName) lockedName.textContent = name;
    if (lockedMeta) lockedMeta.textContent = phone;
    if (lockedImg) lockedImg.src = image;
    if (lockedDebt) {
      var hasDebt = debt && debt !== "0";
      lockedDebt.hidden = !hasDebt;
      lockedDebt.textContent = hasDebt
        ? (labels.currentDebt || "Debt") + ": " + debt
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

  if (productFilter) productFilter.addEventListener("input", renderCatalog);
  if (storeFilter) storeFilter.addEventListener("input", filterStores);
  if (discountInput) discountInput.addEventListener("input", renderCart);

  if (submitBtn) {
    submitBtn.addEventListener("click", function (event) {
      event.preventDefault();
      if (cart.length === 0) return;
      if (!hasStore()) {
        showNeedStore();
        return;
      }
      hideNeedStore();
      if (submitBtn) submitBtn.disabled = true;
      try {
        sessionStorage.setItem("judiPrintAfterSave", "a4");
      } catch (e) {}
      if (form) form.submit();
    });
  }

  if (form) {
    form.addEventListener("submit", function (event) {
      if (cart.length === 0 || !hasStore()) {
        event.preventDefault();
        if (!hasStore()) showNeedStore();
      }
    });
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
      var product = findProduct(btn.getAttribute("data-add-product"));
      var unit = preferredUnit(product);
      if (!unit) return;
      addLine(product.id, unit.id, 1, 0, 0);
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
      if (event.target.matches("[data-unit]")) changeUnit(key, event.target.value);
      if (event.target.matches("[data-qty]")) setQty(key, event.target.value);
    });

    cartEl.addEventListener("input", function (event) {
      var item = event.target.closest(".sell-cart__item");
      if (!item) return;
      var key = item.getAttribute("data-key");
      if (event.target.matches("[data-qty]")) setQty(key, event.target.value);
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
  } else {
    goToStep(1);
  }
})();
