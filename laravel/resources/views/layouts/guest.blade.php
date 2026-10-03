<!DOCTYPE html>
<html
    lang="{{ str_replace('_', '-', app()->getLocale()) }}"
    dir="{{ app()->getLocale() === 'en' ? 'ltr' : 'rtl' }}"
    data-theme="{{ in_array(request()->cookie('judi_theme'), ['light', 'dark'], true) ? request()->cookie('judi_theme') : 'light' }}"
    data-density="{{ in_array(request()->cookie('judi_density'), ['small', 'big'], true) ? request()->cookie('judi_density') : 'small' }}"
    data-label-theme-light="{{ __('ui.theme_light') }}"
    data-label-theme-dark="{{ __('ui.theme_dark') }}"
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
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Libre+Baskerville:wght@700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn-uicons.flaticon.com/2.6.0/uicons-solid-rounded/css/uicons-solid-rounded.css">
    <link rel="stylesheet" href="{{ asset('css/app.css') }}?v=100">
    <script>
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', function () {
                navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {});
            });
        }
    </script>
    <script src="{{ asset('js/preferences.js') }}?v=2" defer></script>
</head>
<body class="@yield('body_class')">
    @yield('content')
</body>
</html>
