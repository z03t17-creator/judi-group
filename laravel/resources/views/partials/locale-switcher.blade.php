@php
    $current = app()->getLocale();
    $locales = [
        'ckb' => 'کوردی',
        'ar' => 'عربي',
        'en' => 'EN',
    ];
    if (! array_key_exists($current, $locales)) {
        $current = 'ckb';
    }
    $tone = $tone ?? 'chrome';
    $label = $locales[$current];
@endphp

<nav class="locale-switch locale-switch--{{ $tone }} locale-switch--cycle" aria-label="{{ __('ui.language') }}">
    <form method="POST" action="{{ route('locale.next') }}" class="locale-switch__form">
        @csrf
        <button
            type="submit"
            class="locale-cycle"
            title="{{ __('ui.language') }} — {{ $label }}"
            aria-label="{{ __('ui.language') }}: {{ $label }}"
        >
            <span class="locale-cycle__label">{{ $label }}</span>
        </button>
    </form>
</nav>
