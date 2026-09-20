@extends('layouts.app')

@section('title', ($supplier->exists ? __('ui.supplier_edit') : __('ui.supplier_new')).' — JUDI')

@section('content')
<section class="page">
    <header class="page__header page__header--iconed">
        @include('partials.icon-badge', ['icon' => $supplier->exists ? 'pencil' : 'plus', 'tone' => 'slate', 'size' => 'lg'])
        <div class="page__header-text">
            <h1 class="page__title">{{ $supplier->exists ? __('ui.supplier_edit') : __('ui.supplier_new') }}</h1>
            <p class="page__lead">{{ __('ui.suppliers_lead') }}</p>
        </div>
        <a href="{{ route('suppliers.index') }}" class="btn btn--regular">
            @include('partials.icons.arrow-back', ['class' => 'btn__icon'])
            {{ __('ui.back') }}
        </a>
    </header>

    @if ($errors->any())
        <div class="alert alert--danger" role="alert">{{ $errors->first() }}</div>
    @endif

    <form
        method="POST"
        action="{{ $supplier->exists ? route('suppliers.update', $supplier) : route('suppliers.store') }}"
        class="surface-panel form-panel"
    >
        @csrf
        @if ($supplier->exists)
            @method('PUT')
        @endif

        <div class="form-grid form-grid--store">
            <label class="field">
                <span class="field__label">{{ __('ui.supplier_name') }}</span>
                <input class="field__input" type="text" name="name" value="{{ old('name', $supplier->name) }}" required>
            </label>
            <label class="field">
                <span class="field__label">{{ __('ui.phone') }}</span>
                <input class="field__input" type="text" name="phone" value="{{ old('phone', $supplier->phone) }}" dir="ltr" inputmode="tel">
            </label>
        </div>

        <label class="check check--spaced">
            <input type="checkbox" name="is_active" value="1" @checked(old('is_active', $supplier->is_active ?? true))>
            <span>{{ __('ui.active') }}</span>
        </label>

        <div class="sticky-cta">
            <button type="submit" class="btn btn--primary">{{ __('ui.save') }}</button>
            @if ($supplier->exists)
                <button type="submit" form="supplier-delete" class="btn btn--danger"
                    onclick="return confirm('{{ __('ui.confirm_delete_supplier') }}')">{{ __('ui.delete') }}</button>
            @endif
        </div>
    </form>

    @if ($supplier->exists)
        <form id="supplier-delete" method="POST" action="{{ route('suppliers.destroy', $supplier) }}" class="visually-hidden">
            @csrf
            @method('DELETE')
        </form>
    @endif
</section>
@endsection
