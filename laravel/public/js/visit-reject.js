(function () {
  "use strict";

  var root = document.querySelector("[data-reject-form]");
  if (!root) return;

  var catalog = Array.isArray(window.JudiRejectCatalog)
    ? window.JudiRejectCatalog
    : [];
  var labels = window.JudiRejectLabels || {};
  var cart = [];

  var catalogEl = root.querySelector("[data-reject-catalog]");
  var filterEl = root.querySelector("[data-reject-filter]");
  var cartEl = root.querySelector("[data-reject-cart]");
  var emptyEl = root.querySelector("[data-reject-empty]");
  var inputsEl = root.querySelector("[data-reject-inputs]");
  var submitBtn = root.querySelector("[data-reject-submit]");
  var creditEls = root.querySelectorAll(
    "[data-reject-credit], [data-reject-credit-sticky]"
  );

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
      return u.unit === "carton";
    });
    return carton || product.units[0];
  }

  function findProduct(id) {
    return catalog.find(function (p) {
      return String(p.id) === String(id);
    });
  }

  function cartKey(productId, unitId) {
    return String(productId) + ":" + String(unitId);
  }

  function addLine(productId, unitId, qty) {
    var product = findProduct(productId);
    var unit =
      (product &&
        (product.units || []).find(function (u) {
          return String(u.id) === String(unitId);
        })) ||
      preferredUnit(product);
    if (!product || !unit) return;

    var key = cartKey(product.id, unit.id);
    var existing = cart.find(function (line) {
      return line.key === key;
    });
    var amount = Math.max(1, Math.round(Number(qty) || 1));

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
      });
    }
    render();
  }

  function setQty(key, qty) {
    var line = cart.find(function (item) {
      return item.key === key;
    });
    if (!line) return;
    line.quantity = Math.max(0, Math.round(Number(qty) || 0));
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

  function renderCatalog(needle) {
    if (!catalogEl) return;
    var q = (needle || "").trim().toLowerCase();
    var rows = catalog.filter(function (product) {
      if (!q) return true;
      var hay = [product.name, product.sku, product.barcode || ""]
        .concat(
          (product.units || []).map(function (u) {
            return u.barcode || "";
          })
        )
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
      .slice(0, 40)
      .map(function (product) {
        var unit = preferredUnit(product);
        if (!unit) return "";
        return (
          '<button type="button" class="sell-product sell-product--calm" data-add-product="' +
          product.id +
          '" data-unit-id="' +
          unit.id +
          '">' +
          (product.image
            ? '<img class="sell-product__img" src="' +
              escapeHtml(product.image) +
              '" alt="">'
            : '<span class="sell-product__img"></span>') +
          '<span class="sell-product__body"><strong>' +
          escapeHtml(product.name) +
          '</strong><span class="sell-product__price" dir="ltr">' +
          money(unit.price) +
          " · " +
          escapeHtml(unit.label) +
          "</span></span>" +
          '<span class="sell-product__add">' +
          escapeHtml(labels.add || "+") +
          "</span></button>"
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
            "</strong>" +
            '<button type="button" class="btn btn--ghost btn--sm" data-remove>' +
            escapeHtml(labels.remove || "×") +
            "</button></div>" +
            '<div class="sell-cart__row sell-cart__row--controls">' +
            '<div class="qty-stepper">' +
            '<button type="button" data-qty-delta="-1">−</button>' +
            '<input type="number" min="1" step="1" inputmode="numeric" value="' +
            line.quantity +
            '" data-qty>' +
            '<button type="button" data-qty-delta="1">+</button></div>' +
            '<span dir="ltr">' +
            money(line.price * line.quantity) +
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
  }

  if (catalogEl) {
    catalogEl.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-add-product]");
      if (!btn) return;
      addLine(btn.getAttribute("data-add-product"), btn.getAttribute("data-unit-id"), 1);
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
        setQty(key, line.quantity + (Number(deltaBtn.getAttribute("data-qty-delta")) || 0));
      }
    });
    cartEl.addEventListener("change", function (event) {
      var item = event.target.closest(".sell-cart__item");
      if (!item || !event.target.matches("[data-qty]")) return;
      setQty(item.getAttribute("data-key"), event.target.value);
    });
  }

  if (filterEl) {
    filterEl.addEventListener("input", function () {
      renderCatalog(filterEl.value);
    });
  }

  renderCatalog("");
  render();
})();
