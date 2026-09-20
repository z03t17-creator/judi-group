@extends('layouts.app')

@section('title', ($category->exists ? __('ui.category_edit') : __('ui.category_new')).' — JUDI')

@section('content')
<section class="page">
    <header class="page__header page__header--iconed">
        @include('partials.icon-badge', ['icon' => $category->exists ? 'folder' : 'plus', 'tone' => 'sky', 'size' => 'lg'])
        <div class="page__header-text">
            <h1 class="page__title">{{ $category->exists ? __('ui.category_edit') : __('ui.category_new') }}</h1>
            <p class="page__lead">{{ __('ui.categories_lead') }}</p>
        </div>
        <a href="{{ route('categories.index') }}" class="btn btn--regular">
            @include('partials.icons.arrow-back', ['class' => 'btn__icon'])
            {{ __('ui.back') }}
        </a>
    </header>

    @if ($errors->any())
        <div class="alert alert--danger" role="alert">{{ $errors->first() }}</div>
    @endif

    <form
        method="POST"
        action="{{ $category->exists ? route('categories.update', $category) : route('categories.store') }}"
        class="surface-panel form-panel"
    >
        @csrf
        @if ($category->exists)
            @method('PUT')
        @endif

        <div class="form-grid">
            <label class="field">
                <span class="field__label">{{ __('ui.category') }}</span>
                <input class="field__input" type="text" name="name" value="{{ old('name', $category->name) }}" required autofocus>
            </label>
            <label class="field">
                <span class="field__label">{{ __('ui.sort_order') }}</span>
                <input class="field__input" type="number" name="sort_order" min="0" value="{{ old('sort_order', $category->sort_order ?? 0) }}" dir="ltr">
            </label>
        </div>

        <label class="check check--spaced">
            <input type="checkbox" name="is_active" value="1" @checked(old('is_active', $category->is_active ?? true))>
            <span>{{ __('ui.active') }}</span>
        </label>

        <div class="sticky-cta">
            <button type="submit" class="btn btn--primary">{{ __('ui.save') }}</button>
            @if ($category->exists)
                <a href="{{ route('categories.subcategories.create', $category) }}" class="btn btn--regular">
                    @include('partials.icons.folder-tree', ['class' => 'btn__icon'])
                    {{ __('ui.subcategory_new') }}
                </a>
                <button type="submit" form="category-delete" class="btn btn--danger"
                    onclick="return confirm('{{ __('ui.confirm_delete_category') }}')">{{ __('ui.delete') }}</button>
            @endif
        </div>
    </form>

    @if ($category->exists)
        <form id="category-delete" method="POST" action="{{ route('categories.destroy', $category) }}" class="visually-hidden">
            @csrf
            @method('DELETE')
        </form>

        @php
            $subs = $category->subcategories()->withCount('products')->orderBy('sort_order')->orderBy('name')->get();
        @endphp

        <section class="surface-panel icon-section">
            <header class="icon-section__head">
                @include('partials.icon-badge', ['icon' => 'folder-tree', 'tone' => 'teal', 'size' => 'md'])
                <div>
                    <h2 class="icon-section__title">{{ __('ui.subcategories') }}</h2>
                    <p class="icon-section__lead">{{ $subs->count() }} {{ __('ui.subcategories') }}</p>
                </div>
                <a href="{{ route('categories.subcategories.create', $category) }}" class="btn btn--primary btn--sm">
                    @include('partials.icons.plus', ['class' => 'btn__icon'])
                    {{ __('ui.subcategory_new') }}
                </a>
            </header>

            @if ($subs->isEmpty())
                <p class="empty">{{ __('ui.no_subcategories') }}</p>
            @else
                <ul class="icon-grid icon-grid--compact" role="list">
                    @foreach ($subs as $sub)
                        <li>
                            <a href="{{ route('subcategories.edit', $sub) }}" class="icon-tile icon-tile--flat">
                                <span class="icon-tile__main">
                                    @include('partials.icon-badge', ['icon' => 'tags', 'tone' => 'teal', 'size' => 'md'])
                                    <span class="icon-tile__body">
                                        <span class="icon-tile__title">{{ $sub->name }}</span>
                                        <span class="icon-tile__meta">
                                            @include('partials.icons.package', ['class' => 'icon-tile__meta-icon'])
                                            {{ $sub->products_count }} {{ __('ui.products') }}
                                        </span>
                                    </span>
                                    @include('partials.icons.chevron', ['class' => 'icon-sub__chevron'])
                                </span>
                            </a>
                        </li>
                    @endforeach
                </ul>
            @endif
        </section>
    @endif
</section>
@endsection
