@extends('layouts.app')

@section('title', __('ui.invoice_new'). ' — '.__('ui.brand_short'))

@section('content')
<section class="page page--sell sell-page sell-order" data-invoice-sell data-step="1" data-max-discount="{{ $maxDiscount }}" data-max-gift="{{ $maxGift }}" @if (!empty($visitLockedStoreId)) data-visit-locked-store="{{ $visitLockedStoreId }}" @endif>
    <header class="sell-top no-print">
        <div class="sell-top__text">
            <h1 class="sell-top__title" data-wizard-title>{{ !empty($activeVisit) ? __('ui.sell_pick_products_title') : __('ui.sell_pick_store_title') }}</h1>
            <p class="sell-top__meta">
                {{ $channel->label() }}
                · {{ __('ui.invoice_debt') }}
                @if (!empty($activeVisit))
                    · {{ $activeVisit->store?->name }}
                @endif
                @if ($warehouse)
                    · {{ $warehouse->displayName() }}
                @endif
            </p>
        </div>
        @if (!empty($activeVisit))
            <a href="{{ route('visits.show', $activeVisit) }}" class="btn btn--ghost btn--sm">{{ __('ui.visit_hub') }}</a>
        @else
            <button type="button" class="btn btn--ghost btn--sm" data-wizard-back hidden>{{ __('ui.back') }}</button>
            <a href="{{ auth()->user()?->isCollector() ? route('reports.index') : route('invoices.index') }}" class="btn btn--ghost btn--sm" data-exit-sell>{{ __('ui.back') }}</a>
        @endif
    </header>

    <div class="sell-context no-print" data-sell-context @if (!empty($activeVisit)) @else hidden @endif>
        <div class="sell-locked sell-locked--chip" data-locked-store @if (empty($activeVisit)) hidden @endif>
            <img class="sell-locked__img" data-locked-img alt="" @if (!empty($activeVisit)) src="{{ $activeVisit->store?->imageUrl() }}" @endif>
            <div class="sell-locked__body">
                <strong data-locked-name>@if (!empty($activeVisit)){{ $activeVisit->store?->name }}@endif</strong>
                <span class="sell-locked__meta" data-locked-meta dir="ltr">@if (!empty($activeVisit)){{ $activeVisit->store?->phone }}@endif</span>
            </div>
            <span class="sell-locked__debt num" data-locked-debt @if (empty($activeVisit) || (float) ($activeVisit->store?->current_debt ?? 0) <= 0) hidden @endif dir="ltr">
                @if (!empty($activeVisit) && (float) ($activeVisit->store?->current_debt ?? 0) > 0)
                    {{ number_format((float) $activeVisit->store->current_debt, 0) }}
                @endif
            </span>
            @if (empty($activeVisit))
                <button type="button" class="btn btn--ghost btn--sm" data-change-store>{{ __('ui.store_change') }}</button>
            @endif
        </div>
    </div>

    @include('partials.flash')
    @error('invoice')
        <p class="field__error">{{ $message }}</p>
    @enderror

    <form method="POST" action="{{ route('invoices.store') }}" class="sell-form sell-form--calm" id="invoice-sell-form">
        @csrf

        <section class="sell-panel sell-panel--store" data-panel="store" @if (!empty($activeVisit)) hidden @endif>
            <label class="sell-search">
                <span class="visually-hidden">{{ __('ui.search') }}</span>
                <input
                    class="sell-search__input"
                    type="search"
                    data-store-filter
                    placeholder="{{ __('ui.search_store') }}"
                    enterkeyhint="search"
                    autocomplete="off"
                >
            </label>
            <div class="sell-store-list sell-store-list--page" data-store-list role="listbox" aria-label="{{ __('ui.stores') }}">
                @foreach ($stores as $store)
                    <button
                        type="button"
                        class="sell-store sell-store--page"
                        data-store-option
                        data-store-id="{{ $store->id }}"
                        data-store-name="{{ $store->name }}"
                        data-store-phone="{{ $store->phone }}"
                        data-store-debt="{{ number_format((float) $store->current_debt, 0) }}"
                        data-store-image="{{ $store->imageUrl() }}"
                        data-search="{{ mb_strtolower($store->name.' '.$store->owner_name.' '.$store->phone.' '.$store->address) }}"
                    >
                        <img class="sell-store__img" src="{{ $store->imageUrl() }}" alt="">
                        <span class="sell-store__body">
                            <strong>{{ $store->name }}</strong>
                            <span class="sell-store__phone" dir="ltr">{{ $store->phone }}</span>
                        </span>
                        @if ((float) $store->current_debt > 0)
                            <span class="sell-store__debt num" dir="ltr">{{ number_format((float) $store->current_debt, 0) }}</span>
                        @endif
                        <span class="sell-tile__go" aria-hidden="true">‹</span>
                    </button>
                @endforeach
            </div>
            <input type="hidden" name="store_id" value="{{ old('store_id', $visitLockedStoreId ?? '') }}" data-store-id-input>
            <p class="field__error" data-store-needed hidden>{{ __('ui.invoice_pick_store') }}</p>
            @error('store_id')
                <p class="field__error">{{ $message }}</p>
            @enderror
        </section>

        <section class="sell-panel sell-panel--order" data-panel="catalog" @if (!empty($activeVisit)) @else hidden @endif>
            <label class="sell-search">
                <span class="visually-hidden">{{ __('ui.search') }}</span>
                <input
                    class="sell-search__input"
                    type="search"
                    data-product-filter
                    placeholder="{{ __('ui.invoice_product_search') }}"
                    enterkeyhint="search"
                    autocomplete="off"
                    data-scan-focus
                >
            </label>

            <div class="sell-filter-deck sell-filter-deck--slim" data-filter-deck>
                <div class="sell-pill-rail" data-category-rail role="listbox" aria-label="{{ __('ui.category') }}"></div>
                <div class="sell-filter-sub" data-sub-block hidden>
                    <div class="sell-pill-rail" data-subcategory-rail role="listbox" aria-label="{{ __('ui.subcategory') }}"></div>
                </div>
                <button type="button" class="btn btn--ghost btn--sm sell-clear-filters" data-clear-filters hidden>
                    {{ __('ui.sell_clear_filters') }}
                </button>
            </div>

            <div class="sell-catalog sell-catalog--calm" data-product-list></div>

            <div class="sell-cart-block" data-panel="cart">
                <div class="sell-cart-block__head">
                    <span>{{ __('ui.invoice_lines') }}</span>
                    <strong class="sell-cart__total num" data-cart-subtotal dir="ltr">0</strong>
                </div>
                <ul class="sell-cart sell-cart--calm" data-cart role="list"></ul>
                <p class="empty sell-cart__empty" data-cart-empty>{{ __('ui.invoice_cart_empty') }}</p>
                @error('lines')
                    <p class="field__error">{{ $message }}</p>
                @enderror
                <div data-lines-inputs></div>
            </div>
        </section>

        <div class="sticky-cta sticky-cta--sell sticky-cta--debt no-print" data-sell-cta @if (!empty($activeVisit)) @else hidden @endif>
            <div class="sticky-cta__discount">
                @if ($maxDiscount > 0)
                    <label class="sell-invoice-disc">
                        <span>{{ __('ui.invoice_total_discount') }} %</span>
                        <input
                            class="num"
                            type="number"
                            name="discount_percent"
                            min="0"
                            max="{{ $maxDiscount }}"
                            step="0.01"
                            inputmode="decimal"
                            value="{{ old('discount_percent', 0) }}"
                            data-discount
                            dir="ltr"
                            aria-label="{{ __('ui.invoice_total_discount') }}"
                        >
                    </label>
                @else
                    <input type="hidden" name="discount_percent" value="0" data-discount>
                    <span class="sell-invoice-disc__hint">{{ __('ui.invoice_debt') }}</span>
                @endif
                @error('discount_percent')
                    <p class="field__error">{{ $message }}</p>
                @enderror
            </div>
            <div class="sticky-cta__meta">
                <span data-cart-count>{{ __('ui.invoice_lines') }}: 0</span>
                <strong class="num" data-cart-total-sticky dir="ltr">0</strong>
            </div>
            <button type="submit" class="btn btn--primary btn--sell-submit" data-submit-sale disabled>
                {{ __('ui.invoice_save_print') }}
            </button>
        </div>
    </form>

    <dialog class="line-sheet line-sheet--order no-print" data-line-sheet dir="rtl">
        <h2 class="line-sheet__title" data-line-sheet-title>{{ __('ui.sell_add_to_order') }}</h2>
        <p class="line-sheet__name" data-line-sheet-name></p>
        <p class="line-sheet__piece-hint num" data-line-sheet-piece-hint dir="ltr" hidden></p>

        <div class="line-sheet__units" data-line-sheet-units></div>

        <div class="line-sheet__actions">
            <button type="button" class="btn btn--ghost" data-line-sheet-cancel>{{ __('ui.back') }}</button>
            <button type="button" class="btn btn--primary" data-line-sheet-save>{{ __('ui.sell_add_to_order') }}</button>
        </div>
    </dialog>
