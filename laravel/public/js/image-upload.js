(function () {
  function setFile(input, file) {
    if (!input || !file) return;
    try {
      var dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
    } catch (e) {
      // Some older browsers cannot assign files; preview still updates.
    }
  }

  function preview(root, url) {
    var img = root.querySelector('[data-image-preview]');
    if (!img) return;
    img.hidden = false;
    img.src = url;
  }

  function stopStream(root) {
    var video = root.querySelector('[data-camera-video]');
    if (video && video.srcObject) {
      video.srcObject.getTracks().forEach(function (t) { t.stop(); });
      video.srcObject = null;
    }
  }

  function openCamera(root) {
    var dialog = root.querySelector('[data-camera-dialog]');
    var video = root.querySelector('[data-camera-video]');
    if (!dialog || !video || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // Fallback: trigger file input with capture
      var input = root.querySelector('[data-image-input]');
      if (input) {
        input.setAttribute('capture', 'environment');
        input.click();
      }
      return;
    }

    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      .then(function (stream) {
        video.srcObject = stream;
        if (typeof dialog.showModal === 'function') {
          dialog.showModal();
        } else {
          dialog.setAttribute('open', 'open');
        }
      })
      .catch(function () {
        var input = root.querySelector('[data-image-input]');
        if (input) input.click();
      });
  }

  function snap(root) {
    var video = root.querySelector('[data-camera-video]');
    var canvas = root.querySelector('[data-camera-canvas]');
    var input = root.querySelector('[data-image-input]');
    var dialog = root.querySelector('[data-camera-dialog]');
    if (!video || !canvas || !input) return;

    var w = video.videoWidth || 640;
    var h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);

    canvas.toBlob(function (blob) {
      if (!blob) return;
      var file = new File([blob], 'camera-' + Date.now() + '.jpg', { type: 'image/jpeg' });
      setFile(input, file);
      preview(root, URL.createObjectURL(blob));
      stopStream(root);
      if (dialog) {
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
      }
    }, 'image/jpeg', 0.92);
  }

  function bind(root) {
    if (root.getAttribute('data-bound') === '1') return;
    root.setAttribute('data-bound', '1');

    var input = root.querySelector('[data-image-input]');
    var galleryBtn = root.querySelector('[data-image-gallery]');
    var cameraBtn = root.querySelector('[data-image-camera]');
    var cancelBtn = root.querySelector('[data-camera-cancel]');
    var snapBtn = root.querySelector('[data-camera-snap]');
    var dialog = root.querySelector('[data-camera-dialog]');

    if (input) {
      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        if (file) preview(root, URL.createObjectURL(file));
      });
    }

    if (galleryBtn && input) {
      galleryBtn.addEventListener('click', function () {
        input.removeAttribute('capture');
        input.click();
      });
    }

    if (cameraBtn) {
      cameraBtn.addEventListener('click', function () {
        openCamera(root);
      });
    }

    if (snapBtn) {
      snapBtn.addEventListener('click', function () {
        snap(root);
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', function () {
        stopStream(root);
        if (dialog) {
          if (typeof dialog.close === 'function') dialog.close();
          else dialog.removeAttribute('open');
        }
      });
    }

    if (dialog) {
      dialog.addEventListener('close', function () {
        stopStream(root);
      });
    }
  }

  function init() {
    document.querySelectorAll('[data-image-upload]').forEach(bind);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
