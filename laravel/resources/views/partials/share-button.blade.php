@php
    $shareTitle = $shareTitle ?? (config('judi.company.name') ?? 'JUDI');
    $shareText = $shareText ?? '';
    $shareId = $shareId ?? ('share-'.substr(md5($shareTitle.$shareText), 0, 8));
    $compact = ! empty($compact);
@endphp

<div class="share-menu no-print" data-share-root data-share-id="{{ $shareId }}">
    <button
        type="button"
        class="btn {{ $compact ? 'btn--regular btn--sm' : 'btn--regular' }}"
        data-share-toggle
        aria-expanded="false"
        aria-controls="{{ $shareId }}-panel"
        title="{{ __('ui.share') }}"
    >
        @include('partials.icons.share', ['class' => 'btn__icon'])
        @unless ($compact)
            <span>{{ __('ui.share') }}</span>
        @endunless
    </button>

    <div
        id="{{ $shareId }}-panel"
        class="share-menu__panel"
        data-share-panel
        hidden
        role="menu"
        aria-label="{{ __('ui.share') }}"
    >
        <p class="share-menu__hint">{{ __('ui.share_hint') }}</p>
        <button type="button" class="share-menu__item" data-share-native role="menuitem">
            {{ __('ui.share_device') }}
        </button>
        <button type="button" class="share-menu__item" data-share-whatsapp role="menuitem">
            WhatsApp
        </button>
        <button type="button" class="share-menu__item" data-share-telegram role="menuitem">
            Telegram
        </button>
        <button type="button" class="share-menu__item" data-share-sms role="menuitem">
            {{ __('ui.share_sms') }}
        </button>
        <button type="button" class="share-menu__item" data-share-copy data-copied-label="{{ __('ui.share_copied') }}" role="menuitem">
            {{ __('ui.share_copy') }}
        </button>
    </div>

    <textarea class="share-menu__payload" data-share-text hidden readonly>{{ $shareText }}</textarea>
    <input type="hidden" data-share-title value="{{ $shareTitle }}">
    <input type="hidden" data-share-done value="{{ __('ui.share_device_done') }}">
</div>
