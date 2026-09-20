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
    <title>@yield('title', 'JUDI')</title>
    <link rel="icon" href="{{ $judiLogoUrl }}" type="image/jpeg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Libre+Baskerville:wght@700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{{ asset('css/app.css') }}?v=54">
    <script src="{{ asset('js/preferences.js') }}?v=2" defer></script>
</head>
<body class="@yield('body_class')">
    @yield('content')
</body>
</html>
