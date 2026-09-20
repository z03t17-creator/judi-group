(function () {
  var root = document.querySelector('[data-purchase-receive]');
  if (!root) return;

  var catalog = window.JUDI_PURCHASE_CATALOG || [];
  var categories = window.JUDI_PURCHASE_CATEGORIES || [];
  var labels = window.JUDI_PURCHASE_LABELS || {};
  var body = root.querySelector('[data-lines-body]');
  var addBtn = root.querySelector('[data-add-line]');
  var grandEl = root.querySelector('[data-grand-total]');
  var form = document.getElementById('purchase-form');
  var categoryRail = root.querySelector('[data-category-rail]');
  var subcategoryRail = root.querySelector('[data-subcategory-rail]');
  var productList = root.querySelector('[data-product-list]');
  var productFilter = root.querySelector('[data-product-filter]');
  var catalogCount = root.querySelector('[data-catalog-count]');
  var emptyEl = root.querySelector('[data-lines-empty]');
  var lineIndex = 0;
  var selectedCategoryId = '';
  var selectedSubcategoryId = '';

  function money(n) {
    return Math.round(n).toLocaleString('en-US');
  }

  function productLabel(p) {
    return p && p.name ? String(p.name) : '';
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, '&#39;');
  }

  function findProduct(id) {
    return catalog.find(function (p) {
      return String(p.id) === String(id);
    });
  }

  function matchesFilter(p, needle) {
    if (selectedCategoryId && String(p.category_id) !== String(selectedCategoryId)) {
      return false;
    }
    if (selectedSubcategoryId && String(p.subcategory_id) !== String(selectedSubcategoryId)) {
      return false;
    }
    if (!needle) return true;
    var hay = ((p.name || '') + ' ' + (p.sku || '')).toLowerCase();
    return hay.indexOf(needle) !== -1;
  }

  function optionHtml(p, selectedId) {
    return (
      '<option value="' +
      p.id +
      '"' +
      (String(selectedId) === String(p.id) ? ' selected' : '') +
      '>' +
      escapeHtml(productLabel(p)) +
      '</option>'
    );
  }

  function productOptions(selectedId) {
    var html = '<option value="">—</option>';
    var seen = {};
    catalog.forEach(function (p) {
      if (!matchesFilter(p, '')) return;
      seen[String(p.id)] = true;
      html += optionHtml(p, selectedId);
    });
    if (selectedId && !seen[String(selectedId)]) {
      var extra = findProduct(selectedId);
      if (extra) html += optionHtml(extra, selectedId);
    }
    return html;
  }

  function unitOptions(product, selectedUnitId) {
    if (!product || !product.units || !product.units.length) {
      return '<option value="">—</option>';
    }
    return product.units
      .map(function (u) {
        return (
          '<option value="' +
          u.id +
          '"' +
          (String(selectedUnitId) === String(u.id) ? ' selected' : '') +
          '>' +
          escapeHtml(u.label) +
          '</option>'
        );
      })
      .join('');
  }

  function preferredUnit(product) {
    if (!product || !product.units || !product.units.length) return null;
    return product.units[product.units.length - 1];
  }

  function lineCount() {
    return body ? body.querySelectorAll('tr[data-line]').length : 0;
  }

  function syncEmpty() {
    if (emptyEl) emptyEl.hidden = lineCount() > 0;
  }

  function recalc() {
    var total = 0;
    body.querySelectorAll('tr[data-line]').forEach(function (row) {
      var qty = parseFloat(String(row.querySelector('[data-qty]').value).replace(/,/g, '')) || 0;
      var cost = parseFloat(String(row.querySelector('[data-cost]').value).replace(/,/g, '')) || 0;
      var line = qty * cost;
      total += line;
      var cell = row.querySelector('[data-line-total]');
      if (cell) cell.textContent = money(line);
    });
    if (grandEl) grandEl.textContent = money(total);
    syncEmpty();
  }

  function bindLine(tr, preset) {
    var productSelect = tr.querySelector('[data-product]');
    var unitSelect = tr.querySelector('[data-unit]');

    productSelect.addEventListener('change', function () {
      var product = findProduct(productSelect.value);
      unitSelect.innerHTML = unitOptions(product, null);
      if (product && product.units && product.units.length) {
        unitSelect.value = String(preferredUnit(product).id);
      }
      recalc();
    });

    tr.querySelector('[data-qty]').addEventListener('input', recalc);
    tr.querySelector('[data-cost]').addEventListener('input', recalc);
    tr.querySelector('[data-remove-line]').addEventListener('click', function () {
      tr.remove();
      recalc();
    });

    if (preset && preset.product_id && !preset.product_unit_id) {
      var product = findProduct(preset.product_id);
      var unit = preferredUnit(product);
      if (unit) unitSelect.value = String(unit.id);
    }
  }

  function addLine(preset) {
    preset = preset || {};
    var idx = lineIndex++;
    var product = findProduct(preset.product_id);
    var unitId = preset.product_unit_id || (preferredUnit(product) ? preferredUnit(product).id : '');
    var tr = document.createElement('tr');
    tr.setAttribute('data-line', '1');
    tr.innerHTML =
      '<td><select class="field__input" data-product required>' +
      productOptions(preset.product_id) +
      '</select></td>' +
      '<td><select class="field__input" name="lines[' +
      idx +
      '][product_unit_id]" data-unit required>' +
      unitOptions(product, unitId) +
      '</select></td>' +
      '<td><input class="field__input" type="text" inputmode="decimal" dir="ltr" name="lines[' +
      idx +
      '][quantity]" data-qty value="' +
      (preset.quantity != null ? preset.quantity : '1') +
      '" required></td>' +
      '<td><input class="field__input" type="text" inputmode="decimal" dir="ltr" name="lines[' +
      idx +
      '][unit_cost]" data-cost value="' +
      (preset.unit_cost != null ? preset.unit_cost : '0') +
      '" required></td>' +
      '<td dir="ltr" data-line-total>0</td>' +
      '<td><button type="button" class="btn btn--danger btn--sm" data-remove-line aria-label="remove">×</button></td>';

    body.appendChild(tr);
    bindLine(tr, preset);
    recalc();
    tr.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function addProductFromCatalog(id) {
    var existing = null;
    body.querySelectorAll('tr[data-line]').forEach(function (row) {
      var sel = row.querySelector('[data-product]');
      if (sel && String(sel.value) === String(id)) existing = row;
    });
    if (existing) {
      var qty = existing.querySelector('[data-qty]');
      var n = parseFloat(String(qty.value).replace(/,/g, '')) || 0;
      qty.value = String(n + 1);
      recalc();
      existing.classList.add('is-bumped');
      setTimeout(function () {
        existing.classList.remove('is-bumped');
      }, 400);
      existing.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    addLine({ product_id: id, quantity: 1, unit_cost: 0 });
  }

  function currentSubs() {
    var cat = categories.find(function (c) {
      return String(c.id) === String(selectedCategoryId);
    });
    return cat && Array.isArray(cat.subcategories) ? cat.subcategories : [];
  }

  function fillSubcategories() {
    if (!subcategoryRail) return;
    var subs = currentSubs();
    if (!selectedCategoryId || !subs.length) {
      subcategoryRail.hidden = true;
      subcategoryRail.innerHTML = '';
      return;
    }
    var html =
      '<button type="button" class="purchase-sub' +
      (selectedSubcategoryId ? '' : ' is-active') +
      '" data-subcategory-id="">' +
      escapeHtml(labels.allSubcategories || labels.all || '—') +
      '</button>';
    subs.forEach(function (sub) {
      html +=
        '<button type="button" class="purchase-sub' +
        (String(selectedSubcategoryId) === String(sub.id) ? ' is-active' : '') +
        '" data-subcategory-id="' +
        escapeAttr(String(sub.id)) +
        '">' +
        escapeHtml(sub.name) +
        '</button>';
    });
    subcategoryRail.innerHTML = html;
    subcategoryRail.hidden = false;
  }

  function refreshProductSelects() {
    if (!body) return;
    body.querySelectorAll('tr[data-line]').forEach(function (row) {
      var sel = row.querySelector('[data-product]');
      if (!sel) return;
      var current = sel.value;
      sel.innerHTML = productOptions(current);
      if (current) sel.value = current;
    });
  }

  function renderCatalog() {
    if (!productList) return;
    var needle = (productFilter && productFilter.value ? productFilter.value : '')
      .trim()
      .toLowerCase();
    var matches = catalog.filter(function (p) {
      return matchesFilter(p, needle);
    });

    if (catalogCount) {
      catalogCount.textContent = matches.length + ' ' + (labels.products || '');
    }

    if (!matches.length) {
      productList.innerHTML =
        '<p class="purchase-product-empty">' +
        escapeHtml(labels.noProducts || '—') +
        '</p>';
      return;
    }

    productList.innerHTML = matches
      .map(function (product) {
        var unit = preferredUnit(product);
        return (
          '<button type="button" class="purchase-product" data-add-product="' +
          product.id +
          '">' +
          '<img class="purchase-product__img" src="' +
          escapeAttr(product.image || '') +
          '" alt="">' +
          '<span class="purchase-product__body">' +
          '<span class="purchase-product__name">' +
          escapeHtml(productLabel(product)) +
          '</span>' +
          '<span class="purchase-product__meta">' +
          escapeHtml(
            [product.sku, unit ? unit.label : '']
              .filter(Boolean)
              .join(' · ')
          ) +
          '</span>' +
          '</span>' +
          '<span class="purchase-product__add" aria-hidden="true">+</span>' +
          '</button>'
        );
      })
      .join('');
  }

  if (categoryRail) {
    categoryRail.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-category-id]');
      if (!btn) return;
      selectedCategoryId = btn.getAttribute('data-category-id') || '';
      selectedSubcategoryId = '';
      categoryRail.querySelectorAll('.purchase-cat').forEach(function (el) {
        el.classList.toggle('is-active', el === btn);
      });
      fillSubcategories();
      renderCatalog();
      refreshProductSelects();
    });
  }

  if (subcategoryRail) {
    subcategoryRail.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-subcategory-id]');
      if (!btn) return;
      selectedSubcategoryId = btn.getAttribute('data-subcategory-id') || '';
      subcategoryRail.querySelectorAll('.purchase-sub').forEach(function (el) {
        el.classList.toggle('is-active', el === btn);
      });
      renderCatalog();
      refreshProductSelects();
    });
  }

  if (productList) {
    productList.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-add-product]');
      if (!btn) return;
      addProductFromCatalog(btn.getAttribute('data-add-product'));
    });
  }

  if (productFilter) {
    productFilter.addEventListener('input', renderCatalog);
  }

  if (addBtn) {
    addBtn.addEventListener('click', function () {
      addLine();
    });
  }

  var supplierName = root.querySelector('[data-supplier-name]');
  var supplierId = root.querySelector('[data-supplier-id]');
  if (supplierName && supplierId) {
    var supplierMap = {};
    root.querySelectorAll('#purchase-suppliers option').forEach(function (opt) {
      supplierMap[opt.value.trim()] = opt.getAttribute('data-id') || '';
    });
    var syncSupplier = function () {
      var typed = supplierName.value.trim();
      supplierId.value = supplierMap[typed] || '';
    };
    supplierName.addEventListener('input', syncSupplier);
    supplierName.addEventListener('change', syncSupplier);
    syncSupplier();
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      if (!lineCount()) {
        e.preventDefault();
        alert('لانیکەم یەک هێڵ پێویستە.');
      }
    });
  }

  fillSubcategories();
  renderCatalog();
  recalc();
})();
