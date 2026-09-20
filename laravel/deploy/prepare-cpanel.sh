#!/usr/bin/env bash
# FACE L7 — Build a cPanel-ready zip of the Laravel app (no .env).
# Usage (from laravel/):  bash deploy/prepare-cpanel.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Composer install (no-dev, optimized)"
composer install --no-dev --optimize-autoloader --no-interaction

echo "==> Clear caches for packaging"
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan event:clear || true

OUT_DIR="$ROOT/storage/deploy"
mkdir -p "$OUT_DIR"
ZIP_PATH="$OUT_DIR/judi-cpanel.zip"
rm -f "$ZIP_PATH"

STAGING="$(mktemp -d)"
trap 'rm -rf "$STAGING"' EXIT

echo "==> Copying files to staging"
rsync -a \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='tests' \
  --exclude='storage/logs/*' \
  --exclude='storage/framework/cache/*' \
  --exclude='storage/framework/sessions/*' \
  --exclude='storage/framework/views/*' \
  --exclude='storage/deploy' \
  --exclude='storage/mysql' \
  "$ROOT/" "$STAGING/"

mkdir -p \
  "$STAGING/storage/app/public" \
  "$STAGING/storage/framework/cache/data" \
  "$STAGING/storage/framework/sessions" \
  "$STAGING/storage/framework/views" \
  "$STAGING/storage/logs"

(
  cd "$STAGING"
  zip -rq "$ZIP_PATH" .
)

echo ""
echo "Done: $ZIP_PATH"
echo "Upload, extract under /home/USER/judi/, then follow DEPLOY.md"
