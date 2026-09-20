(function () {
  "use strict";

  var root = document.querySelector("[data-store-map]");
  if (!root) return;

  var latInput = root.querySelector("[data-map-lat]");
  var lngInput = root.querySelector("[data-map-lng]");
  var canvas = root.querySelector("[data-map-canvas]");
  var gpsBtn = root.querySelector("[data-map-gps]");
  var clearBtn = root.querySelector("[data-map-clear]");
  var apiKey = (root.getAttribute("data-maps-key") || "").trim();
  var defaultLat = parseFloat(root.getAttribute("data-default-lat")) || 35.5558;
  var defaultLng = parseFloat(root.getAttribute("data-default-lng")) || 45.4351;
  var defaultZoom = parseInt(root.getAttribute("data-default-zoom"), 10) || 12;

  var engine = null; // "google" | "leaflet"
  var map = null;
  var marker = null;

  function parseCoord(value) {
    if (value === null || value === undefined || value === "") return null;
    var n = parseFloat(String(value).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  function currentPosition() {
    var lat = parseCoord(latInput && latInput.value);
    var lng = parseCoord(lngInput && lngInput.value);
    if (lat === null || lng === null) return null;
    return { lat: lat, lng: lng };
  }

  function writeCoords(lat, lng) {
    if (latInput) latInput.value = lat === null ? "" : Number(lat).toFixed(7);
    if (lngInput) lngInput.value = lng === null ? "" : Number(lng).toFixed(7);
  }

  function setMarker(lat, lng) {
    if (!map) return;
    var la = Number(lat);
    var ln = Number(lng);

    if (engine === "google") {
      var pos = { lat: la, lng: ln };
      if (!marker) {
        marker = new google.maps.Marker({
          map: map,
          position: pos,
          draggable: true,
        });
        marker.addListener("dragend", function () {
          var p = marker.getPosition();
          if (!p) return;
          writeCoords(p.lat(), p.lng());
        });
      } else {
        marker.setPosition(pos);
        marker.setMap(map);
      }
      map.panTo(pos);
      return;
    }

    if (engine === "leaflet" && window.L) {
      var ll = [la, ln];
      if (!marker) {
        marker = L.marker(ll, { draggable: true }).addTo(map);
        marker.on("dragend", function () {
          var p = marker.getLatLng();
          writeCoords(p.lat, p.lng);
        });
      } else {
        marker.setLatLng(ll);
      }
      map.setView(ll, Math.max(map.getZoom(), 15));
    }
  }

  function clearMarker() {
    writeCoords(null, null);
    if (!marker) return;
    if (engine === "google") {
      marker.setMap(null);
    } else if (engine === "leaflet" && map) {
      map.removeLayer(marker);
    }
    marker = null;
  }

  function initGoogle() {
    if (!canvas || !window.google || !window.google.maps) return false;
    if (map) return true;

    var existing = currentPosition();
    var center = existing || { lat: defaultLat, lng: defaultLng };

    engine = "google";
    map = new google.maps.Map(canvas, {
      center: center,
      zoom: existing ? Math.max(defaultZoom, 15) : defaultZoom,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    map.addListener("click", function (event) {
      if (!event.latLng) return;
      writeCoords(event.latLng.lat(), event.latLng.lng());
      setMarker(event.latLng.lat(), event.latLng.lng());
    });

    if (existing) setMarker(existing.lat, existing.lng);
    return true;
  }

  function initLeaflet() {
    if (!canvas || !window.L) return false;
    if (map) return true;

    var existing = currentPosition();
    var center = existing
      ? [existing.lat, existing.lng]
      : [defaultLat, defaultLng];

    engine = "leaflet";
    map = L.map(canvas, { scrollWheelZoom: true }).setView(
      center,
      existing ? Math.max(defaultZoom, 15) : defaultZoom
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    map.on("click", function (event) {
      writeCoords(event.latlng.lat, event.latlng.lng);
      setMarker(event.latlng.lat, event.latlng.lng);
    });

    if (existing) setMarker(existing.lat, existing.lng);

    // Leaflet needs a size refresh when the container was hidden/empty
    setTimeout(function () {
      map.invalidateSize();
    }, 80);

    return true;
  }

  function boot() {
    if (apiKey && window.google && window.google.maps) {
      initGoogle();
      return;
    }
    initLeaflet();
  }

  function useGps() {
    if (!navigator.geolocation) {
      window.alert("GPS not available");
      return;
    }
    if (gpsBtn) gpsBtn.disabled = true;
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        var lat = pos.coords.latitude;
        var lng = pos.coords.longitude;
        writeCoords(lat, lng);
        if (map) {
          setMarker(lat, lng);
          if (engine === "google") {
            map.setZoom(Math.max(defaultZoom, 16));
          } else if (engine === "leaflet") {
            map.setZoom(Math.max(defaultZoom, 16));
          }
        }
        if (gpsBtn) gpsBtn.disabled = false;
      },
      function () {
        if (gpsBtn) gpsBtn.disabled = false;
        window.alert("Location permission denied");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  function onInputChange() {
    var pos = currentPosition();
    if (!pos) {
      clearMarker();
      writeCoords(null, null);
      return;
    }
    if (map) setMarker(pos.lat, pos.lng);
  }

  if (gpsBtn) gpsBtn.addEventListener("click", useGps);
  if (clearBtn) clearBtn.addEventListener("click", clearMarker);
  if (latInput) latInput.addEventListener("change", onInputChange);
  if (lngInput) lngInput.addEventListener("change", onInputChange);

  window.judiStoreMapInit = function () {
    initGoogle();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
