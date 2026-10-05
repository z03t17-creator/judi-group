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

  function init() {
    var form = qs("[data-product-form]");
    if (!form) return;

    var nameInput = qs("#product-name", form);
    var skuInput = qs("#product-sku", form);

    initPackSpec(form);

    form.addEventListener("click", function (event) {
      var skuBtn = event.target.closest("[data-generate-sku]");
      if (skuBtn) {
        event.preventDefault();
        if (!nameInput || !skuInput) return;
        skuInput.value = generateSkuFromName(nameInput.value);
        skuInput.dispatchEvent(new Event("input", { bubbles: true }));
        skuInput.focus();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
