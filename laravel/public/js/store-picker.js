(function () {
  "use strict";

  var root = document.querySelector("[data-store-picker]");
  if (!root) return;

  var cfg = window.JudiStorePick || {};
  var labels = cfg.labels || {};
  var modeBtns = Array.prototype.slice.call(
    root.querySelectorAll("[data-store-mode]")
  );
  var statusEl = root.querySelector("[data-store-pick-status]");
  var options = Array.prototype.slice.call(
    root.querySelectorAll("[data-store-option]")
  );

  var mode = "list";
  var userPos = null;

  function setStatus(text, show) {
    if (!statusEl) return;
    if (!show || !text) {
      statusEl.hidden = true;
      statusEl.textContent = "";
      return;
    }
    statusEl.hidden = false;
    statusEl.textContent = text;
  }

  function parseCoord(value) {
    if (value === null || value === undefined || value === "") return null;
    var n = parseFloat(String(value));
    return Number.isFinite(n) ? n : null;
  }

  function haversineKm(aLat, aLng, bLat, bLng) {
    var toRad = Math.PI / 180;
    var dLat = (bLat - aLat) * toRad;
    var dLng = (bLng - aLng) * toRad;
    var lat1 = aLat * toRad;
    var lat2 = bLat * toRad;
    var h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function kmLabel(km) {
    var template = labels.km || ":km km";
    var rounded = km < 10 ? km.toFixed(1) : Math.round(km).toString();
    return template.replace(":km", rounded);
  }

  function clearDistances() {
    options.forEach(function (opt) {
      opt.style.order = "";
      var dist = opt.querySelector("[data-store-dist]");
      if (dist) {
        dist.hidden = true;
        dist.textContent = "";
      }
    });
  }

  function applyNearSort() {
    if (!userPos) return;
    var ranked = [];
    options.forEach(function (opt) {
      var lat = parseCoord(opt.getAttribute("data-lat"));
      var lng = parseCoord(opt.getAttribute("data-lng"));
      var distEl = opt.querySelector("[data-store-dist]");
      if (lat === null || lng === null) {
        opt.style.order = "9999";
        opt.hidden = mode === "near";
        if (distEl) {
          distEl.hidden = true;
          distEl.textContent = "";
        }
        return;
      }
      var km = haversineKm(userPos.lat, userPos.lng, lat, lng);
      opt.hidden = false;
      opt.style.order = String(Math.round(km * 1000));
      if (distEl) {
        distEl.hidden = false;
        distEl.textContent = kmLabel(km);
      }
      ranked.push(opt);
    });
    if (!ranked.length) {
      setStatus(labels.none || "No stores nearby", true);
    } else {
      setStatus("", false);
    }
  }

  function requestLocation(then) {
    if (!navigator.geolocation) {
      setStatus(labels.denied || "Location denied", true);
      return;
    }
    setStatus(labels.locating || "Locating…", true);
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        userPos = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setStatus("", false);
        if (typeof then === "function") then();
      },
      function () {
        setStatus(labels.denied || "Location denied", true);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  }

  function setMode(next) {
    mode = next === "near" ? "near" : "list";
    root.setAttribute("data-pick-mode", mode);
    modeBtns.forEach(function (btn) {
      var active = btn.getAttribute("data-store-mode") === mode;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });

    if (mode === "list") {
      clearDistances();
      options.forEach(function (opt) {
        opt.hidden = false;
        opt.style.order = "";
      });
      setStatus("", false);
      var filter = root.querySelector("[data-store-filter]");
      if (filter) filter.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }

    clearDistances();
    if (userPos) {
      applyNearSort();
    } else {
      requestLocation(applyNearSort);
    }
  }

  modeBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setMode(btn.getAttribute("data-store-mode") || "list");
    });
  });
})();
