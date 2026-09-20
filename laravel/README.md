# JUDI Laravel

**Production system** for Judi (جودي): Laravel + MySQL on Enterprise **cPanel** (PHP — no Node).

Faces L0–L6 are in the app. **FACE L7 (deploy):** see **[DEPLOY.md](DEPLOY.md)**.

Deferred / later work: **[docs/LATER.md](docs/LATER.md)**.

---

## FACE L0+ foundation

Laravel + MySQL for cPanel: auth, roles (Admin / Accountant / Collector), RTL Kurdish UI, official JUDI logo, one کۆگا.

## Requirements

- PHP 8.2+ with `pdo_mysql`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `bcmath`, `fileinfo`
- Composer
- MySQL 8.x (cPanel MySQL or local)

No Node.js build step — Blade + `public/css/app.css`.

## Setup

```bash
cd laravel
copy .env.example .env
php artisan key:generate
```

Set MySQL in `.env`:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=judi
DB_USERNAME=root
DB_PASSWORD=
```

Create the database, then:

```bash
php artisan migrate --seed
php artisan serve
```

Open http://127.0.0.1:8000

## Seed logins

Password for all: `JudiAdmin!26`

| Email | Role |
| --- | --- |
| admin@judi.local | Admin |
| accountant@judi.local | Accountant |
| wholesale@judi.local | Collector (wholesale) |
| retail@judi.local | Collector (retail) |

## Logo

Official mark: `public/images/judi-logo.jpg` (color mountains + JUDI + NATURE • QUALITY • TRUST).

## Local MySQL note

`RUN.bat` starts the project-local MySQL instance when port 3306 is free. Paths must be quoted (the folder name contains a space). Manual start:

```powershell
$mysqld = 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe'
$datadir = (Resolve-Path 'storage\mysql\data').Path
$basedir = 'C:\Program Files\MySQL\MySQL Server 8.4'
Start-Process -FilePath $mysqld -ArgumentList "--datadir=`"$datadir`" --basedir=`"$basedir`" --port=3306 --bind-address=127.0.0.1"
```

Then create DB if needed: `CREATE DATABASE judi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`

## Production deploy (FACE L7)

See **[DEPLOY.md](DEPLOY.md)** — Enterprise cPanel layout, `.env.production.example`, and `deploy/prepare-cpanel.ps1`.
