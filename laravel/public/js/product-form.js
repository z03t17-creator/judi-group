(function () {
  "use strict";

  function hashSeed(seed) {
    var hash = 2166136261;
    for (var i = 0; i < seed.length; i += 1) {
      hash ^= seed.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function ean13Checksum(digits12) {
    var sum = 0;
    for (var i = 0; i < 12; i += 1) {
      var n = Number(digits12[i]);
      sum += i % 2 === 0 ? n : n * 3;
    }
    return (10 - (sum % 10)) % 10;
  }

  function generateEan13FromSku(sku) {
    var seed = (sku || "").trim().toUpperCase() || "JUDI";
    var body = String(hashSeed(seed)).padStart(9, "0").slice(-9);
    var twelve = "628" + body;
    return twelve + String(ean13Checksum(twelve));
  }

  var ARABIC_SCRIPT_MAP = {
    ا: "A", أ: "A", إ: "E", آ: "A", ء: "", ب: "B", پ: "P", ت: "T", ث: "TH",
    ج: "J", چ: "CH", ح: "H", خ: "KH", د: "D", ذ: "DH", ر: "R", ڕ: "R", ز: "Z",
    ژ: "ZH", س: "S", ش: "SH", ص: "S", ض: "D", ط: "T", ظ: "Z", ع: "A", غ: "GH",
    ف: "F", ڤ: "V", ق: "Q", ك: "K", ک: "K", گ: "G", ل: "L", ڵ: "L", م: "M",
    ن: "N", ه: "H", ھ: "H", ة: "A", و: "W", ۆ: "O", ۇ: "U", ی: "Y", ي: "Y",
    ێ: "E", ە: "E", ى: "Y", ئ: "",
  };

  function transliterateArabicScript(text) {
    var out = "";
    for (var i = 0; i < text.length; i += 1) {
      var ch = text[i];
      if (Object.prototype.hasOwnProperty.call(ARABIC_SCRIPT_MAP, ch)) {
        out += ARABIC_SCRIPT_MAP[ch];
      } else if (/[A-Za-z0-9]/.test(ch)) {
        out += ch.toUpperCase();
      } else if (/\s|[-_/.,]/.test(ch)) {
        out += "-";
      }
    }
    return out;
  }

  function toSkuSlug(text) {
    return text
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function generateSkuFromName(name) {
    var trimmed = (name || "").trim();
    if (!trimmed) return "PRD-" + String(Date.now()).slice(-6);

    var latinDirect = toSkuSlug(
      trimmed.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    );
    var fromScript = toSkuSlug(transliterateArabicScript(trimmed));
    var latin =
      latinDirect.length >= 2 && /[A-Z]/.test(latinDirect)
        ? latinDirect
        : fromScript;

    if (latin.length >= 2 && /[A-Z]/.test(latin)) return latin.slice(0, 28);

    var digits = (trimmed.match(/\d+/g) || []).join("-");
    var suffix = hashSeed(trimmed).toString(36).toUpperCase().slice(0, 4);
    if (digits) return ("PRD-" + digits + "-" + suffix).slice(0, 28);
    return ("PRD-" + suffix + "-" + String(Date.now()).slice(-4)).slice(0, 28);
  }

  /**
   * While typing: spaces become x between numbers.
   * Keeps a trailing x so "6 " → "6x" stays until the next number.
   */
  function autoFormatPackSpec(raw) {
    var value = String(raw || "");

    // Promo like 20+1
    if (value.indexOf("+") !== -1) {
      return value
        .replace(/[^\d+\s]/g, "")
        .replace(/\s+/g, "")
        .replace(/\++/g, "+");
    }

    value = value
      .replace(/[×✕✖\*\/,\-]/g, "x")
      .replace(/[^\dx\s]/gi, "")
      .replace(/\s+/g, "x")
      .replace(/x{2,}/gi, "x")
      .replace(/^x+/gi, "")
      .toLowerCase();

    return value;
  }

  function parsePackSpec(spec) {
    var raw = String(spec || "").trim().toLowerCase();

    if (!raw) {
      return { piecesPacket: 1, packetsInCarton: 1, piecesCarton: 1, spec: "" };
    }

    if (raw.indexOf("+") !== -1) {
      var promo = raw.match(/(\d+)\s*\+\s*(\d+)/);
      var base = promo ? parseInt(promo[1], 10) : 1;
      return {
        piecesPacket: base || 1,
        packetsInCarton: 1,
        piecesCarton: base || 1,
        spec: raw.replace(/\s+/g, ""),
      };
    }

    var parts = raw
      .replace(/x+$/g, "")
      .split("x")
      .map(function (p) {
        return parseInt(String(p).replace(/\D/g, ""), 10);
      })
      .filter(function (n) {
        return n && n > 0;
      });

    if (parts.length === 0) {
      return { piecesPacket: 1, packetsInCarton: 1, piecesCarton: 1, spec: raw };
    }

    if (parts.length === 1) {
      return {
        piecesPacket: parts[0],
        packetsInCarton: 1,
        piecesCarton: parts[0],
        spec: String(parts[0]),
      };
    }

    var piecesPacket = parts[0];
    var packetsInCarton = parts[1];
    var piecesCarton = piecesPacket * packetsInCarton;
    if (parts.length >= 3 && parts[2] > 1) {
      piecesCarton = piecesPacket * packetsInCarton * parts[2];
    }

    return {
      piecesPacket: piecesPacket,
      packetsInCarton: packetsInCarton,
      piecesCarton: piecesCarton,
      spec: parts.slice(0, 3).join("x"),
    };
  }

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function initPackSpec(form) {
    var input = qs("[data-pack-spec]", form);
    if (!input) return;

    var livePacket = qs("[data-live-packet]", form);
    var livePackets = qs("[data-live-packets]", form);
    var liveCarton = qs("[data-live-carton]", form);
    var hiddenPacket = qs("[data-pieces-packet]", form);
    var hiddenCarton = qs("[data-pieces-carton]", form);

    function refresh() {
      var parsed = parsePackSpec(input.value);
      if (livePacket) livePacket.textContent = String(parsed.piecesPacket);
      if (livePackets) livePackets.textContent = String(parsed.packetsInCarton);
      if (liveCarton) liveCarton.textContent = String(parsed.piecesCarton);
      if (hiddenPacket) hiddenPacket.value = String(parsed.piecesPacket);
      if (hiddenCarton) hiddenCarton.value = String(parsed.piecesCarton);
    }

    function setValue(next, caret) {
      input.value = next;
      if (typeof caret === "number") {
        try {
          input.setSelectionRange(caret, caret);
        } catch (e) {}
      }
      refresh();
    }

    input.addEventListener("keydown", function (event) {
      if (event.key !== " " && event.code !== "Space" && event.key !== "Spacebar") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      var start = input.selectionStart == null ? input.value.length : input.selectionStart;
      var end = input.selectionEnd == null ? start : input.selectionEnd;
      var before = input.value.slice(0, start).replace(/\s+$/g, "");
      var after = input.value.slice(end).replace(/^\s+/g, "");

      // Need a number before inserting x
      if (!/\d$/.test(before)) {
        return;
      }

      // Already have x at the join point
      if (/x$/i.test(before) || /^x/i.test(after)) {
        setValue(before + after, before.length);
        return;
      }

      var next = before + "x" + after;
      setValue(next, before.length + 1);
    });

    input.addEventListener("input", function () {
      var caret = input.selectionStart == null ? input.value.length : input.selectionStart;
      var before = input.value;
      var formatted = autoFormatPackSpec(before);
      if (formatted !== before) {
        var delta = formatted.length - before.length;
        setValue(formatted, Math.max(0, caret + delta));
        return;
      }
      refresh();
    });

    input.addEventListener("blur", function () {
      // On leave, drop a dangling trailing x
      var cleaned = input.value.replace(/x+$/i, "");
      if (cleaned !== input.value) {
        setValue(cleaned, cleaned.length);
      }
    });

    refresh();
  }

  function initBarcodePreview(form) {
    var panel = qs("[data-barcode-preview]");
    if (!panel) return;

    var selectedKey = "product";
    var svg = qs("[data-preview-svg]", panel);
    var empty = qs("[data-preview-empty]", panel);
    var codeEl = qs("[data-preview-code]", panel);
    var nameEl = qs("[data-preview-name]", panel);
    var skuEl = qs("[data-preview-sku]", panel);
    var unitEl = qs("[data-preview-unit]", panel);
    var printBtn = qs("[data-print-label]", panel);

    function barcodeInputFor(key) {
      if (key === "product") return qs("#product-barcode", form);
      return qs("#unit-barcode-" + key, form);
    }

    function currentCode() {
      var input = barcodeInputFor(selectedKey);
      return input ? String(input.value || "").trim() : "";
    }

    function renderBarcode() {
      var name = (qs("#product-name", form) || {}).value || "—";
      var sku = (qs("#product-sku", form) || {}).value || "—";
      var code = currentCode();
      var draw = typeof JsBarcode === "function" ? JsBarcode : window.JsBarcode;

      if (nameEl) nameEl.textContent = name || "—";
      if (skuEl) skuEl.textContent = sku || "—";
      if (unitEl) unitEl.textContent = selectedKey === "product" ? "" : selectedKey;
      if (codeEl) codeEl.textContent = code || "";

      if (!svg) return;

      if (!code) {
        svg.replaceChildren();
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        svg.setAttribute("hidden", "");
        if (empty) empty.hidden = false;
        if (printBtn) printBtn.disabled = true;
        return;
      }

      if (empty) empty.hidden = true;
      // Must be unhidden before JsBarcode measures the SVG
      svg.removeAttribute("hidden");
      if (printBtn) printBtn.disabled = false;

      if (typeof draw !== "function") {
        if (codeEl) codeEl.textContent = code;
        return;
      }

      try {
        draw(svg, code, {
          format: /^\d{13}$/.test(code) ? "EAN13" : "CODE128",
          width: 2,
          height: 56,
          displayValue: false,
          fontSize: 14,
          margin: 8,
          background: "#ffffff",
          lineColor: "#000000",
        });
      } catch (err1) {
        try {
          draw(svg, code, {
            format: "CODE128",
            width: 2,
            height: 56,
            displayValue: false,
            fontSize: 14,
            margin: 8,
            background: "#ffffff",
            lineColor: "#000000",
          });
        } catch (err2) {
          svg.replaceChildren();
          svg.setAttribute("hidden", "");
          if (codeEl) codeEl.textContent = code + " ✕";
          return;
        }
      }

      // JsBarcode rewrites style=; keep visible without relying on inline display
      svg.removeAttribute("hidden");
      svg.style.maxWidth = "100%";
      svg.style.height = "auto";
    }

    function selectKey(key) {
      selectedKey = key;
      qsa("[data-preview-select]", panel).forEach(function (chip) {
        var active = chip.getAttribute("data-preview-select") === key;
        chip.classList.toggle("is-active", active);
        chip.setAttribute("aria-selected", active ? "true" : "false");
      });
      renderBarcode();
    }

    panel.addEventListener("click", function (event) {
      var chip = event.target.closest("[data-preview-select]");
      if (chip) {
        event.preventDefault();
        selectKey(chip.getAttribute("data-preview-select"));
        return;
      }

      if (event.target.closest("[data-preview-generate]")) {
        event.preventDefault();
        var skuInput = qs("#product-sku", form);
        var nameInput = qs("#product-name", form);
        if (skuInput && !skuInput.value.trim() && nameInput && nameInput.value.trim()) {
          skuInput.value = generateSkuFromName(nameInput.value);
        }
        var baseSku = skuInput && skuInput.value.trim() ? skuInput.value.trim() : "JUDI";
        var seed =
          selectedKey === "product"
            ? baseSku
            : baseSku + "-" + selectedKey.toUpperCase();
        var target = barcodeInputFor(selectedKey);
        if (target) {
          target.value = generateEan13FromSku(seed);
          target.dispatchEvent(new Event("input", { bubbles: true }));
        }
        renderBarcode();
        return;
      }

      if (event.target.closest("[data-print-label]")) {
        event.preventDefault();
        printLabel();
      }
    });

    function printLabel() {
      var code = currentCode();
      if (!code || typeof JsBarcode !== "function") return;

      var name = (qs("#product-name", form) || {}).value || "Product";
      var sku = (qs("#product-sku", form) || {}).value || "—";
      var tmp = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      try {
        JsBarcode(tmp, code, {
          format: /^\d{13}$/.test(code) ? "EAN13" : "CODE128",
          width: 1.6,
          height: 48,
          displayValue: true,
          fontSize: 12,
          margin: 4,
          background: "#ffffff",
          lineColor: "#000000",
        });
      } catch (e) {
        JsBarcode(tmp, code, {
          format: "CODE128",
          width: 1.6,
          height: 48,
          displayValue: true,
          fontSize: 12,
          margin: 4,
          background: "#ffffff",
          lineColor: "#000000",
        });
      }

      function escapeHtml(text) {
        return String(text)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      }

      var html =
        "<!DOCTYPE html><html><head><meta charset='utf-8'><title>" +
        escapeHtml(sku) +
        "</title><style>@page{size:50mm 30mm;margin:0}body{margin:0;width:50mm;height:30mm;font-family:Arial,sans-serif;text-align:center;padding:1.5mm 2mm;box-sizing:border-box}.name{font-size:9px;font-weight:700;margin:0}.sku{font-size:8px;font-family:monospace;margin:1px 0 0}svg{display:block;margin:1mm auto 0;max-width:46mm}</style></head><body><p class='name'>" +
        escapeHtml(name) +
        "</p><p class='sku'>" +
        escapeHtml(sku) +
        "</p>" +
        tmp.outerHTML +
        "</body></html>";

      var blob = new Blob([html], { type: "text/html;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var popup = window.open(url, "_blank", "width=420,height=320");
      if (!popup) {
        URL.revokeObjectURL(url);
        return;
      }
      setTimeout(function () {
        try {
          popup.focus();
          popup.print();
        } catch (err) {}
        setTimeout(function () {
          URL.revokeObjectURL(url);
        }, 60000);
      }, 250);
    }

    form.addEventListener("input", function (event) {
      if (event.target.matches("[data-sync-preview]")) renderBarcode();
    });

    function whenJsBarcodeReady(fn) {
      if (typeof JsBarcode === "function") {
        fn();
        return;
      }
      var tries = 0;
      var timer = setInterval(function () {
        tries += 1;
        if (typeof JsBarcode === "function" || tries > 50) {
          clearInterval(timer);
          fn();
        }
      }, 50);
    }

    whenJsBarcodeReady(renderBarcode);

    // Keep a public hook so generate buttons can force a redraw
    form._judiRenderBarcode = renderBarcode;
    form._judiSelectPreview = selectKey;
  }

  function init() {
    var form = qs("[data-product-form]");
    if (!form) return;

    var nameInput = qs("#product-name", form);
    var skuInput = qs("#product-sku", form);

    initPackSpec(form);
    initBarcodePreview(form);

    form.addEventListener("click", function (event) {
      var skuBtn = event.target.closest("[data-generate-sku]");
      if (skuBtn) {
        event.preventDefault();
        if (!nameInput || !skuInput) return;
        skuInput.value = generateSkuFromName(nameInput.value);
        skuInput.dispatchEvent(new Event("input", { bubbles: true }));
        skuInput.focus();
        return;
      }

      var barBtn = event.target.closest("[data-generate-barcode]");
      if (barBtn) {
        event.preventDefault();
        var target = qs(barBtn.getAttribute("data-target"), form);
        var skuSource = qs(barBtn.getAttribute("data-sku-source"), form);
        if (!target) return;
        var baseSku =
          skuSource && skuSource.value.trim() ? skuSource.value.trim() : "JUDI";
        var suffix = barBtn.getAttribute("data-unit-suffix");
        var seed = suffix ? baseSku + "-" + suffix.toUpperCase() : baseSku;
        target.value = generateEan13FromSku(seed);
        target.dispatchEvent(new Event("input", { bubbles: true }));

        var previewKey = target.getAttribute("data-preview-key") || "product";
        if (typeof form._judiSelectPreview === "function") {
          form._judiSelectPreview(previewKey);
        } else if (typeof form._judiRenderBarcode === "function") {
          form._judiRenderBarcode();
        }

        // Scroll preview into view on phones
        var panel = qs("[data-barcode-preview]");
        if (panel && window.matchMedia("(max-width: 1099px)").matches) {
          panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }

        target.focus();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
