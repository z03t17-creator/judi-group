@extends('layouts.app')

@section('title', __('ui.products').' — JUDI')

@section('content')
@php
    $tones = ['sky', 'teal', 'amber', 'violet', 'orange', 'emerald', 'cyan', 'indigo'];
@endphp
<section class="page">
    <header class="page__header page__header--iconed">
        @include('partials.icon-badge', ['icon' => 'package', 'tone' => 'emerald', 'size' => 'lg'])
        <div class="page__header-text">
            <h1 class="page__title">{{ __('ui.products') }}</h1>
            <p class="page__lead">{{ __('ui.products_browse_lead') }}</p>
        </div>
        <div class="page__actions">
            @if ($canManage)
                <a href="{{ route('categories.index') }}" class="btn btn--regular">
                    @include('partials.icons.tags', ['class' => 'btn__icon'])
                    {{ __('ui.categories') }}
                </a>
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
                        </span>
                    </a>
                </li>
            @endforeach
        </ul>
    @endif
</section>
@endsection
