@extends('layouts.app')

@section('title', __('ui.purchase_new').' — JUDI')

@section('content')
<section class="page" data-purchase-receive>
    <header class="page__header page__header--iconed">
        @include('partials.icon-badge', ['icon' => 'plus', 'tone' => 'emerald', 'size' => 'lg'])
        <div class="page__header-text">
            <h1 class="page__title">{{ __('ui.purchase_new') }}</h1>
            <p class="page__lead">
                {{ __('ui.purchase_lead') }}
                @if ($warehouse)
                    · {{ $warehouse->displayName() }}
                @endif
            </p>
        </div>
        <a href="{{ route('purchases.index') }}" class="btn btn--regular">
            @include('partials.icons.arrow-back', ['class' => 'btn__icon'])
            {{ __('ui.back') }}
        </a>
    </header>

    @include('partials.flash')

    @if ($errors->any())
        <div class="alert alert--danger" role="alert">{{ $errors->first() }}</div>
    @endif

    @unless ($warehouse)
        <div class="alert alert--danger" role="alert">{{ __('ui.stock_no_warehouse') }}</div>
    @else
        <form method="POST" action="{{ route('purchases.store') }}" class="surface-panel form-panel" id="purchase-form">
            @csrf

            <div class="form-grid form-grid--store">
                <label class="field">
                    <span class="field__label">{{ __('ui.invoice_date') }}</span>
                    <input
                        class="field__input"
                        type="date"
                        name="purchased_at"
                        value="{{ old('purchased_at', now()->toDateString()) }}"
                        required
                        dir="ltr"
                    >
                </label>
                <label class="field">
                    <span class="field__label">{{ __('ui.supplier') }} ({{ __('ui.optional') }})</span>
                    @php
                        $oldSupplierId = old('supplier_id');
                        $oldSupplierName = old('supplier_name');
                        if ($oldSupplierName === null && $oldSupplierId) {
                            $oldSupplierName = $suppliers->firstWhere('id', (int) $oldSupplierId)?->name;
                        }
                    @endphp
                    <input
                        class="field__input"
                        type="text"
                        name="supplier_name"
                        list="purchase-suppliers"
                        value="{{ $oldSupplierName }}"
                        placeholder="{{ __('ui.supplier_pick_or_write') }}"
                        maxlength="255"
                        autocomplete="off"
                        data-supplier-name
                    >
                    <input type="hidden" name="supplier_id" value="{{ $oldSupplierId }}" data-supplier-id>
                    <datalist id="purchase-suppliers">
                        @foreach ($suppliers as $supplier)
                            <option value="{{ $supplier->name }}" data-id="{{ $supplier->id }}">
                                @if ($supplier->phone)
                                    {{ $supplier->phone }}
                                @endif
                            </option>
                        @endforeach
                    </datalist>
                </label>
                <label class="field field--wide">
                    <span class="field__label">{{ __('ui.notes') }}</span>
                    <input class="field__input" type="text" name="notes" value="{{ old('notes') }}" maxlength="500">
                </label>
            </div>

            <div class="purchase-pick">
                <section class="purchase-catalog" data-purchase-catalog>
                    <div class="purchase-catalog__head">
                        <div class="purchase-catalog__title">
                            @include('partials.icon-badge', ['icon' => 'package', 'tone' => 'emerald', 'size' => 'sm'])
                            <span>{{ __('ui.products') }}</span>
                            <em data-catalog-count></em>
                        </div>
                        <label class="purchase-catalog__search">
                            <span class="visually-hidden">{{ __('ui.search') }}</span>
                            @include('partials.icons.search', ['class' => 'purchase-catalog__search-icon'])
                            <input
                                class="purchase-catalog__search-input"
                                type="search"
                                data-product-filter
                                placeholder="{{ __('ui.invoice_product_search') }}"
                                enterkeyhint="search"
                                autocomplete="off"
                            >
                        </label>
                    </div>

                    <div class="purchase-cat-rail" data-category-rail role="list">
                        <button type="button" class="purchase-cat is-active" data-category-id="" role="listitem">
                            @include('partials.icon-badge', ['icon' => 'folder', 'tone' => 'slate', 'size' => 'sm'])
                            <span class="purchase-cat__copy">
                                <strong>{{ __('ui.products_all_categories') }}</strong>
                                <small>{{ $catalog->count() }} {{ __('ui.products') }}</small>
                            </span>
                        </button>
                        @foreach ($categories as $category)
                            <button type="button" class="purchase-cat card-tone-{{ $category['tone'] }}" data-category-id="{{ $category['id'] }}" role="listitem">
                                @include('partials.icon-badge', ['icon' => 'folder', 'tone' => $category['tone'], 'size' => 'sm'])
                                <span class="purchase-cat__copy">
                                    <strong>{{ $category['name'] }}</strong>
                                    <small>{{ $category['products_count'] }} {{ __('ui.products') }} · {{ $category['subcategories']->count() }} {{ __('ui.subcategories') }}</small>
                                </span>
                            </button>
                        @endforeach
                    </div>

                    <div class="purchase-sub-rail" data-subcategory-rail hidden></div>
                    <div class="purchase-product-grid" data-product-list></div>
                </section>

                <div class="purchase-lines-block">
                    <div class="purchase-lines-block__head">
                        @include('partials.icon-badge', ['icon' => 'clipboard', 'tone' => 'teal', 'size' => 'sm'])
                        <span>{{ __('ui.invoice_lines') }}</span>
                    </div>
                    <p class="purchase-lines-empty" data-lines-empty>{{ __('ui.purchase_lines_empty') }}</p>
                    <div class="table-wrap">
                        <table class="data-table" data-purchase-lines>
                            <thead>
                                <tr>
                                    <th>{{ __('ui.product_name') }}</th>
                                    <th>{{ __('ui.unit') }}</th>
                                    <th>{{ __('ui.invoice_qty') }}</th>
                                    <th>{{ __('ui.unit_cost') }}</th>
                                    <th>{{ __('ui.invoice_line_total') }}</th>
                                    <th class="no-print"></th>
                                </tr>
                            </thead>
                            <tbody data-lines-body></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="page__actions" style="margin-top:0.75rem">
                <button type="button" class="btn btn--regular" data-add-line>
                    @include('partials.icons.plus', ['class' => 'btn__icon'])
                    {{ __('ui.add_line') }}
                </button>
            </div>

            <p class="muted" style="margin-top:0.75rem">
                {{ __('ui.invoice_grand_total') }}:
                <strong dir="ltr" data-grand-total>0</strong>
            </p>

            <div class="sticky-cta">
                <button type="submit" class="btn btn--primary">{{ __('ui.purchase_receive') }}</button>
            </div>
        </form>
    @endunless
</section>

@unless ($warehouse)
@else
<script>
window.JUDI_PURCHASE_CATALOG = @json($catalog);
window.JUDI_PURCHASE_CATEGORIES = @json($categories);
window.JUDI_PURCHASE_LABELS = {
    all: @json(__('ui.all')),
    products: @json(__('ui.products')),
    noProducts: @json(__('ui.invoice_no_products_in_filter')),
    allSubcategories: @json(__('ui.subcategory').' — '.__('ui.all')),
};
</script>
<script src="{{ asset('js/purchase-receive.js') }}?v=4" defer></script>
@endunless
@endsection
