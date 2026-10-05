@extends('layouts.app')

@section('title', __('ui.visit_action_reject').' — '.$store->name)

@section('content')
<section class="page reject-page reject-page--calm" data-reject-form>
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

        <div class="sell-search sell-search--with-scan">
            <label class="sell-search__field">
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
            <button
                type="button"
                class="btn btn--regular sell-search__scan"
                data-open-barcode-scan
                aria-label="{{ __('ui.barcode_scan') }}"
                title="{{ __('ui.barcode_scan') }}"
            >
                <svg class="sell-search__scan-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M4 7V5a1 1 0 0 1 1-1h2M4 17v2a1 1 0 0 0 1 1h2M20 7V5a1 1 0 0 0-1-1h-2M20 17v2a1 1 0 0 1-1 1h-2"/>
                    <path d="M7 9v6M10 9v6M13 9v4M16 9v6"/>
                </svg>
            </button>
        </div>

        <div class="sell-catalog sell-catalog--calm" data-reject-catalog></div>

        <div class="sell-cart-block">
            <div class="sell-cart-block__head">
                <span>{{ __('ui.reject_cart') }}</span>
                <strong class="sell-cart__total num" data-reject-credit dir="ltr">0</strong>
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
                <strong class="num" data-reject-credit-sticky dir="ltr">0</strong>
            </div>
            <button type="submit" class="btn btn--primary btn--sell-submit" data-reject-submit disabled>
                {{ __('ui.reject_submit') }}
            </button>
        </div>
    </form>

    <dialog class="line-sheet line-sheet--order no-print" data-reject-sheet dir="rtl">
        <h2 class="line-sheet__title">{{ __('ui.reject_add_to_return') }}</h2>
        <p class="line-sheet__name" data-reject-sheet-name></p>
        <div class="line-sheet__units" data-reject-sheet-units></div>
        <div class="line-sheet__actions">
            <button type="button" class="btn btn--ghost" data-reject-sheet-cancel>{{ __('ui.back') }}</button>
            <button type="button" class="btn btn--primary" data-reject-sheet-save>{{ __('ui.reject_add_to_return') }}</button>
        </div>
    </dialog>
</section>

<script>
    window.JudiRejectCatalog = @json($catalog);
    window.JudiRejectLabels = {
        add: @json(__('ui.add')),
        remove: @json(__('ui.delete')),
        empty: @json(__('ui.reject_pick_items')),
        noProducts: @json(__('ui.reject_no_sold_products')),
        available: @json(__('ui.reject_available')),
        addToReturn: @json(__('ui.reject_add_to_return')),
        needQty: @json(__('ui.reject_need_qty')),
        confirmSubmit: @json(__('ui.reject_confirm_submit')),
        piecePrice: @json(__('ui.invoice_piece_price')),
        barcodeNotFound: @json(__('ui.barcode_not_found')),
        barcodeNoStock: @json(__('ui.barcode_no_stock')),
        barcodeScan: @json(__('ui.barcode_scan')),
        barcodeScanHint: @json(__('ui.barcode_scan_hint')),
        barcodeScanError: @json(__('ui.barcode_scan_error')),
        brandShort: @json(__('ui.brand_short')),
        close: @json(__('ui.back')),
    };
    window.JudiBarcodeScannerFallbackSrc = @json(asset('js/vendor/html5-qrcode.min.js'));
</script>
<script src="{{ asset('js/barcode-scanner.js') }}?v=3" defer></script>
<script src="{{ asset('js/visit-reject.js') }}?v=5" defer></script>
@endsection
