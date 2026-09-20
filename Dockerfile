# syntax=docker/dockerfile:1
#
# JUDI Laravel — production image for Render (and local docker compose).
# Build context MUST be the repository root (the Laravel app lives in laravel/).
#
# PHP 8.4 — composer.lock / Laravel 13 + Symfony require ">= 8.4.1".
# No Node/Vite build: production assets are Blade + public/css + public/js.

# ---------------------------------------------------------------------------
# 1) Composer vendor (no dev packages)
# ---------------------------------------------------------------------------
FROM composer:2 AS vendor

WORKDIR /app

ENV COMPOSER_ALLOW_SUPERUSER=1 \
    APP_ENV=production \
    APP_KEY=base64:2fl+KTVKfl+Fuz4Qp/Ej30lB5KPaSSuGikG8/r/kBEI=

COPY laravel/composer.json laravel/composer.lock ./

RUN composer install \
    --no-dev \
    --no-scripts \
    --no-autoloader \
    --prefer-dist \
    --no-interaction \
    --ignore-platform-reqs

COPY laravel/ .

RUN composer dump-autoload --optimize --no-dev --classmap-authoritative \
    && php artisan package:discover --ansi --no-interaction

# ---------------------------------------------------------------------------
# 2) Runtime: PHP-FPM 8.4 + Nginx (tuned for Render free-tier 512 MB)
# ---------------------------------------------------------------------------
FROM php:8.4-fpm-alpine

LABEL org.opencontainers.image.title="JUDI Laravel" \
      org.opencontainers.image.description="Production Laravel 13 / PHP 8.4 image for Render"

ENV APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr \
    PORT=8080 \
    COMPOSER_ALLOW_SUPERUSER=1

# Runtime libs + nginx/supervisor. Build deps are removed after ext compile.
RUN apk add --no-cache \
        curl \
        icu-libs \
        libpng \
        libjpeg-turbo \
        freetype \
        libwebp \
        libzip \
        oniguruma \
        libpq \
        nginx \
        supervisor \
    && apk add --no-cache --virtual .build-deps \
        $PHPIZE_DEPS \
        icu-dev \
        libpng-dev \
        libjpeg-turbo-dev \
        freetype-dev \
        libwebp-dev \
        libzip-dev \
        oniguruma-dev \
        postgresql-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install -j"$(nproc)" \
        pdo_mysql \
        pdo_pgsql \
        mbstring \
        bcmath \
        gd \
        intl \
        zip \
        opcache \
        pcntl \
        exif \
    && apk del .build-deps \
    && rm -rf /tmp/pear /var/cache/apk/*

WORKDIR /var/www/html

COPY --from=vendor /app /var/www/html

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/default.conf.template /etc/nginx/templates/default.conf.template
COPY docker/php.ini /usr/local/etc/php/conf.d/zz-judi.ini
COPY docker/php-fpm.conf /usr/local/etc/php-fpm.d/zz-judi.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY docker/healthcheck.sh /usr/local/bin/healthcheck.sh

# Strip Windows CRLF so the entrypoint runs on Render even if git changed EOLs.
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh /usr/local/bin/healthcheck.sh \
    && chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/healthcheck.sh \
    && mkdir -p \
        /run/nginx \
        /var/lib/nginx/tmp \
        /var/log/supervisor \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        storage/app/public \
        storage/app/private \
        bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R ug+rwx storage bootstrap/cache \
    && chown -R nginx:nginx /var/lib/nginx /run/nginx \
    && rm -f /etc/nginx/http.d/default.conf \
    && APP_KEY=base64:2fl+KTVKfl+Fuz4Qp/Ej30lB5KPaSSuGikG8/r/kBEI= \
       php artisan view:cache --no-interaction \
    && APP_KEY=base64:2fl+KTVKfl+Fuz4Qp/Ej30lB5KPaSSuGikG8/r/kBEI= \
       php artisan event:cache --no-interaction || true

# Config and route caches are built at container start (entrypoint) once Render
# injects the real APP_KEY / DB_* values. Caching them here would bake empty
# secrets into bootstrap/cache and break the first request.

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
