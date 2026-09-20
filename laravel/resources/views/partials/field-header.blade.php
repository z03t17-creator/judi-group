<header class="field-header">
    <div class="field-header__inner">
        <a href="{{ route('home') }}" class="brand-mark" aria-label="JUDI">
            <img
                src="{{ $judiLogoUrl }}"
                alt=""
                class="brand-mark__img"
            >
            <span class="brand-mark__text">
                <span class="brand-mark__name">Judi</span>
                <span class="brand-mark__sub">Group</span>
            </span>
        </a>
        <div class="field-header__actions">
            <p class="field-header__name">{{ auth()->user()->name }}</p>
            @include('partials.theme-toggle')
            @include('partials.notif-bell')
            <a href="{{ route('settings.index') }}" class="chrome-btn" title="{{ __('ui.settings') }}" aria-label="{{ __('ui.settings') }}">
                @include('partials.icons.settings', ['class' => 'chrome-btn__icon'])
            </a>
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
