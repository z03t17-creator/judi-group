@extends('layouts.app')

@section('title', ($subcategory->exists ? __('ui.subcategory_edit') : __('ui.subcategory_new')).' — JUDI')

@section('content')
<section class="page">
    <header class="page__header page__header--iconed">
        @include('partials.icon-badge', ['icon' => 'folder-tree', 'tone' => 'teal', 'size' => 'lg'])
        <div class="page__header-text">
            <h1 class="page__title">{{ $subcategory->exists ? __('ui.subcategory_edit') : __('ui.subcategory_new') }}</h1>
            <p class="page__lead">{{ __('ui.category') }}: {{ $category->name }}</p>
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
        action="{{ $subcategory->exists ? route('subcategories.update', $subcategory) : route('categories.subcategories.store', $category) }}"
        class="surface-panel form-panel"
    >
        @csrf
        @if ($subcategory->exists)
            @method('PUT')
        @endif

        <div class="form-grid">
            <label class="field">
                <span class="field__label">{{ __('ui.subcategory') }}</span>
                <input class="field__input" type="text" name="name" value="{{ old('name', $subcategory->name) }}" required autofocus>
            </label>
            <label class="field">
                <span class="field__label">{{ __('ui.sort_order') }}</span>
                <input class="field__input" type="number" name="sort_order" min="0" value="{{ old('sort_order', $subcategory->sort_order ?? 0) }}" dir="ltr">
            </label>
        </div>

        <label class="check check--spaced">
            <input type="checkbox" name="is_active" value="1" @checked(old('is_active', $subcategory->is_active ?? true))>
            <span>{{ __('ui.active') }}</span>
        </label>

        <div class="sticky-cta">
            <button type="submit" class="btn btn--primary">{{ __('ui.save') }}</button>
            @if ($subcategory->exists)
                <button type="submit" form="subcategory-delete" class="btn btn--danger"
                    onclick="return confirm('{{ __('ui.confirm_delete_subcategory') }}')">{{ __('ui.delete') }}</button>
            @endif
        </div>
    </form>

    @if ($subcategory->exists)
        <form id="subcategory-delete" method="POST" action="{{ route('subcategories.destroy', $subcategory) }}" class="visually-hidden">
            @csrf
            @method('DELETE')
        </form>
    @endif
</section>
@endsection
