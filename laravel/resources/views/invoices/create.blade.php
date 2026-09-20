@extends('layouts.app')

@section('title', __('ui.invoice_new').' — JUDI')

@section('content')
<section class="page page--sell sell-page sell-wizard" data-invoice-sell data-step="1">
    <header class="sell-top no-print">
        <div class="sell-top__text">
            <h1 class="sell-top__title" data-wizard-title>{{ __('ui.sell_pick_store_title') }}</h1>
            <p class="sell-top__meta">
                {{ $channel->label() }}
                @if ($warehouse)
                    · {{ $warehouse->displayName() }}
                @endif
            </p>
        </div>
        <button type="button" class="btn btn--ghost btn--sm" data-wizard-back hidden>{{ __('ui.back') }}</button>
        <a href="{{ route('invoices.index') }}" class="btn btn--ghost btn--sm" data-exit-sell>{{ __('ui.back') }}</a>
    </header>

    <ol class="sell-steps sell-steps--3 no-print" aria-label="{{ __('ui.invoice_new') }}">
        <li class="sell-steps__item is-active" data-sell-step="store">
            <span class="sell-steps__num">1</span>
            <span>{{ __('ui.sell_step_store') }}</span>
        </li>
        <li class="sell-steps__item" data-sell-step="category">
            <span class="sell-steps__num">2</span>
            <span>{{ __('ui.sell_step_category') }}</span>
        </li>
        <li class="sell-steps__item" data-sell-step="catalog">
            <span class="sell-steps__num">3</span>
            <span>{{ __('ui.sell_step_products') }}</span>
        </li>
    </ol>

    <div class="sell-context no-print" data-sell-context hidden>
        <div class="sell-locked sell-locked--chip" data-locked-store hidden>
            <img class="sell-locked__img" data-locked-img alt="">
            <div class="sell-locked__body">
                <strong data-locked-name></strong>
                <span class="sell-locked__meta" data-locked-meta dir="ltr"></span>
            </div>
            <span class="sell-locked__debt" data-locked-debt hidden dir="ltr"></span>
            <button type="button" class="btn btn--ghost btn--sm" data-change-store>{{ __('ui.store_change') }}</button>
        </div>
        <button type="button" class="sell-crumb" data-change-category hidden>
            <span data-filter-summary></span>
        </button>
    </div>

    @include('partials.flash')

    <form method="POST" action="{{ route('invoices.store') }}" class="sell-form" id="invoice-sell-form">
        @csrf

        <div class="sell-pay" data-pay-bar hidden role="radiogroup" aria-label="{{ __('ui.invoice_type') }}">
            <label class="sell-pay__opt sell-pay__opt--cash">
                <input type="radio" name="invoice_type" value="cash" @checked(old('invoice_type', 'debt') === 'cash')>
                <span>{{ __('ui.invoice_cash') }}</span>
            </label>
            <label class="sell-pay__opt sell-pay__opt--debt">
                <input type="radio" name="invoice_type" value="debt" @checked(old('invoice_type', 'debt') === 'debt')>
                <span>{{ __('ui.invoice_debt') }}</span>
            </label>
            <input type="hidden" name="paid_now" value="{{ old('paid_now', 0) }}" data-paid-now>
            @if ($maxDiscount > 0)
                <label class="sell-pay__disc">
                    <span>{{ __('ui.invoice_discount') }} %</span>
                    <input
                        type="number"
                        name="discount_percent"
                        min="0"
                        max="{{ $maxDiscount }}"
                        step="0.01"
                        inputmode="decimal"
                        value="{{ old('discount_percent', 0) }}"
                        data-discount
                    >
                </label>
            @else
                <input type="hidden" name="discount_percent" value="0" data-discount>
            @endif
        </div>
        @error('discount_percent')
            <p class="field__error">{{ $message }}</p>
        @enderror

        <section class="sell-card sell-card--store" data-panel="store">
            <div class="sell-card__bar" style="--sell-accent:#ea580c"></div>
            <div class="sell-card__inner">
                <label class="sell-search">
                    <span class="visually-hidden">{{ __('ui.search') }}</span>
                    <input
                        class="sell-search__input"
                        type="search"
                        data-store-filter
                        placeholder="{{ __('ui.search') }}…"
                        enterkeyhint="search"
                        autocomplete="off"
                    >
                </label>
                <div class="sell-store-pick" data-store-pick>
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
                                    <span class="sell-store__debt" dir="ltr">{{ number_format((float) $store->current_debt, 0) }}</span>
                                @endif
                                <span class="sell-tile__go" aria-hidden="true">‹</span>
                            </button>
                        @endforeach
                    </div>
                </div>
                <input type="hidden" name="store_id" value="{{ old('store_id') }}" data-store-id-input>
                <p class="field__error" data-store-needed hidden>{{ __('ui.invoice_pick_store') }}</p>
                @error('store_id')
                    <p class="field__error">{{ $message }}</p>
                @enderror
            </div>
        </section>

        <section class="sell-card sell-card--browse" data-panel="browse" hidden>
            <div class="sell-card__bar" style="--sell-accent:#7c3aed"></div>
            <div class="sell-card__inner">
                <div class="sell-tiles" data-browse-cats></div>
                <div class="sell-tiles" data-browse-subs hidden></div>
            </div>
        </section>

        <section class="sell-card sell-card--catalog" data-panel="catalog" hidden>
            <div class="sell-card__bar" style="--sell-accent:#0284c7"></div>
            <div class="sell-card__inner">
                <div class="visually-hidden">
                    <select data-category-select aria-hidden="true" tabindex="-1">
                        <option value="">{{ __('ui.category') }} — {{ __('ui.all') }}</option>
                        @foreach ($categories as $category)
                            <option value="{{ $category['id'] }}">{{ $category['name'] }}</option>
                        @endforeach
                    </select>
                    <select data-subcategory-select aria-hidden="true" tabindex="-1">
                        <option value="">{{ __('ui.subcategory') }} — {{ __('ui.all') }}</option>
                    </select>
                </div>
                <label class="sell-search">
                    <span class="visually-hidden">{{ __('ui.search') }}</span>
                    <input
                        class="sell-search__input"
                        type="search"
                        data-product-filter
                        placeholder="{{ __('ui.invoice_product_search') }}"
                        enterkeyhint="search"
                        autocomplete="off"
                    >
                </label>
                <div class="sell-catalog sell-catalog--page" data-product-list></div>
            </div>
        </section>

        <section class="sell-card sell-card--cart" data-panel="cart" hidden>
            <div class="sell-card__bar" style="--sell-accent:var(--judi-600)"></div>
            <div class="sell-card__inner">
                <div class="sell-card__head">
                    <span>{{ __('ui.invoice_lines') }}</span>
                    <strong class="sell-cart__total" data-cart-total dir="ltr">0</strong>
                </div>
                <ul class="sell-cart" data-cart role="list"></ul>
                <p class="empty sell-cart__empty" data-cart-empty>{{ __('ui.invoice_cart_empty') }}</p>
                @error('lines')
                    <p class="field__error">{{ $message }}</p>
                @enderror
                <div data-lines-inputs></div>
            </div>
        </section>

        <div class="sticky-cta sticky-cta--sell no-print" data-sell-cta hidden>
            <div class="sticky-cta__meta">
                <span data-cart-count>{{ __('ui.invoice_lines') }}: 0</span>
                <strong data-cart-total-sticky dir="ltr">0</strong>
            </div>
            <button type="submit" hidden data-native-submit tabindex="-1" aria-hidden="true"></button>
            <button type="button" class="btn btn--primary btn--sell-submit" data-submit-sale disabled>
                {{ __('ui.invoice_save_print') }}
            </button>
        </div>
    </form>

    <dialog class="pay-dialog no-print" data-pay-dialog dir="rtl">
        <h2 class="pay-dialog__title">{{ __('ui.invoice_pay_ask') }}</h2>
        <p class="pay-dialog__row">
            <span>{{ __('ui.invoice_grand_total') }}</span>
            <strong data-pay-total dir="ltr">0</strong>
        </p>
        <div class="pay-dialog__paid">
            <span class="pay-dialog__paid-label">{{ __('ui.invoice_paid_now') }}</span>
            <input
                class="pay-dialog__input"
                type="text"
                inputmode="numeric"
                dir="ltr"
                data-pay-amount
                autocomplete="off"
                placeholder="0"
                aria-label="{{ __('ui.invoice_paid_now') }}"
            >
            <p class="pay-dialog__error" data-pay-error hidden>{{ __('ui.invoice_pay_required') }}</p>
        </div>
        <p class="pay-dialog__row pay-dialog__row--remain">
            <span>{{ __('ui.invoice_remaining') }}</span>
            <strong data-pay-remain dir="ltr">0</strong>
        </p>
        <div class="pay-dialog__chips">
            <button type="button" data-pay-chip="0">{{ __('ui.invoice_pay_none') }}</button>
            <button type="button" data-pay-chip="half">{{ __('ui.invoice_pay_half') }}</button>
            <button type="button" data-pay-chip="all">{{ __('ui.invoice_pay_all') }}</button>
        </div>
        <div class="pay-dialog__actions">
            <button type="button" class="btn btn--ghost" data-pay-cancel>{{ __('ui.back') }}</button>
            <button type="button" class="btn btn--primary" data-pay-confirm>{{ __('ui.invoice_save_print') }}</button>
        </div>
    </dialog>
