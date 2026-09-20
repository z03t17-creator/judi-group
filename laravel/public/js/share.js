(() => {
  const closeAll = (except) => {
    document.querySelectorAll('[data-share-root]').forEach((root) => {
      if (except && root === except) return;
      const panel = root.querySelector('[data-share-panel]');
      const toggle = root.querySelector('[data-share-toggle]');
      if (panel) panel.hidden = true;
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    });
  };

  const payload = (root) => {
    const textEl = root.querySelector('[data-share-text]');
    const titleEl = root.querySelector('[data-share-title]');
    const doneEl = root.querySelector('[data-share-done]');
    return {
      title: (titleEl && titleEl.value) || 'JUDI',
      text: (textEl && textEl.value) || '',
      doneLabel: (doneEl && doneEl.value) || '',
    };
  };

  const openExternal = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const canNativeShare = () =>
    typeof navigator !== 'undefined'
    && typeof navigator.share === 'function';

  /**
   * In-app toast only — never use system Notification for share.
   * Chrome always prints the site origin (e.g. 127.0.0.1:8000) on OS alerts.
   */
  const notifyShared = (title, body) => {
    const host = document.querySelector('[data-notif-toast-host]');
    if (!host) return;

    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'notif-toast';
    el.setAttribute('data-notif-toast', '');
    el.innerHTML =
      '<span class="notif-toast__bar" aria-hidden="true"></span>'
      + '<span class="notif-toast__icon" aria-hidden="true">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>'
      + '</span>'
      + '<span class="notif-toast__body">'
      + '<strong class="notif-toast__title"></strong>'
      + '<span class="notif-toast__text"></span>'
      + '</span>'
      + '<span class="notif-toast__close" aria-hidden="true">×</span>';

    el.querySelector('.notif-toast__title').textContent = title || 'JUDI';
    el.querySelector('.notif-toast__text').textContent = body || '';

    let closed = false;
    const dismiss = () => {
      if (closed) return;
      closed = true;
      el.classList.remove('is-in');
      el.classList.add('is-out');
      setTimeout(() => el.remove(), 280);
    };

    el.addEventListener('click', dismiss);
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-in'));
    setTimeout(dismiss, 4500);
  };

  const shareNative = async (title, text) => {
    // Intentionally omit `url` — no system / app link in the share payload.
    if (!canNativeShare()) return false;
    try {
      await navigator.share({ title, text });
      return true;
    } catch (err) {
      if (err && err.name === 'AbortError') return 'abort';
      return false;
    }
  };

  const copyText = async (text) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) {}
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (_) {
      return false;
    }
  };

  const openPanel = (root) => {
    const panel = root.querySelector('[data-share-panel]');
    const toggle = root.querySelector('[data-share-toggle]');
    closeAll();
    if (panel) {
      panel.hidden = false;
      if (toggle) toggle.setAttribute('aria-expanded', 'true');
    }
  };

  const afterShared = (title, doneLabel) => {
    notifyShared(title || 'JUDI', doneLabel || 'Shared');
  };

  document.addEventListener('click', async (event) => {
    const toggle = event.target.closest('[data-share-toggle]');
    if (toggle) {
      event.preventDefault();
      const root = toggle.closest('[data-share-root]');
      if (!root) return;

      const { title, text, doneLabel } = payload(root);
      if (!text) return;

      // Prefer the OS share sheet so WhatsApp & other apps appear on the device.
      if (canNativeShare()) {
        const result = await shareNative(title, text);
        if (result === true) {
          afterShared(title, doneLabel);
          closeAll();
          return;
        }
        if (result === 'abort') {
          closeAll();
          return;
        }
      }

      // Fallback menu when native share is unavailable or failed.
      openPanel(root);
      return;
    }

    const root = event.target.closest('[data-share-root]');
    if (!root) {
      closeAll();
      return;
    }

    const { title, text, doneLabel } = payload(root);
    if (!text) return;

    if (event.target.closest('[data-share-native]')) {
      const result = await shareNative(title, text);
      if (result === true) {
        afterShared(title, doneLabel);
      } else if (result === false) {
        openExternal('https://wa.me/?text=' + encodeURIComponent(text));
        afterShared(title, doneLabel);
      }
      closeAll();
      return;
    }

    if (event.target.closest('[data-share-whatsapp]')) {
      openExternal('https://wa.me/?text=' + encodeURIComponent(text));
      afterShared(title, doneLabel);
      closeAll();
      return;
    }

    if (event.target.closest('[data-share-telegram]')) {
      // text-only — do not pass a url= query (avoids attaching any site link).
      const tgApp = 'tg://msg?text=' + encodeURIComponent(text);
      const tgWeb = 'https://t.me/share/url?url=&text=' + encodeURIComponent(text);
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        window.location.href = tgApp;
      } else {
        openExternal(tgWeb);
      }
      afterShared(title, doneLabel);
      closeAll();
      return;
    }

    if (event.target.closest('[data-share-sms]')) {
      const body = encodeURIComponent(text);
      const sms = /iPhone|iPad|iPod/i.test(navigator.userAgent)
        ? 'sms:&body=' + body
        : 'sms:?body=' + body;
      window.location.href = sms;
      afterShared(title, doneLabel);
      closeAll();
      return;
    }

    if (event.target.closest('[data-share-copy]')) {
      const ok = await copyText(text);
      const btn = event.target.closest('[data-share-copy]');
      if (btn && ok) {
        const prev = btn.textContent;
        btn.textContent = btn.getAttribute('data-copied-label') || 'OK';
        setTimeout(() => { btn.textContent = prev; }, 1500);
        afterShared(title, doneLabel);
      }
      closeAll();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeAll();
  });
})();
