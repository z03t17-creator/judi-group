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
  var cart = [];
  var oldLines = Array.isArray(window.JudiInvoiceOldLines)
    ? window.JudiInvoiceOldLines
    : [];
  var selectedCategoryId = "";
  var selectedSubcategoryId = "";
  var wizardStep = 1;
  var browsePhase = "cat";
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
  var categorySelect = root.querySelector("[data-category-select]");
  var subcategorySelect = root.querySelector("[data-subcategory-select]");
  var filterSummary = root.querySelector("[data-filter-summary]");
  var viewerToggle = root.querySelector("[data-sell-viewer-toggle]");
  var viewerPanel = root.querySelector("[data-sell-viewer-panel]");
  var storeFilter = root.querySelector("[data-store-filter]");
  var storeOptions = Array.prototype.slice.call(
    root.querySelectorAll("[data-store-option]")
  );
  var storeIdInput = root.querySelector("[data-store-id-input]");
  var storePick = root.querySelector("[data-store-pick]");
  var lockedStore = root.querySelector("[data-locked-store]");
  var lockedName = root.querySelector("[data-locked-name]");
  var lockedMeta = root.querySelector("[data-locked-meta]");
  var lockedDebt = root.querySelector("[data-locked-debt]");
  var lockedImg = root.querySelector("[data-locked-img]");
  var changeStoreBtn = root.querySelector("[data-change-store]");
  var cartEl = root.querySelector("[data-cart]");
  var cartEmpty = root.querySelector("[data-cart-empty]");
  var linesInputs = root.querySelector("[data-lines-inputs]");
  var totalEls = root.querySelectorAll("[data-cart-total], [data-cart-total-sticky]");
  var submitBtn = root.querySelector("[data-submit-sale]");
  var discountInput = root.querySelector("[data-discount]");
  var paidNowInput = root.querySelector("[data-paid-now]");
  var payDialog = root.querySelector("[data-pay-dialog]");
  var payAmountInput = root.querySelector("[data-pay-amount]");
  var payTotalEl = root.querySelector("[data-pay-total]");
  var payRemainEl = root.querySelector("[data-pay-remain]");
  var payConfirmBtn = root.querySelector("[data-pay-confirm]");
  var payCancelBtn = root.querySelector("[data-pay-cancel]");
  var payErrorEl = root.querySelector("[data-pay-error]");
  var form = root.querySelector("#invoice-sell-form");
  var storePanel = root.querySelector('[data-panel="store"]');
  var cartCountEl = root.querySelector("[data-cart-count]");
  var stepEls = Array.prototype.slice.call(
    root.querySelectorAll("[data-sell-step]")
  );
  var payConfirmed = false;
  var storeNeededEl = root.querySelector("[data-store-needed]");
  var browseCats = root.querySelector("[data-browse-cats]");
  var browseSubs = root.querySelector("[data-browse-subs]");
  var browsePanel = root.querySelector('[data-panel="browse"]');
  var catalogPanel = root.querySelector('[data-panel="catalog"]');
  var wizardTitle = root.querySelector("[data-wizard-title]");
  var wizardBack = root.querySelector("[data-wizard-back]");
  var exitSell = root.querySelector("[data-exit-sell]");
  var sellContext = root.querySelector("[data-sell-context]");
  var changeCategoryBtn = root.querySelector("[data-change-category]");
  var stickyCta = root.querySelector("[data-sell-cta]");
  var payTypeBar = root.querySelector("[data-pay-bar]");

  function money(n) {
    return Math.round(Number(n) || 0).toLocaleString("en-US");
  }

  function preferredUnit(product) {
    if (!product.units || !product.units.length) return null;
    var carton = product.units.find(function (u) {
      return u.unit === "carton";
    });
    return carton || product.units[product.units.length - 1];
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
    return productId + ":" + unitId;
  }

  function addLine(productId, unitId, qty, giftQty) {
    var product = findProduct(productId);
    if (!product) return;
    var unit = findUnit(product, unitId) || preferredUnit(product);
    if (!unit) return;
    var key = cartKey(product.id, unit.id);
    var existing = cart.find(function (line) {
      return line.key === key;
    });
    var amount = Math.max(0, Math.round(Number(qty) || 0));
    var gift = Math.max(0, Math.round(Number(giftQty) || 0));
    if (existing) {
      existing.quantity += amount || (gift ? 0 : 1);
      existing.giftQuantity += gift;
    } else {
      cart.push({
        key: key,
        productId: product.id,
        productUnitId: unit.id,
        name: product.name,
        image: product.image,
        unitLabel: unit.label,
        unitId: unit.id,
        price: Number(unit.price) || 0,
        quantity: amount || (gift ? 0 : 1),
        giftQuantity: gift,
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

  function changeUnit(key, unitId) {
    var line = cart.find(function (item) {
      return item.key === key;
    });
    if (!line) return;
    var product = findProduct(line.productId);
    var unit = findUnit(product, unitId);
    if (!unit) return;
    var nextKey = cartKey(product.id, unit.id);
    var other = cart.find(function (item) {
      return item.key === nextKey && item.key !== key;
    });
    if (other) {
      other.quantity += line.quantity;
      other.giftQuantity += line.giftQuantity;
      cart = cart.filter(function (item) {
        return item.key !== key;
      });
    } else {
      line.key = nextKey;
      line.productUnitId = unit.id;
      line.unitId = unit.id;
      line.unitLabel = unit.label;
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

  function cartSubtotal() {
    return cart.reduce(function (sum, line) {
      return sum + line.price * line.quantity;
    }, 0);
  }

  function cartTotal() {
    var sub = cartSubtotal();
    var pct = discountInput ? Number(discountInput.value) || 0 : 0;
    return Math.max(0, sub - sub * (pct / 100));
  }

  function selectedPayType() {
    var radio = root.querySelector('input[name="invoice_type"]:checked');
    return radio ? radio.value : "debt";
  }

  function parseMoneyValue(raw) {
    return parseFloat(String(raw || "0").replace(/[^\d.]/g, "")) || 0;
  }

  function digitsOnly(raw) {
    return String(raw || "").replace(/[^\d]/g, "");
  }

  function hidePayError() {
    if (payErrorEl) payErrorEl.hidden = true;
    if (payAmountInput) payAmountInput.classList.remove("is-invalid");
  }

  function showPayError() {
    if (payErrorEl) payErrorEl.hidden = false;
    if (payAmountInput) {
      payAmountInput.classList.add("is-invalid");
      payAmountInput.focus();
    }
  }

  function hasPayNumber() {
    return !!(payAmountInput && digitsOnly(payAmountInput.value));
  }

  function writePayAmount(n) {
    if (!payAmountInput) return;
    payAmountInput.value = money(Math.max(0, Math.round(Number(n) || 0)));
  }

  function syncPayDialog() {
    var total = Math.round(cartTotal());
    var paid = payAmountInput ? Math.max(0, parseMoneyValue(payAmountInput.value)) : 0;
    if (paid > total) paid = total;
    var remain = Math.max(0, total - Math.round(paid));
    if (payTotalEl) payTotalEl.textContent = money(total);
    if (payRemainEl) {
      payRemainEl.textContent = money(remain);
      var remainRow = payRemainEl.closest(".pay-dialog__row");
      if (remainRow) remainRow.classList.toggle("is-zero", remain <= 0);
    }
    return { total: total, paid: Math.round(paid), remain: remain };
  }

  function setPayChip(kind) {
    var total = Math.round(cartTotal());
    var value = 0;
    if (kind === "half") value = Math.round(total / 2);
    if (kind === "all") value = total;
    writePayAmount(value);
    hidePayError();
    syncPayDialog();
  }

  function applyPayToForm() {
    var result = syncPayDialog();
    if (paidNowInput) {
      paidNowInput.disabled = false;
      paidNowInput.value = String(result.paid);
    }
    var type = result.remain > 0 ? "debt" : "cash";
    var radio = root.querySelector('input[name="invoice_type"][value="' + type + '"]');
    if (radio) radio.checked = true;
    return result;
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

  function submitSaleForm() {
    payConfirmed = true;
    if (payDialog && payDialog.open) {
      try {
        payDialog.close();
      } catch (e) {}
    }
    if (!form) return;
    if (submitBtn) submitBtn.disabled = true;
    if (payConfirmBtn) payConfirmBtn.disabled = true;
    try {
      sessionStorage.setItem("judiPrintAfterSave", "a4");
    } catch (e) {}
    window.setTimeout(function () {
      try {
        form.submit();
      } catch (e) {
        if (submitBtn) submitBtn.disabled = false;
        if (payConfirmBtn) payConfirmBtn.disabled = false;
        payConfirmed = false;
      }
    }, 30);
  }

  function finishPayAndSubmit() {
    if (!hasPayNumber()) {
      showPayError();
      return;
    }
    applyPayToForm();
    if (!hasStore()) {
      if (payDialog && payDialog.open) {
        try {
          payDialog.close();
        } catch (e) {}
      }
      showNeedStore();
      return;
    }
    hideNeedStore();
    submitSaleForm();
  }

  function openPayDialog() {
    var total = Math.round(cartTotal());
    var isCash = selectedPayType() === "cash";
    var start = isCash ? total : 0;
    if (paidNowInput && parseMoneyValue(paidNowInput.value) > 0) {
      start = Math.round(parseMoneyValue(paidNowInput.value));
    }
    if (start > 0) writePayAmount(start);
    else if (payAmountInput) payAmountInput.value = "";
    hidePayError();
    syncPayDialog();
    if (payDialog && typeof payDialog.showModal === "function") {
      payDialog.showModal();
      window.setTimeout(function () {
        if (!payAmountInput) return;
        payAmountInput.focus();
        payAmountInput.select();
      }, 40);
      return;
    }
    var raw = window.prompt(
      (labels.payAsk || "How much?") +
        "\n" +
        (labels.grandTotal || "Total") +
        ": " +
        money(total) +
        "\n" +
        (labels.remaining || "Remaining") +
        " = " +
        (labels.grandTotal || "Total") +
        " − " +
        (labels.paidNow || "Paid"),
      String(start)
    );
    if (raw === null) return;
    if (payAmountInput) payAmountInput.value = raw;
    if (!hasPayNumber()) {
      showPayError();
      return;
    }
    finishPayAndSubmit();
  }

  function renderCart() {
    var total = cartTotal();
    totalEls.forEach(function (el) {
      el.textContent = money(total);
    });
    if (submitBtn) submitBtn.disabled = cart.length === 0;
    var cartCard = root.querySelector('[data-panel="cart"]');
    if (cartCard) cartCard.hidden = wizardStep !== 3 || cart.length === 0;
    if (cartCountEl) {
      cartCountEl.textContent =
        (labels.lines || "Lines") + ": " + cart.length;
    }
    updateSteps();

    if (cartEmpty) {
      cartEmpty.hidden = cart.length > 0;
    }

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
                u.label +
                " · " +
                money(u.price) +
                "</option>"
              );
            })
            .join("");

          return (
            '<li class="sell-cart__item" data-key="' +
            line.key +
            '">' +
            '<span class="sell-cart__name">' +
            escapeHtml(line.name) +
            "</span>" +
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
            '<label class="sell-cart__gift"><span>' +
            escapeHtml(labels.gift || "Gift") +
            '</span><input type="number" min="0" step="1" inputmode="numeric" value="' +
            line.giftQuantity +
            '" data-gift></label>' +
            '<strong class="sell-cart__line-total" dir="ltr">' +
            money(line.price * line.quantity) +
            "</strong>" +
            '<button type="button" class="sell-cart__remove" data-remove aria-label="×">×</button>' +
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

  function filterSummaryText() {
    var parts = [];
    if (selectedCategoryId) {
      var cat = categories.find(function (c) {
        return String(c.id) === String(selectedCategoryId);
      });
      if (cat) parts.push(cat.name);
    }
    if (selectedSubcategoryId) {
      var sub = currentSubs().find(function (s) {
        return String(s.id) === String(selectedSubcategoryId);
      });
      if (sub) parts.push(sub.name);
    }
    return parts.length ? parts.join(" · ") : labels.all || "All";
  }

  function updateFilterSummary() {
    if (filterSummary) filterSummary.textContent = filterSummaryText();
  }

  function fillSubcategorySelect() {
    if (!subcategorySelect) return;
    var subs = currentSubs();
    var html = '<option value="">' + escapeHtml(labels.all || "All") + "</option>";
    subs.forEach(function (sub) {
      html +=
        '<option value="' +
        escapeAttr(String(sub.id)) +
        '"' +
        (String(selectedSubcategoryId) === String(sub.id) ? " selected" : "") +
        ">" +
        escapeHtml(sub.name) +
        "</option>";
    });
    subcategorySelect.innerHTML = html;
    subcategorySelect.disabled = !selectedCategoryId || !subs.length;
  }

  function renderCatalog() {
    if (!productList) return;
    var needle = (productFilter && productFilter.value
      ? productFilter.value
      : ""
    )
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

    updateFilterSummary();

    if (!matches.length) {
      productList.innerHTML =
        '<p class="empty">' +
        escapeHtml(labels.noProducts || "No products") +
        "</p>";
      return;
    }

    productList.innerHTML = matches
      .slice(0, 80)
      .map(function (product) {
        var unit = preferredUnit(product);
        var price = unit ? money(unit.price) : "—";
        return (
          '<button type="button" class="sell-product sell-product--row" data-add-product="' +
          product.id +
          '">' +
          '<img class="sell-product__img" src="' +
          escapeAttr(product.image || "") +
          '" alt="">' +
          '<span class="sell-product__text">' +
          '<span class="sell-product__name">' +
          escapeHtml(product.name) +
          "</span>" +
          '<span class="sell-product__meta" dir="ltr">' +
          price +
          (unit ? " · " + escapeHtml(unit.label) : "") +
          "</span>" +
          "</span>" +
          '<span class="sell-product__add" aria-hidden="true">+</span>' +
          "</button>"
        );
      })
      .join("");
  }

  function filterStores() {
    var needle = (storeFilter && storeFilter.value
      ? storeFilter.value
      : ""
    )
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
    return storeOptions.find(function (el) {
      return String(el.getAttribute("data-store-id")) === String(id);
    }) || null;
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

  function unlockStore() {
    if (storePanel) storePanel.classList.remove("is-locked");
    if (lockedStore) lockedStore.hidden = true;
    if (storeFilter) {
      storeFilter.value = "";
      filterStores();
      storeFilter.focus();
    }
    goToStep(1);
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

  function updateSelectedStore() {
    var opt = selectedStoreOption();
    if (opt) lockStore(opt);
    else unlockStore();
  }

  function itemsCountLabel(n) {
    return String(labels.itemsCount || ":count").replace(":count", String(n));
  }

  function countProducts(catId, subId) {
    return catalog.filter(function (p) {
      if (catId && String(p.category_id) !== String(catId)) return false;
      if (subId && String(p.subcategory_id) !== String(subId)) return false;
      return true;
    }).length;
  }

  function findCategory(id) {
    return (
      categories.find(function (c) {
        return String(c.id) === String(id);
      }) || null
    );
  }

  function updateWizardTitle() {
    if (!wizardTitle) return;
    if (wizardStep === 1) {
      wizardTitle.textContent = labels.pickStoreTitle || labels.pickStore || "";
    } else if (wizardStep === 2) {
      wizardTitle.textContent =
        browsePhase === "sub"
          ? labels.pickSubcategoryTitle || ""
          : labels.pickCategoryTitle || "";
    } else {
      wizardTitle.textContent = labels.pickProductsTitle || "";
    }
  }

  function goToStep(n, phase) {
    wizardStep = n;
    if (phase) browsePhase = phase;
    root.setAttribute("data-step", String(n));
    if (storePanel) storePanel.hidden = n !== 1;
    if (browsePanel) browsePanel.hidden = n !== 2;
    if (catalogPanel) catalogPanel.hidden = n !== 3;
    var cartCard = root.querySelector('[data-panel="cart"]');
    if (cartCard) cartCard.hidden = n !== 3 || cart.length === 0;
    if (payTypeBar) payTypeBar.hidden = n !== 3;
    if (stickyCta) stickyCta.hidden = n !== 3;
    if (sellContext) sellContext.hidden = n === 1;
    if (wizardBack) wizardBack.hidden = n === 1;
    if (exitSell) exitSell.hidden = n !== 1;
    if (changeCategoryBtn) {
      changeCategoryBtn.hidden =
        n !== 3 || (!selectedCategoryId && !selectedSubcategoryId);
    }
    updateWizardTitle();
    updateSteps();
    if (n === 2) {
      if (browsePhase === "sub" && selectedCategoryId) {
        renderSubcategoryTiles();
      } else {
        browsePhase = "cat";
        renderCategoryTiles();
      }
    }
    if (n === 3) {
      fillSubcategorySelect();
      renderCatalog();
    }
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      window.scrollTo(0, 0);
    }
  }

  function wizardGoBack() {
    if (wizardStep === 3) {
      goToStep(2, selectedCategoryId && currentSubs().length ? "sub" : "cat");
      return;
    }
    if (wizardStep === 2 && browsePhase === "sub") {
      selectedSubcategoryId = "";
      goToStep(2, "cat");
      return;
    }
    if (wizardStep === 2) {
      goToStep(1);
    }
  }

  function renderCategoryTiles() {
    if (browseCats) browseCats.hidden = false;
    if (browseSubs) {
      browseSubs.hidden = true;
      browseSubs.innerHTML = "";
    }
    if (!browseCats) return;
    if (!categories.length) {
      browseCats.innerHTML =
        '<p class="empty">' +
        escapeHtml(labels.noProducts || "No products") +
        "</p>";
      return;
    }
    browseCats.innerHTML = categories
      .map(function (cat, i) {
        var count = countProducts(cat.id);
        var color = TILE_COLORS[i % TILE_COLORS.length];
        var letter = String(cat.name || "?").trim().charAt(0);
        return (
          '<button type="button" class="sell-tile" data-pick-category="' +
          escapeAttr(String(cat.id)) +
          '" style="--tile:' +
          color +
          '">' +
          '<span class="sell-tile__mark" aria-hidden="true">' +
          escapeHtml(letter) +
          "</span>" +
          '<span class="sell-tile__body">' +
          '<strong class="sell-tile__name">' +
          escapeHtml(cat.name) +
          "</strong>" +
          '<span class="sell-tile__meta">' +
          escapeHtml(itemsCountLabel(count)) +
          "</span>" +
          "</span>" +
          '<span class="sell-tile__go" aria-hidden="true">‹</span>' +
          "</button>"
        );
      })
      .join("");
    updateWizardTitle();
  }

  function renderSubcategoryTiles() {
    var cat = findCategory(selectedCategoryId);
    var subs = cat ? cat.subcategories || [] : [];
    if (browseCats) browseCats.hidden = true;
    if (!browseSubs) {
      goToStep(3);
      return;
    }
    browseSubs.hidden = false;
    var allCount = countProducts(selectedCategoryId);
    var html =
      '<button type="button" class="sell-tile sell-tile--all" data-pick-all-sub>' +
      '<span class="sell-tile__body">' +
      "<strong>" +
      escapeHtml(labels.allInCategory || labels.all || "All") +
      "</strong>" +
      '<span class="sell-tile__meta">' +
      escapeHtml(itemsCountLabel(allCount)) +
      "</span>" +
      "</span>" +
      '<span class="sell-tile__go" aria-hidden="true">‹</span>' +
      "</button>";
    html += subs
      .map(function (sub, i) {
        var count = countProducts(selectedCategoryId, sub.id);
        var color = TILE_COLORS[i % TILE_COLORS.length];
        return (
          '<button type="button" class="sell-tile" data-pick-subcategory="' +
          escapeAttr(String(sub.id)) +
          '" style="--tile:' +
          color +
          '">' +
          '<span class="sell-tile__mark" aria-hidden="true">' +
          escapeHtml(String(sub.name || "?").trim().charAt(0)) +
          "</span>" +
          '<span class="sell-tile__body">' +
          '<strong class="sell-tile__name">' +
          escapeHtml(sub.name) +
          "</strong>" +
          '<span class="sell-tile__meta">' +
          escapeHtml(itemsCountLabel(count)) +
          "</span>" +
          "</span>" +
          '<span class="sell-tile__go" aria-hidden="true">‹</span>' +
          "</button>"
        );
      })
      .join("");
    browseSubs.innerHTML = html;
    updateWizardTitle();
  }

  function pickCategory(id) {
    selectedCategoryId = String(id || "");
    selectedSubcategoryId = "";
    if (categorySelect) categorySelect.value = selectedCategoryId;
    var cat = findCategory(selectedCategoryId);
    var subs = cat ? cat.subcategories || [] : [];
    if (subs.length) {
      goToStep(2, "sub");
      return;
    }
    goToStep(3);
  }

  function pickSubcategory(id) {
    selectedSubcategoryId = String(id || "");
    if (subcategorySelect) subcategorySelect.value = selectedSubcategoryId;
    goToStep(3);
  }

  function updateSteps() {
    stepEls.forEach(function (el) {
      var key = el.getAttribute("data-sell-step");
      var done = false;
      var active = false;
      if (key === "store") {
        active = wizardStep === 1;
        done = wizardStep > 1;
      } else if (key === "category") {
        active = wizardStep === 2;
        done = wizardStep > 2;
      } else if (key === "catalog") {
        active = wizardStep === 3;
        done = wizardStep === 3 && cart.length > 0;
      }
      el.classList.toggle("is-done", done && !active);
      el.classList.toggle("is-active", active);
    });
  }

  if (productFilter) productFilter.addEventListener("input", renderCatalog);
  if (storeFilter) storeFilter.addEventListener("input", filterStores);
  if (discountInput) discountInput.addEventListener("input", renderCart);

  if (payAmountInput) {
    payAmountInput.addEventListener("input", function () {
      var raw = digitsOnly(payAmountInput.value);
      payAmountInput.value = raw ? money(parseInt(raw, 10) || 0) : "";
      hidePayError();
      syncPayDialog();
    });
    payAmountInput.addEventListener("change", syncPayDialog);
    payAmountInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        if (payConfirmBtn) payConfirmBtn.click();
      }
    });
  }
  root.querySelectorAll("[data-pay-chip]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setPayChip(btn.getAttribute("data-pay-chip"));
      if (payAmountInput) payAmountInput.focus();
    });
  });
  if (payCancelBtn) {
    payCancelBtn.addEventListener("click", function () {
      if (payDialog) payDialog.close();
    });
  }
  if (payConfirmBtn) {
    payConfirmBtn.addEventListener("click", function () {
      finishPayAndSubmit();
    });
  }
  if (submitBtn) {
    submitBtn.addEventListener("click", function (event) {
      event.preventDefault();
      if (cart.length === 0) return;
      if (payConfirmed && hasStore()) {
        submitSaleForm();
        return;
      }
      openPayDialog();
    });
  }

  storeOptions.forEach(function (el) {
    el.addEventListener("click", function () {
      selectStore(el);
    });
  });

  stepEls.forEach(function (el) {
    el.addEventListener("click", function () {
      var key = el.getAttribute("data-sell-step");
      if (key === "store" && wizardStep > 1) {
        goToStep(1);
        return;
      }
      if (key === "category" && wizardStep > 2) {
        goToStep(2, selectedCategoryId && currentSubs().length ? "sub" : "cat");
      }
    });
  });

  if (changeStoreBtn) {
    changeStoreBtn.addEventListener("click", function () {
      goToStep(1);
      if (storeFilter) storeFilter.focus();
    });
  }

  if (wizardBack) {
    wizardBack.addEventListener("click", wizardGoBack);
  }

  if (changeCategoryBtn) {
    changeCategoryBtn.addEventListener("click", function () {
      goToStep(2, selectedCategoryId && currentSubs().length ? "sub" : "cat");
    });
  }

  if (browsePanel) {
    browsePanel.addEventListener("click", function (event) {
      var catBtn = event.target.closest("[data-pick-category]");
      if (catBtn) {
        pickCategory(catBtn.getAttribute("data-pick-category"));
        return;
      }
      if (event.target.closest("[data-pick-all-sub]")) {
        pickSubcategory("");
        return;
      }
      var subBtn = event.target.closest("[data-pick-subcategory]");
      if (subBtn) {
        pickSubcategory(subBtn.getAttribute("data-pick-subcategory"));
      }
    });
  }

  if (viewerToggle && viewerPanel) {
    viewerToggle.addEventListener("click", function () {
      var open = viewerToggle.getAttribute("aria-expanded") === "true";
      var next = !open;
      viewerToggle.setAttribute("aria-expanded", next ? "true" : "false");
      viewerPanel.hidden = !next;
      var wrap = viewerToggle.closest(".sell-viewer");
      if (wrap) wrap.classList.toggle("is-open", next);
    });
  }

  if (categorySelect) {
    categorySelect.addEventListener("change", function () {
      selectedCategoryId = categorySelect.value || "";
      selectedSubcategoryId = "";
      fillSubcategorySelect();
      renderCatalog();
    });
  }

  if (subcategorySelect) {
    subcategorySelect.addEventListener("change", function () {
      selectedSubcategoryId = subcategorySelect.value || "";
      renderCatalog();
    });
  }

  if (productList) {
    productList.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-add-product]");
      if (!btn) return;
      var product = findProduct(btn.getAttribute("data-add-product"));
      var unit = preferredUnit(product);
      if (!unit) return;
      addLine(product.id, unit.id, 1, 0);
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
      if (event.target.matches("[data-gift]")) setGift(key, event.target.value);
    });

    cartEl.addEventListener("input", function (event) {
      var item = event.target.closest(".sell-cart__item");
      if (!item) return;
      var key = item.getAttribute("data-key");
      if (event.target.matches("[data-qty]")) setQty(key, event.target.value);
      if (event.target.matches("[data-gift]")) setGift(key, event.target.value);
    });
  }

  if (form) {
    form.addEventListener("submit", function (event) {
      if (payConfirmed) return;
      event.preventDefault();
      if (cart.length === 0) return;
      if (!hasStore()) {
        showNeedStore();
        return;
      }
      openPayDialog();
    });
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
      line.gift_quantity || 0
    );
  });

  fillSubcategorySelect();
  renderCatalog();
  renderCart();
  filterStores();
  var restoredStore = selectedStoreOption();
  if (restoredStore) {
    lockStore(restoredStore);
    if (oldLines.length) goToStep(3);
  } else {
    goToStep(1);
  }
})();
