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
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{{ asset('css/app.css') }}?v=76">
    <script src="{{ asset('js/money-input.js') }}?v=2" defer></script>
    <script src="{{ asset('js/image-upload.js') }}?v=1" defer></script>
    <script src="{{ asset('js/notifications.js') }}?v=8" defer></script>
    <script src="{{ asset('js/push.js') }}?v=1" defer></script>
    <script src="{{ asset('js/share.js') }}?v=3" defer></script>
    <script src="{{ asset('js/preferences.js') }}?v=2" defer></script>
    <script src="{{ asset('js/print-doc.js') }}?v=10" defer></script>
    <script src="{{ asset('js/office-nav.js') }}?v=2" defer></script>
</head>
<body
    data-notif-feed="{{ auth()->check() ? route('notifications.feed', absolute: false) : '' }}"
    data-notif-inbox="{{ auth()->check() ? route('settings.index', absolute: false).'#settings-inbox' : '' }}"
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
