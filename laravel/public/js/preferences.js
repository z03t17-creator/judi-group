(() => {
  const COOKIE_DAYS = 365;
  const labels = {
    light: document.documentElement.getAttribute('data-label-theme-light') || 'Light',
    dark: document.documentElement.getAttribute('data-label-theme-dark') || 'Dark',
  };

  function readCookie(name) {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function writeCookie(name, value) {
    const maxAge = COOKIE_DAYS * 24 * 60 * 60;
    document.cookie = name + '=' + encodeURIComponent(value)
      + '; path=/; max-age=' + maxAge + '; SameSite=Lax';
  }

  function currentTheme() {
    const t = document.documentElement.getAttribute('data-theme');
    return t === 'dark' ? 'dark' : 'light';
  }

  function currentDensity() {
    const d = document.documentElement.getAttribute('data-density');
    return d === 'big' ? 'big' : 'small';
  }

  function setThemeColor(theme) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0f2422' : '#f4f7f5');
  }

  function applyTheme(theme, { persist = true } = {}) {
    const next = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    document.documentElement.classList.add('theme-switching');
    setTimeout(() => document.documentElement.classList.remove('theme-switching'), 320);
    setThemeColor(next);
    if (persist) writeCookie('judi_theme', next);

    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.setAttribute('data-theme-on', next);
      btn.setAttribute('aria-pressed', next === 'dark' ? 'true' : 'false');
      btn.setAttribute('title', next === 'dark' ? labels.light : labels.dark);
    });

    document.querySelectorAll('[data-pref-theme]').forEach((input) => {
      if (input instanceof HTMLInputElement) {
        input.checked = input.value === next;
      }
    });
  }

  function applyDensity(density, { persist = true } = {}) {
    const next = density === 'big' ? 'big' : 'small';
    document.documentElement.setAttribute('data-density', next);
    if (persist) writeCookie('judi_density', next);

    document.querySelectorAll('[data-pref-density]').forEach((input) => {
      if (input instanceof HTMLInputElement) {
        input.checked = input.value === next;
      }
    });
  }

  function persistToServer(theme, density) {
    const url = document.body?.dataset?.prefsUrl;
    const token = document.querySelector('meta[name="csrf-token"]')?.content;
    if (!url || !token) return;

    const body = new FormData();
    body.append('theme', theme);
    body.append('density', density);
    body.append('_token', token);

    fetch(url, {
      method: 'POST',
      body,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    }).catch(() => {});
  }

  document.addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-theme-toggle]');
    if (!toggle) return;
    event.preventDefault();
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    persistToServer(next, currentDensity());
  });

  document.addEventListener('change', (event) => {
    const el = event.target;
    if (!(el instanceof HTMLInputElement)) return;

    if (el.matches('[data-pref-theme]')) {
      applyTheme(el.value);
      persistToServer(el.value, currentDensity());
      return;
    }

    if (el.matches('[data-pref-density]')) {
      applyDensity(el.value);
      persistToServer(currentTheme(), el.value);
    }
  });

  // Sync from cookies if html attrs ever drift.
  document.addEventListener('DOMContentLoaded', () => {
    const cookieTheme = readCookie('judi_theme');
    const cookieDensity = readCookie('judi_density');
    if (cookieTheme === 'light' || cookieTheme === 'dark') {
      applyTheme(cookieTheme, { persist: false });
    } else {
      setThemeColor(currentTheme());
    }
    if (cookieDensity === 'small' || cookieDensity === 'big') {
      applyDensity(cookieDensity, { persist: false });
    }
  });
})();