</section>

<script>
    window.JudiInvoiceCatalog = @json($catalog);
    window.JudiInvoiceCategories = @json($categories);
    window.JudiInvoiceOldLines = @json(old('lines', []));
    window.JudiInvoiceMaxDiscount = {{ (float) $maxDiscount }};
    window.JudiInvoiceLabels = {
        all: @json(__('ui.all')),
        editLine: @json(__('ui.edit')),
        pickCategory: @json(__('ui.invoice_pick_category')),
        noProducts: @json(__('ui.invoice_no_products_in_filter')),
        lines: @json(__('ui.invoice_lines')),
        currentDebt: @json(__('ui.current_debt')),
        add: @json(__('ui.add')),
        changeStore: @json(__('ui.store_change')),
        confirmChangeStore: @json(__('ui.confirm_change_store')),
        pickStore: @json(__('ui.invoice_pick_store')),
        pickStoreTitle: @json(__('ui.sell_pick_store_title')),
        pickProductsTitle: @json(__('ui.sell_pick_products_title')),
        allInCategory: @json(__('ui.sell_all_in_category')),
        allCategories: @json(__('ui.sell_all_categories')),
        category: @json(__('ui.category')),
        subcategory: @json(__('ui.subcategory')),
        debtOnly: @json(__('ui.invoice_debt')),
        addToOrder: @json(__('ui.sell_add_to_order')),
        confirmSavePrint: @json(__('ui.sell_confirm_save_print')),
        piecePrice: @json(__('ui.invoice_piece_price')),
        cartonPrice: @json(__('ui.sell_carton_price')),
        chooseUnits: @json(__('ui.sell_choose_units')),
        needQty: @json(__('ui.sell_need_qty')),
        remove: @json(__('ui.delete')),
    };
</script>
<script src="{{ asset('js/invoice-sell.js') }}?v=33" defer></script>
@endsection
