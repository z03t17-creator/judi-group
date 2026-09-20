@extends('layouts.app')

@section('title', ($selectedCategory?->name ?? __('ui.products')).' — JUDI')

@section('content')
<section class="page list-page">
    <header class="page__header page__header--iconed">
        @include('partials.icon-badge', ['icon' => 'package', 'tone' => 'emerald', 'size' => 'lg'])
        <div class="page__header-text">
            <h1 class="page__title">
                @if ($selectedCategory)
                    {{ $selectedCategory->name }}
                    @if ($selectedSubcategory)
                        / {{ $selectedSubcategory->name }}
                    @endif
                @else
                    {{ __('ui.products') }}
                @endif
            </h1>
            <p class="page__lead">{{ __('ui.product_lead') }}</p>
        </div>
        <div class="page__actions">
            @include('partials.print-button', ['label' => __('ui.print_list')])
            <a href="{{ route('products.index') }}" class="btn btn--regular">
                @include('partials.icons.arrow-back', ['class' => 'btn__icon'])
                {{ __('ui.products_all_categories') }}
            </a>
            @if ($canManage)
                <a href="{{ route('products.create') }}" class="btn btn--primary">
                    @include('partials.icons.plus', ['class' => 'btn__icon'])
                    {{ __('ui.product_new') }}
                </a>
            @endif
        </div>
    </header>

    @include('partials.print-doc-head', [
        'printTitle' => __('ui.products'),
        'printSubtitle' => __('ui.product_lead'),
        'printFilters' => array_values(array_filter([
            request('q') ? ['label' => __('ui.search'), 'value' => request('q')] : null,
            isset($selectedCategory) && $selectedCategory
                ? ['label' => __('ui.categories'), 'value' => $selectedCategory->name.($selectedSubcategory ? ' / '.$selectedSubcategory->name : '')]
                : null,
        ])),
    ])

    @include('partials.flash')

    @if ($selectedCategory)
        <nav class="browse-chips" aria-label="{{ __('ui.subcategories') }}">
            <a
                href="{{ route('products.index', ['category_id' => $selectedCategory->id]) }}"
                class="browse-chip {{ ! $selectedSubcategory ? 'is-active' : '' }}"
            >
                {{ __('ui.all') }}
            </a>
            @foreach ($selectedCategory->subcategories as $sub)
                <a
                    href="{{ route('products.index', ['category_id' => $selectedCategory->id, 'subcategory_id' => $sub->id]) }}"
                    class="browse-chip {{ $selectedSubcategory?->id === $sub->id ? 'is-active' : '' }}"
                >
                    {{ $sub->name }}
                    <span class="muted">({{ $sub->products_count }})</span>
                </a>
            @endforeach
        </nav>
    @endif

    <form method="GET" action="{{ route('products.index') }}" class="toolbar toolbar--iconed">
        @if ($selectedCategory)
            <input type="hidden" name="category_id" value="{{ $selectedCategory->id }}">
        @endif
        @if ($selectedSubcategory)
            <input type="hidden" name="subcategory_id" value="{{ $selectedSubcategory->id }}">
        @endif
        <label class="field field--grow field--search">
            <span class="field__label visually-hidden">{{ __('ui.search') }}</span>
            <span class="field__search-icon" aria-hidden="true">
                @include('partials.icons.search', ['class' => 'field__search-svg'])
            </span>
            <input class="field__input field__input--search" type="search" name="q" value="{{ request('q') }}" placeholder="{{ __('ui.invoice_product_search') }}" enterkeyhint="search">
        </label>
        <button type="submit" class="btn btn--regular">
            @include('partials.icons.search', ['class' => 'btn__icon'])
            {{ __('ui.search') }}
        </button>
    </form>

    <div class="directory-cards">
        @forelse ($products as $product)
            @php $piece = $product->unit(\App\Enums\ProductUnitKind::Piece); @endphp
            <a
                href="{{ $canManage ? route('products.edit', $product) : '#' }}"
                class="dir-card"
                @if(! $canManage) onclick="return false" @endif
            >
                <div class="dir-card__body">
                    <div class="dir-card__row">
                        <img class="dir-card__img" src="{{ $product->imageUrl() }}" alt="">
                        <div>
                            <p class="dir-card__title">{{ $product->name }}</p>
                            <p class="dir-card__meta">
                                {{ $product->sku }}
                                · {{ __('ui.price_wholesale') }}
                                <span class="ltr-inline">{{ number_format((float) ($piece?->price_wholesale ?? 0), 0) }}</span>
                                · {{ __('ui.price_retail') }}
                                <span class="ltr-inline">{{ number_format((float) ($piece?->price_retail ?? 0), 0) }}</span>
                            </p>
                        </div>
                    </div>
                </div>
                @if ($canManage)
                    @include('partials.icons.chevron', ['class' => 'dir-card__chevron'])
                @endif
            </a>
        @empty
            <div class="surface-panel"><p class="empty">{{ __('ui.products_empty') }}</p></div>
        @endforelse
    </div>

    <div class="directory-table report-section" style="--report-accent: #059669">
        <div class="report-section__head">
            <h2 class="report-section__title">{{ __('ui.products') }}</h2>
        </div>
        <div class="table-wrap report-table-wrap">
            <table class="data-table report-table">
                <thead>
                    <tr>
                        <th>{{ __('ui.product_name') }}</th>
                        <th>{{ __('ui.sku') }}</th>
                        <th>{{ __('ui.pack_title') }}</th>
                        <th>{{ __('ui.price_wholesale') }}</th>
                        <th>{{ __('ui.price_retail') }}</th>
                        <th>{{ __('ui.active') }}</th>
                        @if ($canManage)
                            <th class="no-print"></th>
                        @endif
                    </tr>
                </thead>
                <tbody>
                    @forelse ($products as $product)
                        @php $piece = $product->unit(\App\Enums\ProductUnitKind::Piece); @endphp
                        <tr>
                            <td>
                                <div class="table-entity">
                                    <img class="table-entity__img" src="{{ $product->imageUrl() }}" alt="">
                                    <div>
                                        <strong>{{ $product->name }}</strong>
                                        @if ($product->pack_spec)
                                            <span class="muted block">{{ $product->pack_spec }}</span>
                                        @endif
                                    </div>
                                </div>
                            </td>
                            <td>
                                <code class="ltr-inline">{{ $product->sku }}</code>
                                @if ($product->barcode)
                                    <span class="muted block ltr-inline">{{ $product->barcode }}</span>
                                @endif
                            </td>
                            <td>
                                {{ $product->pieces_per_packet }} {{ __('ui.piece') }}/{{ __('ui.packet') }}
                                · {{ $product->pieces_per_carton }} {{ __('ui.piece') }}/{{ __('ui.carton') }}
                            </td>
                            <td><span class="ltr-inline report-num">{{ number_format((float) ($piece?->price_wholesale ?? 0), 0) }}</span></td>
                            <td><span class="ltr-inline report-num">{{ number_format((float) ($piece?->price_retail ?? 0), 0) }}</span></td>
                            <td>
                                <span class="badge {{ $product->is_active ? 'badge--ok' : 'badge--off' }}">
                                    {{ $product->is_active ? __('ui.active') : __('ui.inactive') }}
                                </span>
                            </td>
                            @if ($canManage)
                                <td class="data-table__actions">
                                    <a href="{{ route('products.edit', $product) }}" class="btn btn--regular btn--sm">
                                        @include('partials.icons.pencil', ['class' => 'btn__icon'])
                                        {{ __('ui.edit') }}
                                    </a>
                                </td>
                            @endif
                        </tr>
                    @empty
                        <tr>
                            <td colspan="{{ $canManage ? 7 : 6 }}" class="empty">{{ __('ui.products_empty') }}</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>

    @if ($products->hasPages())
        <div class="pager">{{ $products->links() }}</div>
    @endif
</section>
@endsection
