@extends('layouts.app')

@section('title', __('ui.catalog'). ' — '.__('ui.brand_short'))

@section('content')
@php
    $tones = ['sky', 'teal', 'amber', 'violet', 'orange', 'emerald', 'cyan', 'indigo'];
    $canManageCategories = $canManageCategories ?? false;
    $categoryStock = $categoryStock ?? [];
@endphp
<section class="page">
    <header class="page__header page__header--iconed">
        @include('partials.icon-badge', ['icon' => 'package', 'tone' => 'emerald', 'size' => 'lg'])
        <div class="page__header-text">
            <h1 class="page__title">{{ __('ui.catalog') }}</h1>
            <p class="page__lead">{{ __('ui.catalog_lead') }}</p>
        </div>
        <div class="page__actions">
            @if ($canManageCategories)
                <a href="{{ route('categories.create') }}" class="btn btn--regular">
                    @include('partials.icons.tags', ['class' => 'btn__icon'])
                    {{ __('ui.category_new') }}
                </a>
            @endif
            @if ($canManage)
                <a href="{{ route('products.create') }}" class="btn btn--primary">
                    @include('partials.icons.plus', ['class' => 'btn__icon'])
                    {{ __('ui.product_new') }}
                </a>
            @endif
        </div>
    </header>

    @include('partials.flash')

    <form method="GET" action="{{ route('products.index') }}" class="toolbar toolbar--iconed">
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

    @if ($categories->isEmpty())
        <div class="empty-state surface-panel">
            @include('partials.icon-badge', ['icon' => 'folder', 'tone' => 'slate', 'size' => 'lg'])
            <p class="empty-state__title">{{ __('ui.categories_empty') }}</p>
            @if ($canManageCategories)
                <a href="{{ route('categories.create') }}" class="btn btn--primary">
                    @include('partials.icons.plus', ['class' => 'btn__icon'])
                    {{ __('ui.category_new') }}
                </a>
            @endif
        </div>
    @else
        <ul class="icon-grid" role="list">
            @foreach ($categories as $i => $category)
                @php $tone = $tones[$i % count($tones)]; @endphp
                <li class="icon-tile card-tone-{{ $tone }}">
                    <a href="{{ route('products.index', ['category_id' => $category->id]) }}" class="icon-tile__main">
                        @include('partials.icon-badge', ['icon' => 'folder', 'tone' => $tone, 'size' => 'md'])
                        <span class="icon-tile__body">
                            <span class="icon-tile__title">{{ $category->name }}</span>
                            <span class="icon-tile__meta">
                                @include('partials.icons.package', ['class' => 'icon-tile__meta-icon'])
                                {{ $category->products_count }} {{ __('ui.products') }}
                            </span>
                            <span class="icon-tile__meta">
                                @include('partials.icons.folder-tree', ['class' => 'icon-tile__meta-icon'])
                                {{ $category->subcategories->count() }} {{ __('ui.subcategories') }}
                            </span>
                            <span class="icon-tile__meta icon-tile__meta--stock">
                                @include('partials.icons.warehouse', ['class' => 'icon-tile__meta-icon'])
                                {{ __('ui.stock_remain') }}:
                                <strong class="ltr-inline">{{ number_format((int) ($categoryStock[$category->id] ?? 0)) }}</strong>
                                {{ __('ui.stock_pieces') }}
                            </span>
                        </span>
                    </a>

                    @if ($canManageCategories)
                        <a
                            href="{{ route('categories.edit', $category) }}"
                            class="icon-tile__action"
                            title="{{ __('ui.category_edit') }}"
                            aria-label="{{ __('ui.category_edit') }}"
                        >
                            @include('partials.icons.pencil', ['class' => 'icon-tile__action-icon'])
                        </a>
                        <a
                            href="{{ route('categories.subcategories.create', $category) }}"
                            class="icon-tile__action icon-tile__action--second"
                            title="{{ __('ui.subcategory_new') }}"
                            aria-label="{{ __('ui.subcategory_new') }}"
                        >
                            @include('partials.icons.folder-tree', ['class' => 'icon-tile__action-icon'])
                        </a>
                    @endif

                    @if ($category->subcategories->isNotEmpty())
                        <ul class="icon-tile__subs" role="list">
                            @foreach ($category->subcategories as $sub)
                                <li>
                                    <a
                                        href="{{ route('products.index', ['category_id' => $category->id, 'subcategory_id' => $sub->id]) }}"
                                        class="icon-sub"
                                    >
                                        @include('partials.icon-badge', ['icon' => 'tags', 'tone' => $tone, 'size' => 'sm'])
                                        <span class="icon-sub__text">
                                            <span class="icon-sub__name">{{ $sub->name }}</span>
                                            <span class="icon-sub__count">{{ $sub->products_count }} {{ __('ui.products') }}</span>
                                        </span>
                                        @include('partials.icons.chevron', ['class' => 'icon-sub__chevron'])
                                    </a>
                                    @if ($canManageCategories)
                                        <a href="{{ route('subcategories.edit', $sub) }}" class="icon-tile__sub-edit" title="{{ __('ui.edit') }}">
                                            @include('partials.icons.pencil', ['class' => 'icon-tile__action-icon'])
                                        </a>
                                    @endif
                                </li>
                            @endforeach
                        </ul>
                    @endif
                </li>
            @endforeach
        </ul>
    @endif
</section>
@endsection
