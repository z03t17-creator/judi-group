#!/bin/sh
# Startup for Render / docker compose: prepare Laravel, migrate, cache, then serve.
set -eu

cd /var/www/html

PORT="${PORT:-8080}"
export PORT

# Render Postgres (and some MySQL add-ons) inject DATABASE_URL. Laravel reads DB_URL.
if [ -n "${DATABASE_URL:-}" ] && [ -z "${DB_URL:-}" ]; then
    export DB_URL="$DATABASE_URL"
fi

# Infer the driver from a URL when DB_CONNECTION was not set in the dashboard.
if [ -z "${DB_CONNECTION:-}" ] && [ -n "${DB_URL:-}" ]; then
    case "$DB_URL" in
        mysql*://*|mysql2*://*) export DB_CONNECTION=mysql ;;
        postgres*://*|postgresql*://*) export DB_CONNECTION=pgsql ;;
        sqlite*) export DB_CONNECTION=sqlite ;;
    esac
fi

if [ -z "${APP_KEY:-}" ]; then
    echo "ERROR: APP_KEY is not set."
    echo "Generate one locally:  cd laravel && php artisan key:generate --show"
    echo "Then paste it into Render → Environment as APP_KEY."
    exit 1
fi

mkdir -p \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    storage/app/public \
    storage/app/private \
    bootstrap/cache

chown -R www-data:www-data storage bootstrap/cache || true
chmod -R ug+rwx storage bootstrap/cache || true

php artisan storage:link --force --no-interaction >/dev/null 2>&1 || true

# Drop caches from the image / previous deploy so live Render env vars are used.
php artisan optimize:clear --no-interaction || true

database_configured=0
if [ -n "${DB_URL:-}" ] || [ -n "${DB_HOST:-}" ]; then
    database_configured=1
fi

if [ "${DB_CONNECTION:-}" = "sqlite" ]; then
    database_configured=1
    sqlite_path="${DB_DATABASE:-/var/www/html/database/database.sqlite}"
    if [ ! -f "$sqlite_path" ]; then
        mkdir -p "$(dirname "$sqlite_path")"
        touch "$sqlite_path"
        chown www-data:www-data "$sqlite_path" || true
    fi
fi

if [ "$database_configured" -eq 1 ]; then
    echo "Waiting for the database, then running migrations..."
    i=1
    migrated=0
    while [ "$i" -le 30 ]; do
        if php artisan migrate --force --no-interaction; then
            migrated=1
            break
        fi
        echo "migrate failed (attempt $i/30); retrying in 3s..."
        i=$((i + 1))
        sleep 3
    done

    if [ "$migrated" -ne 1 ]; then
        echo "ERROR: php artisan migrate --force failed after 30 attempts."
        exit 1
    fi

    # Opt-in only. The seeder is idempotent but still not for a live customer DB.
    if [ "${RUN_SEED:-false}" = "true" ]; then
        echo "RUN_SEED=true — seeding database..."
        php artisan db:seed --force --no-interaction
    fi
else
    echo "No DB_HOST / DB_URL / DATABASE_URL set — skipping migrations."
fi

# Real env is now available: rebuild config / routes / views / events.
php artisan config:cache --no-interaction
php artisan route:cache --no-interaction
php artisan view:cache --no-interaction
php artisan event:cache --no-interaction || true

# Render assigns PORT (often 10000). Local compose uses 8080.
sed "s/LISTEN_PORT/${PORT}/g" \
    /etc/nginx/templates/default.conf.template \
    > /etc/nginx/http.d/default.conf

echo "Starting Nginx + PHP-FPM on 0.0.0.0:${PORT}"

exec "$@"
