(function () {
  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function formatElapsed(ms) {
    var total = Math.max(0, Math.floor(ms / 1000));
    var h = Math.floor(total / 3600);
    var m = Math.floor((total % 3600) / 60);
    var s = total % 60;
    return pad(h) + ":" + pad(m) + ":" + pad(s);
  }

  function tick() {
    var nodes = document.querySelectorAll("[data-visit-timer]");
    if (!nodes.length) return;
    var now = Date.now();
    nodes.forEach(function (el) {
      var started = el.getAttribute("data-started-at");
      if (!started) return;
      var t = Date.parse(started);
      if (!Number.isFinite(t)) return;
      el.textContent = formatElapsed(now - t);
    });
  }

  document.addEventListener("click", function (event) {
    var lock = event.target.closest("[data-visit-lock]");
    if (!lock) return;
    event.preventDefault();
    var msg =
      lock.getAttribute("data-visit-lock-msg") ||
      "End the visit first.";
    window.alert(msg);
  });

  tick();
  setInterval(tick, 1000);
})();