</section>

<script>
    window.JudiInvoiceCatalog = @json($catalog);
    window.JudiInvoiceCategories = @json($categories);
    window.JudiInvoiceOldLines = @json(old('lines', []));
    window.JudiInvoiceLabels = {
        all: @json(__('ui.all')),
        gift: @json(__('ui.invoice_gift')),
        pickCategory: @json(__('ui.invoice_pick_category')),
        noProducts: @json(__('ui.invoice_no_products_in_filter')),
        lines: @json(__('ui.invoice_lines')),
        currentDebt: @json(__('ui.current_debt')),
        add: @json(__('ui.add')),
        changeStore: @json(__('ui.store_change')),
        confirmChangeStore: @json(__('ui.confirm_change_store')),
        remaining: @json(__('ui.invoice_remaining')),
        paidNow: @json(__('ui.invoice_paid_now')),
        payAsk: @json(__('ui.invoice_pay_ask')),
        grandTotal: @json(__('ui.invoice_grand_total')),
        pickStore: @json(__('ui.invoice_pick_store')),
        payRequired: @json(__('ui.invoice_pay_required')),
        pickStoreTitle: @json(__('ui.sell_pick_store_title')),
        pickCategoryTitle: @json(__('ui.sell_pick_category_title')),
        pickSubcategoryTitle: @json(__('ui.sell_pick_subcategory_title')),
        pickProductsTitle: @json(__('ui.sell_pick_products_title')),
        allInCategory: @json(__('ui.sell_all_in_category')),
        itemsCount: @json(__('ui.sell_items_count')),
    };
</script>
<script src="{{ asset('js/invoice-sell.js') }}?v=19" defer></script>
@endsection
