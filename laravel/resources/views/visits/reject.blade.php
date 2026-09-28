@extends('layouts.app')

@section('title', __('ui.visit_action_reject').' — '.$store->name)

@section('content')
<section class="page reject-page" data-reject-form>
    <header class="page__header page__header--iconed">
        @include('partials.icon-badge', ['icon' => 'file', 'tone' => 'amber', 'size' => 'lg'])
        <div class="page__header-text">
            <h1 class="page__title">{{ __('ui.visit_action_reject') }}</h1>
            <p class="page__lead">
                {{ $store->name }}
                · {{ $warehouse?->displayName() ?? __('ui.warehouse_main') }}
                · {{ __('ui.reject_sold_only_hint') }}
            </p>
        </div>
        <a href="{{ route('visits.show', $visit) }}" class="btn btn--ghost btn--sm">{{ __('ui.back') }}</a>
    </header>

    @include('partials.flash')
    @error('reject')
        <p class="field__error">{{ $message }}</p>
    @enderror
    @error('lines')
        <p class="field__error">{{ $message }}</p>
    @enderror

    <form method="POST" action="{{ route('visits.reject.store', $visit) }}" class="sell-form sell-form--calm" id="reject-form">
        @csrf

        <label class="sell-search">
            <span class="visually-hidden">{{ __('ui.search') }}</span>
            <input
                class="sell-search__input"
                type="search"
                data-reject-filter
                placeholder="{{ __('ui.invoice_product_search') }}"
                enterkeyhint="search"
                autocomplete="off"
                data-scan-focus
            >
        </label>

        <div class="sell-catalog sell-catalog--calm" data-reject-catalog></div>

        <div class="sell-cart-block">
            <div class="sell-cart-block__head">
                <span>{{ __('ui.reject_cart') }}</span>
                <strong class="sell-cart__total" data-reject-credit dir="ltr">0</strong>
            </div>
            <ul class="sell-cart sell-cart--calm" data-reject-cart role="list"></ul>
            <p class="empty sell-cart__empty" data-reject-empty>{{ __('ui.reject_pick_items') }}</p>
            <div data-reject-inputs></div>
        </div>

        <label class="field" style="margin-top:0.5rem">
            <span class="field__label">{{ __('ui.notes') }}</span>
            <input class="field__input" type="text" name="note" value="{{ old('note') }}" placeholder="{{ __('ui.optional') }}">
        </label>

        <div class="sticky-cta sticky-cta--sell sticky-cta--debt no-print">
            <div class="sticky-cta__meta">
                <span>{{ __('ui.reject_credit') }}</span>
                <strong data-reject-credit-sticky dir="ltr">0</strong>
            </div>
            <button type="submit" class="btn btn--primary btn--sell-submit" data-reject-submit disabled>
                {{ __('ui.reject_submit') }}
            </button>
        </div>
    </form>
</section>

<script>
    window.JudiRejectCatalog = @json($catalog);
    window.JudiRejectLabels = {
        add: @json(__('ui.add')),
        remove: @json(__('ui.delete')),
        empty: @json(__('ui.reject_pick_items')),
        noProducts: @json(__('ui.reject_no_sold_products')),
        available: @json(__('ui.reject_available')),
    };
</script>
<script src="{{ asset('js/visit-reject.js') }}?v=2" defer></script>
@endsection
