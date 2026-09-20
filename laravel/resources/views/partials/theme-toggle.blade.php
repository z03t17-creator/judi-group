@php
    $theme = in_array(request()->cookie('judi_theme'), ['light', 'dark'], true)
        ? request()->cookie('judi_theme')
        : 'light';
@endphp

<button
    type="button"
    class="theme-toggle"
    data-theme-toggle
    data-theme-on="{{ $theme }}"
    title="{{ $theme === 'dark' ? __('ui.theme_light') : __('ui.theme_dark') }}"
    aria-label="{{ __('ui.settings_theme') }}"
    aria-pressed="{{ $theme === 'dark' ? 'true' : 'false' }}"
>
    <span class="theme-toggle__icon theme-toggle__icon--sun" aria-hidden="true">
        @include('partials.icons.sun', ['class' => 'theme-toggle__svg'])
    </span>
    <span class="theme-toggle__icon theme-toggle__icon--moon" aria-hidden="true">
        @include('partials.icons.moon', ['class' => 'theme-toggle__svg'])
    </span>
</button>
