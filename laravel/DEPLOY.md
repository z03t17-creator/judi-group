# FACE L7 — Deploy JUDI on Enterprise cPanel

Production target: **cPanel + PHP 8.3+ + MySQL + LiteSpeed** (no Node.js build step — Blade + `public/css`).

Health check after deploy: `https://YOUR-DOMAIN/up`

---

## 1. Host checklist

| Item | Required |
| --- | --- |
| PHP | **8.3+** with `pdo_mysql`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `bcmath`, `fileinfo` |
| Composer | On the server (SSH Terminal / Setup Node.js is **not** needed) **or** run `composer install` locally before upload |
| MySQL | Create one database + user in cPanel → MySQL® Databases |
| Document root | Must point at Laravel’s **`public/`** folder (not the app root) |

In cPanel → **Select PHP Version** / MultiPHP: pick **8.3** (or newer). Enable the extensions above.

---

## 2. Recommended folder layout

Keep app code **outside** the web root when possible:

```text
/home/USER/
  judi/                 ← full Laravel app (this repo’s laravel/ folder)
    app/
    bootstrap/
    config/
    database/
    public/             ← document root points HERE
    resources/
    routes/
    storage/
    vendor/
    .env
  public_html/          ← optional symlink or empty redirect (see below)
```

### Option A — Change document root (best)

cPanel → **Domains** → your domain → **Document Root** →  
`/home/USER/judi/public`

### Option B — Symlink `public_html` → `judi/public`

```bash
# SSH, from home directory
rm -rf public_html
ln -s judi/public public_html
```

### Option C — App lives inside `public_html` (shared hosting fallback)

Upload so that:

```text
public_html/
  .htaccess          ← copy from deploy/cpanel/public_html.htaccess
  app/               ← everything except contents of public/
  ...
  public/            ← Laravel public assets + index.php
```

Then use `deploy/cpanel/public_html.htaccess` so `/` routes into `public/`.

---

## 3. Upload the app

**From your PC (recommended):**

```powershell
cd laravel
.\deploy\prepare-cpanel.ps1
```

This builds `storage/deploy/judi-cpanel.zip` (vendor included, `.env` excluded).

Upload and extract under `/home/USER/judi/`.

**Or with SSH + Git:**

```bash
cd /home/USER
git clone YOUR_REPO judi-src
cp -a judi-src/laravel/. judi/
cd judi
composer install --no-dev --optimize-autoloader
```

---

## 4. Production `.env`

```bash
cd /home/USER/judi
cp .env.example .env
# or copy values from .env.production.example
php artisan key:generate
```

Set at least:

```env
APP_NAME=JUDI
APP_ENV=production
APP_DEBUG=false
APP_URL=https://YOUR-DOMAIN

APP_LOCALE=ckb
APP_FALLBACK_LOCALE=en

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=cpanel_db_name
DB_USERNAME=cpanel_db_user
DB_PASSWORD=secret

SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database

LOG_CHANNEL=stack
LOG_LEVEL=error
```

Never commit `.env`. Never leave `APP_DEBUG=true` on production.

---

## 5. Install & migrate

```bash
cd /home/USER/judi

composer install --no-dev --optimize-autoloader

php artisan migrate --force
# First install only — creates seed logins:
php artisan db:seed --force

php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Permissions (SSH):

```bash
chmod -R ug+rwx storage bootstrap/cache
```

In cPanel File Manager, ensure `storage/` and `bootstrap/cache/` are writable by the web user.

---

## 6. Post-deploy smoke test

1. Open `https://YOUR-DOMAIN/up` → should return OK.
2. Open `https://YOUR-DOMAIN/login`.
3. Sign in with a seeded or admin account (change passwords immediately).
4. Spot-check: products, stock (کۆگا), sell invoice, release/send, collections, reports.

Default seed password (local/demo only): `JudiAdmin!26` — **change on production**.

---

## 7. Updates (redeploy)

1. Put the site in maintenance (optional): `php artisan down`
2. Upload changed files (or unzip a new prepare-cpanel zip over the app — keep `.env`)
3. `composer install --no-dev --optimize-autoloader`
4. `php artisan migrate --force`
5. `php artisan optimize`
6. `php artisan up`

Do **not** re-run `db:seed` on a live database unless you intend to reset demo data.

---

## 8. Backups

- cPanel → **Backup** / **JetBackup**: include MySQL + `storage/app` (uploads).
- Before risky migrations, take a DB dump.

---

## 9. Troubleshooting

| Symptom | Fix |
| --- | --- |
| 500 / blank page | `storage/logs/laravel.log`; check `.env` `APP_KEY`; writable `storage` |
| CSS missing | Document root must be `public/`; clear browser cache |
| DB connection refused | Use `localhost` (not `127.0.0.1` on some hosts); verify DB user privileges |
| Mixed content / login loop | `APP_URL=https://...`; HTTPS redirect in cPanel |
| `/up` works, routes 404 | Rewrite / LiteSpeed; ensure `public/.htaccess` present |

More host-specific notes: `deploy/cpanel/README.md`.
