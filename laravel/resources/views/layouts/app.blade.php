<!DOCTYPE html>
<html
    lang="{{ str_replace('_', '-', app()->getLocale()) }}"
    dir="{{ app()->getLocale() === 'en' ? 'ltr' : 'rtl' }}"
    data-theme="{{ in_array(request()->cookie('judi_theme'), ['light', 'dark'], true) ? request()->cookie('judi_theme') : 'light' }}"
    data-density="{{ in_array(request()->cookie('judi_density'), ['small', 'big'], true) ? request()->cookie('judi_density') : 'small' }}"
    data-label-theme-light="{{ __('ui.theme_light') }}"
    data-label-theme-dark="{{ __('ui.theme_dark') }}"
    data-label-notif-device="{{ __('ui.notif_device_title') }}"
    data-label-notif-device-body="{{ __('ui.notif_device_toast') }}"
    data-label-push-on="{{ __('ui.notif_push_on') }}"
    data-label-push-hint="{{ __('ui.notif_push_tap') }}"
    data-label-push-blocked="{{ __('ui.notif_push_blocked') }}"
    data-label-push-denied="{{ __('ui.notif_push_denied') }}"
    data-label-push-disabled="{{ __('ui.notif_push_disabled') }}"
    data-label-push-failed="{{ __('ui.notif_push_failed') }}"
    data-label-push-unsupported="{{ __('ui.notif_push_unsupported') }}"
    data-label-push-service="{{ __('ui.notif_push_service') }}"
    data-label-push-test-ok="{{ __('ui.notif_push_test_ok') }}"
    data-label-push-test-need="{{ __('ui.notif_push_test_need') }}"
>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="theme-color" content="{{ (request()->cookie('judi_theme') === 'dark') ? '#0f2422' : '#f4f7f5' }}">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="{{ __('ui.brand_short') }}">
    <meta name="application-name" content="{{ __('ui.brand_short') }}">
    <title>@yield('title', __('ui.brand_short'))</title>
    <link rel="icon" href="{{ asset('icon-192.png') }}" type="image/png">
    <link rel="apple-touch-icon" sizes="180x180" href="{{ asset('icon-192.png') }}">
    <link rel="manifest" href="{{ asset('manifest.webmanifest') }}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
    {{-- Flaticon Uicons (Solid Rounded) — https://www.flaticon.com/uicons --}}
    <link rel="stylesheet" href="https://cdn-uicons.flaticon.com/2.6.0/uicons-solid-rounded/css/uicons-solid-rounded.css">
    <link rel="stylesheet" href="{{ asset('css/app.css') }}?v=104">
    <script>
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', function () {
                navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {});
            });
        }
    </script>
    <script src="{{ asset('js/money-input.js') }}?v=2" defer></script>
    <script src="{{ asset('js/image-upload.js') }}?v=1" defer></script>
    <script src="{{ asset('js/visit-timer.js') }}?v=2" defer></script>
    <script src="{{ asset('js/notifications.js') }}?v=11" defer></script>
    <script src="{{ asset('js/push.js') }}?v=5" defer></script>
    <script src="{{ asset('js/share.js') }}?v=4" defer></script>
    <script src="{{ asset('js/preferences.js') }}?v=2" defer></script>
    <script src="{{ asset('js/print-doc.js') }}?v=13" defer></script>
    <script src="{{ asset('js/office-nav.js') }}?v=2" defer></script>
    @auth
        @if (auth()->user()->canAccess('products'))
            <script>
                window.JudiBarcodeScannerFallbackSrc = @json(asset('js/vendor/html5-qrcode.min.js'));
            </script>
            <script src="{{ asset('js/barcode-scanner.js') }}?v=3" defer></script>
            <script src="{{ asset('js/product-barcode-scan.js') }}?v=1" defer></script>
        @endif
    @endauth
</head>
<body
    data-brand-name="{{ __('ui.brand_name') }}"
    data-brand-short="{{ __('ui.brand_short') }}"
    data-notif-feed="{{ auth()->check() ? route('notifications.feed', absolute: false) : '' }}"
    data-notif-inbox="{{ auth()->check() ? route('notifications.index', absolute: false) : '' }}"
    data-prefs-url="{{ auth()->check() ? route('settings.preferences', absolute: false) : '' }}"
>@php
    $user = auth()->user();
    $isCollector = $user->isCollector();
@endphp

@if (auth()->check())
    @include('partials.notif-toast-host')
@endif

@if ($isCollector)
    <div class="shell shell--field">
        @include('partials.field-header')
        <div class="page-frame page-frame--field">
            @yield('content')
        </div>
        @include('partials.field-bottom-nav')
    </div>
@else
    <div class="shell shell--office" data-office-shell>
        <div class="office-menu-backdrop" data-office-menu-backdrop hidden></div>
        @include('partials.office-sidebar')
        <div class="shell__main">
            @include('partials.office-topbar')
            <div class="page-frame page-frame--office">
                @yield('content')
            </div>
            @include('partials.office-bottom-nav')
        </div>
    </div>
@endif
</body>
</html>
