<header class="field-header">
    <div class="field-header__inner">
        <div class="field-header__brand">
            @if (! empty($activeVisitTimer) && $activeVisitTimer->isOpen())
                <a href="{{ route('visits.show', $activeVisitTimer) }}" class="brand-mark" aria-label="{{ $brandShort }}">
                    <img src="{{ $judiLogoUrl }}" alt="" class="brand-mark__img">
                </a>
                <a
                    href="{{ route('visits.show', $activeVisitTimer) }}"
                    class="visit-timer"
                    data-visit-timer
                    data-started-at="{{ $activeVisitTimer->started_at?->toIso8601String() }}"
                    title="{{ $activeVisitTimer->store?->name }}"
                    dir="ltr"
                >00:00:00</a>
            @else
                <a href="{{ route('home') }}" class="brand-mark" aria-label="{{ $brandShort }}">
                    <img src="{{ $judiLogoUrl }}" alt="" class="brand-mark__img">
                    <span class="brand-mark__text">
                        <span class="brand-mark__name">{{ $brandShort }}</span>
                    </span>
                </a>
            @endif
        </div>
        <div class="field-header__actions">
            @include('partials.theme-toggle')
            @include('partials.notif-bell')
            @if (! empty($activeVisitTimer) && $activeVisitTimer->isOpen())
                <button
                    type="button"
                    class="chrome-btn"
                    data-visit-lock
                    data-visit-lock-msg="{{ __('ui.visit_end_first') }}"
                    title="{{ __('ui.settings') }}"
                    aria-label="{{ __('ui.settings') }}"
                >
                    @include('partials.icons.settings', ['class' => 'chrome-btn__icon'])
                </button>
            @else
                <a href="{{ route('settings.index') }}" class="chrome-btn" title="{{ __('ui.settings') }}" aria-label="{{ __('ui.settings') }}">
                    @include('partials.icons.settings', ['class' => 'chrome-btn__icon'])
                </a>
            @endif
            @include('partials.locale-switcher', ['tone' => 'chrome'])
            <form method="POST" action="{{ route('logout') }}" class="chrome-btn-form">
                @csrf
                <button type="submit" class="chrome-btn chrome-btn--danger" title="{{ __('ui.sign_out') }}" aria-label="{{ __('ui.sign_out') }}">
                    @include('partials.icons.logout', ['class' => 'chrome-btn__icon'])
                </button>
            </form>
        </div>
    </div>
</header>
