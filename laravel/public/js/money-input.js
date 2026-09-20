(function () {
  "use strict";

  function significantCaretIndex(value, caret) {
    return String(value || "")
      .slice(0, caret)
      .replace(/[^\d.]/g, "").length;
  }

  function caretFromSignificantIndex(formatted, index) {
    if (index <= 0) return 0;
    var seen = 0;
    for (var i = 0; i < formatted.length; i++) {
      if (/[\d.]/.test(formatted.charAt(i))) {
        seen += 1;
        if (seen === index) return i + 1;
      }
    }
    return formatted.length;
  }

  function decimalsFor(el) {
    var n = parseInt(el.getAttribute("data-decimals") || "0", 10);
    return isNaN(n) || n < 0 ? 0 : n;
  }

  function normalizeTyped(value, fractionDigits) {
    var typed = String(value || "").replace(/[^\d.]/g, "");
    var firstDot = typed.indexOf(".");
    if (firstDot !== -1) {
      typed =
        typed.slice(0, firstDot + 1) +
        typed.slice(firstDot + 1).replace(/\./g, "");
    }
    if (fractionDigits <= 0) {
      return typed.replace(/\./g, "");
    }
    if (typed.indexOf(".") !== -1) {
      var parts = typed.split(".");
      return parts[0] + "." + (parts[1] || "").slice(0, fractionDigits);
    }
    return typed;
  }

  function formatLive(raw, fractionDigits) {
    if (!raw) return "";
    var keepTrailingDot = fractionDigits > 0 && raw.endsWith(".");
    var body = keepTrailingDot ? raw.slice(0, -1) : raw;
    var cleaned = body.replace(/[^\d.]/g, "");
    if (!cleaned && !keepTrailingDot) return "";

    var split = cleaned.split(".");
    var intDigits = (split[0] || "").replace(/\D/g, "");
    var decRaw = split[1] || "";
    var intFormatted = (
      intDigits ||
      (keepTrailingDot || cleaned.indexOf(".") !== -1 ? "0" : "")
    ).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    if (fractionDigits <= 0) return intFormatted;

    if (keepTrailingDot && cleaned.indexOf(".") === -1) {
      return intFormatted + ".";
    }
    if (cleaned.indexOf(".") !== -1) {
      return intFormatted + "." + decRaw.slice(0, fractionDigits);
    }
    return intFormatted;
  }

  function rawFromDisplay(value) {
    return String(value || "").replace(/,/g, "");
  }

  function bindMoneyInput(el) {
    if (el._judiMoneyBound) return;
    el._judiMoneyBound = true;

    var fractionDigits = decimalsFor(el);
    // type=number cannot show commas
    if (el.type === "number") {
      el.type = "text";
    }
    el.setAttribute("inputmode", fractionDigits > 0 ? "decimal" : "numeric");
    el.setAttribute("autocomplete", "off");

    // Format initial value
    var initial = normalizeTyped(rawFromDisplay(el.value), fractionDigits);
    el.value = formatLive(initial, fractionDigits);
    el.dataset.rawValue = initial;

    el.addEventListener("input", function () {
      var caret = el.selectionStart == null ? el.value.length : el.selectionStart;
      var sig = significantCaretIndex(el.value, caret);
      var raw = normalizeTyped(el.value, fractionDigits);
      var formatted = formatLive(raw, fractionDigits);
      el.value = formatted;
      el.dataset.rawValue = raw;
      try {
        var nextCaret = caretFromSignificantIndex(formatted, sig);
        el.setSelectionRange(nextCaret, nextCaret);
      } catch (e) {}
    });

    el.addEventListener("blur", function () {
      var raw = normalizeTyped(rawFromDisplay(el.value), fractionDigits);
      // Drop trailing lone dot
      if (raw.endsWith(".")) raw = raw.slice(0, -1);
      el.dataset.rawValue = raw;
      el.value = formatLive(raw, fractionDigits);
    });

    el.addEventListener("focus", function () {
      // Keep commas while editing — already live-formatted
    });
  }

  function stripBeforeSubmit(form) {
    form.querySelectorAll("[data-money]").forEach(function (el) {
      var raw =
        el.dataset.rawValue != null
          ? el.dataset.rawValue
          : rawFromDisplay(el.value);
      raw = normalizeTyped(raw, decimalsFor(el));
      if (raw.endsWith(".")) raw = raw.slice(0, -1);
      el.value = raw || "0";
    });
  }

  function init(root) {
    var scope = root || document;
    scope.querySelectorAll("[data-money]").forEach(bindMoneyInput);

    scope.querySelectorAll("form").forEach(function (form) {
      if (form._judiMoneySubmit) return;
      if (!form.querySelector("[data-money]")) return;
      form._judiMoneySubmit = true;
      form.addEventListener("submit", function () {
        stripBeforeSubmit(form);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      init(document);
    });
  } else {
    init(document);
  }

  window.JudiMoney = { init: init, formatLive: formatLive };
})();
