@extends('layouts.app')

@section('title', __('ui.expense_new').' — JUDI')

@section('content')
<section class="page">
    <header class="page__header page__header--iconed">
        @include('partials.icon-badge', ['icon' => 'plus', 'tone' => 'sky', 'size' => 'lg'])
        <div class="page__header-text">
            <h1 class="page__title">{{ __('ui.expense_new') }}</h1>
            <p class="page__lead">{{ __('ui.expenses_lead') }}</p>
        </div>
        <a href="{{ route('expenses.index') }}" class="btn btn--regular">
            @include('partials.icons.arrow-back', ['class' => 'btn__icon'])
            {{ __('ui.back') }}
        </a>
    </header>

    @if ($errors->any())
        <div class="alert alert--danger" role="alert">{{ $errors->first() }}</div>
    @endif

    <form method="POST" action="{{ route('expenses.store') }}" class="surface-panel form-panel" enctype="multipart/form-data">
        @csrf

        <div class="form-grid">
            <label class="field">
                <span class="field__label">{{ __('ui.expense_category') }}</span>
                <select class="field__input" name="category" required>
                    @foreach ($categories as $category)
                        <option value="{{ $category->value }}" @selected(old('category', $expense->category?->value) === $category->value)>
                            {{ $category->label() }}
                        </option>
                    @endforeach
                </select>
            </label>
            <label class="field">
                <span class="field__label">{{ __('ui.invoice_grand_total') }}</span>
                <input class="field__input" type="number" name="amount" min="1" step="1" inputmode="numeric" value="{{ old('amount') }}" required>
            </label>
            <label class="field">
                <span class="field__label">{{ __('ui.invoice_date') }}</span>
                <input class="field__input" type="date" name="spent_at" value="{{ old('spent_at', $expense->spent_at?->format('Y-m-d') ?? now()->toDateString()) }}" required>
            </label>
            <label class="field field--grow">
                <span class="field__label">{{ __('ui.notes') }}</span>
                <input class="field__input" type="text" name="note" value="{{ old('note') }}" placeholder="{{ __('ui.optional') }}">
            </label>
        </div>

        @include('partials.image-upload', [
            'name' => 'receipt',
            'label' => __('ui.expense_receipt'),
            'previewUrl' => null,
            'round' => false,
            'capture' => 'environment',
        ])

        <div class="sticky-cta">
            <button type="submit" class="btn btn--primary">{{ __('ui.save') }}</button>
        </div>
    </form>
</section>
@endsection
