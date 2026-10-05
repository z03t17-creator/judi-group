(function (global) {
  "use strict";

  var active = null;
  var FALLBACK_LOADING = null;

  function fallbackScriptSrc() {
    if (global.JudiBarcodeScannerFallbackSrc) {
      return global.JudiBarcodeScannerFallbackSrc;
    }
    var self = document.querySelector('script[src*="barcode-scanner"]');
    if (self && self.src) {
      return self.src.replace(
        /barcode-scanner[^/?#]*/,
        "vendor/html5-qrcode.min.js"
      );
    }
    return "/js/vendor/html5-qrcode.min.js";
  }

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function resolveHtml5Qrcode() {
    if (typeof global.Html5Qrcode === "function") {
      return global.Html5Qrcode;
    }
    if (
      global.__Html5QrcodeLibrary__ &&
      typeof global.__Html5QrcodeLibrary__.Html5Qrcode === "function"
    ) {
      global.Html5Qrcode = global.__Html5QrcodeLibrary__.Html5Qrcode;
      return global.Html5Qrcode;
    }
    return null;
  }

  function loadFallback() {
    var ready = resolveHtml5Qrcode();
    if (ready) {
      return Promise.resolve(ready);
    }
    if (FALLBACK_LOADING) return FALLBACK_LOADING;

    FALLBACK_LOADING = new Promise(function (resolve, reject) {
      function finish() {
        var ctor = resolveHtml5Qrcode();
        if (ctor) resolve(ctor);
        else reject(new Error("Html5Qrcode missing"));
      }

      var existing = document.querySelector('script[data-html5-qrcode]');
      if (existing) {
        existing.addEventListener("load", finish);
        existing.addEventListener("error", reject);
        // Already loaded before listeners
        if (resolveHtml5Qrcode()) finish();
        return;
      }
      var script = document.createElement("script");
      script.src = fallbackScriptSrc();
      script.async = true;
      script.setAttribute("data-html5-qrcode", "1");
      script.onload = finish;
      script.onerror = reject;
      document.head.appendChild(script);
    });

    return FALLBACK_LOADING;
  }

  function supportsCamera() {
    return !!(
      global.navigator &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function"
    );
  }

  function supportsBarcodeDetector() {
    return typeof global.BarcodeDetector === "function";
  }

  function stopTracks(stream) {
    if (!stream) return;
    stream.getTracks().forEach(function (track) {
      try {
        track.stop();
      } catch (e) {}
    });
  }

  function buildOverlay(labels) {
    var root = document.createElement("div");
    root.className = "barcode-scan-overlay";
    root.setAttribute("data-barcode-scan-overlay", "");
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute(
      "aria-label",
      labels.scanTitle || "Scan barcode"
    );

    root.innerHTML =
      '<div class="barcode-scan-overlay__shade"></div>' +
      '<div class="barcode-scan-overlay__panel">' +
      '<button type="button" class="barcode-scan-overlay__close" data-scan-close aria-label="' +
      escapeAttr(labels.close || "Close") +
      '">×</button>' +
      '<div class="barcode-scan-overlay__stage">' +
      '<video class="barcode-scan-overlay__video" data-scan-video playsinline muted autoplay></video>' +
      '<div class="barcode-scan-overlay__reader" data-scan-reader hidden></div>' +
      '<div class="barcode-scan-overlay__frame" aria-hidden="true">' +
      '<span class="barcode-scan-overlay__corner barcode-scan-overlay__corner--tl"></span>' +
      '<span class="barcode-scan-overlay__corner barcode-scan-overlay__corner--tr"></span>' +
      '<span class="barcode-scan-overlay__corner barcode-scan-overlay__corner--bl"></span>' +
      '<span class="barcode-scan-overlay__corner barcode-scan-overlay__corner--br"></span>' +
      '<span class="barcode-scan-overlay__laser"></span>' +
      "</div>" +
      "</div>" +
      '<p class="barcode-scan-overlay__hint" data-scan-hint>' +
      escapeHtml(labels.scanHint || "Place the code inside the frame") +
      "</p>" +
      "</div>";

    return root;
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

  function setHint(session, text) {
    if (session && session.hintEl) {
      session.hintEl.textContent = text;
    }
  }

  function closeSession() {
    var session = active;
    active = null;
    if (!session) return;

    if (session.raf) {
      cancelAnimationFrame(session.raf);
      session.raf = 0;
    }

    if (session.html5) {
      try {
        session.html5
          .stop()
          .catch(function () {})
          .finally(function () {
            try {
              session.html5.clear();
            } catch (e) {}
          });
      } catch (e) {}
      session.html5 = null;
    }

    stopTracks(session.stream);
    session.stream = null;

    if (session.overlay && session.overlay.parentNode) {
      session.overlay.parentNode.removeChild(session.overlay);
    }

    document.documentElement.classList.remove("is-barcode-scanning");

    if (typeof session.onClose === "function") {
      try {
        session.onClose();
      } catch (e) {}
    }
  }

  function handleCode(session, raw) {
    var code = String(raw || "").trim();
    if (!code || session.handled) return;
    session.handled = true;
    var cb = session.onDetected;
    closeSession();
    if (typeof cb === "function") {
      cb(code);
    }
  }

  function startBarcodeDetector(session) {
    var video = session.video;
    var formats = [
      "ean_13",
      "ean_8",
      "upc_a",
      "upc_e",
      "code_128",
      "code_39",
      "qr_code",
      "itf",
    ];

    var detector;
    try {
      detector = new global.BarcodeDetector({ formats: formats });
    } catch (e) {
      detector = new global.BarcodeDetector();
    }

    return navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      .then(function (stream) {
        if (active !== session) {
          stopTracks(stream);
          return;
        }
        session.stream = stream;
        video.hidden = false;
        session.readerEl.hidden = true;
        video.srcObject = stream;
        return video.play().catch(function () {});
      })
      .then(function () {
        if (active !== session) return;

        function tick() {
          if (active !== session || session.handled) return;
          if (video.readyState >= 2) {
            detector
              .detect(video)
              .then(function (codes) {
                if (active !== session || session.handled) return;
                if (codes && codes.length && codes[0].rawValue) {
                  handleCode(session, codes[0].rawValue);
                  return;
                }
                session.raf = requestAnimationFrame(tick);
              })
              .catch(function () {
                if (active === session && !session.handled) {
                  session.raf = requestAnimationFrame(tick);
                }
              });
            return;
          }
          session.raf = requestAnimationFrame(tick);
        }

        session.raf = requestAnimationFrame(tick);
      });
  }

  function startHtml5Qrcode(session) {
    return loadFallback().then(function (Html5Qrcode) {
      if (active !== session) return;

      videoHide(session);
      session.readerEl.hidden = false;
      session.readerEl.innerHTML = "";

      var scanner = new Html5Qrcode(session.readerEl.id, {
        verbose: false,
      });
      session.html5 = scanner;

      var config = {
        fps: 10,
        qrbox: function (viewfinderWidth, viewfinderHeight) {
          var edge = Math.floor(
            Math.min(viewfinderWidth, viewfinderHeight) * 0.72
          );
          return { width: edge, height: Math.floor(edge * 0.55) };
        },
        aspectRatio: 1.333,
      };

      return scanner
        .start(
          { facingMode: "environment" },
          config,
          function (decoded) {
            handleCode(session, decoded);
          },
          function () {}
        )
        .catch(function () {
          return scanner.start(
            { facingMode: "user" },
            config,
            function (decoded) {
              handleCode(session, decoded);
            },
            function () {}
          );
        });
    });
  }

  function videoHide(session) {
    if (session.video) {
      session.video.hidden = true;
      session.video.removeAttribute("src");
      session.video.srcObject = null;
    }
  }

  function open(options) {
    options = options || {};
    if (active) closeSession();

    if (!supportsCamera()) {
      if (typeof options.onUnsupported === "function") {
        options.onUnsupported();
      }
      return Promise.resolve(false);
    }

    var labels = options.labels || {};
    var overlay = buildOverlay(labels);
    var readerEl = qs("[data-scan-reader]", overlay);
    readerEl.id =
      "judi-barcode-reader-" + String(Date.now()) + Math.floor(Math.random() * 1000);

    var session = {
      overlay: overlay,
      video: qs("[data-scan-video]", overlay),
      readerEl: readerEl,
      hintEl: qs("[data-scan-hint]", overlay),
      stream: null,
      html5: null,
      raf: 0,
      handled: false,
      onDetected: options.onDetected,
      onClose: options.onClose,
    };

    active = session;
    document.body.appendChild(overlay);
    document.documentElement.classList.add("is-barcode-scanning");

    qs("[data-scan-close]", overlay).addEventListener("click", function () {
      closeSession();
    });

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay || event.target.classList.contains("barcode-scan-overlay__shade")) {
        closeSession();
      }
    });

    var starter = supportsBarcodeDetector()
      ? startBarcodeDetector(session).catch(function () {
          return startHtml5Qrcode(session);
        })
      : startHtml5Qrcode(session);

    return starter.catch(function () {
      setHint(
        session,
        labels.scanCameraError || "Camera could not start."
      );
      if (typeof options.onUnsupported === "function") {
        options.onUnsupported();
      }
      window.setTimeout(closeSession, 1600);
      return false;
    });
  }

  global.JudiBarcodeScanner = {
    open: open,
    close: closeSession,
    isSupported: supportsCamera,
  };
})(window);
