@extends('layouts.app')

@section('title', __('ui.categories').' — JUDI')

@section('content')
@php
    $tones = ['sky', 'teal', 'amber', 'violet', 'orange', 'emerald', 'cyan', 'indigo'];
@endphp
<section class="page">
    <header class="page__header page__header--iconed">
        @include('partials.icon-badge', ['icon' => 'tags', 'tone' => 'sky', 'size' => 'lg'])
        <div class="page__header-text">
            <h1 class="page__title">{{ __('ui.categories') }}</h1>
            <p class="page__lead">{{ __('ui.categories_lead') }}</p>
        </div>
        <div class="page__actions">
            <a href="{{ route('products.index') }}" class="btn btn--regular">
                @include('partials.icons.package', ['class' => 'btn__icon'])
                {{ __('ui.products') }}
            </a>
            @if ($canManage)
                <a href="{{ route('categories.create') }}" class="btn btn--primary">
                    @include('partials.icons.plus', ['class' => 'btn__icon'])
                    {{ __('ui.category_new') }}
                </a>
            @endif
        </div>
    </header>

    @include('partials.flash')

    @if ($errors->has('category'))
        <div class="alert alert--danger" role="alert">{{ $errors->first('category') }}</div>
    @endif

    <form method="GET" action="{{ route('categories.index') }}" class="toolbar toolbar--iconed">
        <label class="field field--grow field--search">
            <span class="field__label visually-hidden">{{ __('ui.search') }}</span>
            <span class="field__search-icon" aria-hidden="true">
                @include('partials.icons.search', ['class' => 'field__search-svg'])
            </span>
            <input class="field__input field__input--search" type="search" name="q" value="{{ request('q') }}" placeholder="{{ __('ui.category') }} / {{ __('ui.subcategory') }}…" enterkeyhint="search">
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
            @if ($canManage)
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
                    <a
                        href="{{ $canManage ? route('categories.edit', $category) : '#' }}"
                        class="icon-tile__main"
                        @if(! $canManage) onclick="return false" @endif
                    >
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

                    @if ($canManage)
                        <a
                            href="{{ route('categories.subcategories.create', $category) }}"
                            class="icon-tile__action"
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
                                        href="{{ $canManage ? route('subcategories.edit', $sub) : '#' }}"
                                        class="icon-sub"
                                        @if(! $canManage) onclick="return false" @endif
                                    >
                                        @include('partials.icon-badge', ['icon' => 'tags', 'tone' => $tone, 'size' => 'sm'])
                                        <span class="icon-sub__text">
                                            <span class="icon-sub__name">{{ $sub->name }}</span>
                                            <span class="icon-sub__count">{{ $sub->products_count }} {{ __('ui.products') }}</span>
                                        </span>
                                        @include('partials.icons.chevron', ['class' => 'icon-sub__chevron'])
                                    </a>
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
