@extends('layouts.app')

@section('title', __('ui.collection_new').' — JUDI')

@section('content')
<section class="page">
    <header class="page__header page__header--iconed">
        @include('partials.icon-badge', ['icon' => 'plus', 'tone' => 'emerald', 'size' => 'lg'])
        <div class="page__header-text">
            <h1 class="page__title">{{ __('ui.collection_new') }}</h1>
            <p class="page__lead">{{ __('ui.collection_lead') }}</p>
        </div>
        <a href="{{ route('collections.index') }}" class="btn btn--regular">
            @include('partials.icons.arrow-back', ['class' => 'btn__icon'])
            {{ __('ui.back') }}
        </a>
    </header>

    @if ($errors->any())
        <div class="alert alert--danger" role="alert">{{ $errors->first() }}</div>
    @endif

    @if ($stores->isEmpty())
        <div class="empty-state surface-panel">
            @include('partials.icon-badge', ['icon' => 'store', 'tone' => 'slate', 'size' => 'lg'])
            <p class="empty-state__title">{{ __('ui.collection_no_debt_stores') }}</p>
            <a href="{{ route('collections.index') }}" class="btn btn--regular">{{ __('ui.back') }}</a>
        </div>
    @else
        <form method="POST" action="{{ route('collections.store') }}" class="surface-panel form-panel" enctype="multipart/form-data">
            @csrf

            <div class="form-grid">
                <label class="field field--grow">
                    <span class="field__label">{{ __('ui.invoice_store') }}</span>
                    <select class="field__input" name="store_id" required data-collection-store>
                        <option value="">{{ __('ui.collection_pick_store') }}</option>
                        @foreach ($stores as $store)
                            <option
                                value="{{ $store->id }}"
                                data-debt="{{ (float) $store->available_debt }}"
                                @selected((int) old('store_id') === (int) $store->id)
                            >
                                {{ $store->name }}
                                — {{ __('ui.collection_available_debt') }}:
                                {{ number_format((float) $store->available_debt, 0) }}
                            </option>
                        @endforeach
                    </select>
                </label>
                <label class="field">
                    <span class="field__label">{{ __('ui.collection_amount') }}</span>
                    <input class="field__input" type="number" name="amount" min="1" step="1" inputmode="numeric" value="{{ old('amount') }}" required data-collection-amount>
                    <span class="field__hint" data-collection-debt-hint></span>
                </label>
                <label class="field">
                    <span class="field__label">{{ __('ui.invoice_date') }}</span>
                    <input class="field__input" type="date" name="collected_at" value="{{ old('collected_at', $collection->collected_at?->format('Y-m-d') ?? now()->toDateString()) }}" required>
                </label>
                <label class="field field--grow">
                    <span class="field__label">{{ __('ui.notes') }}</span>
                    <input class="field__input" type="text" name="note" value="{{ old('note') }}" placeholder="{{ __('ui.optional') }}">
                </label>
            </div>

            @include('partials.image-upload', [
                'name' => 'receipt',
                'label' => __('ui.collection_receipt_photo'),
                'previewUrl' => null,
                'round' => false,
                'capture' => 'environment',
            ])

            <div class="sticky-cta">
                <button type="submit" class="btn btn--primary">{{ __('ui.collection_save') }}</button>
            </div>
        </form>
    @endif
</section>

<script>
(() => {
    const select = document.querySelector('[data-collection-store]');
    const amount = document.querySelector('[data-collection-amount]');
    const hint = document.querySelector('[data-collection-debt-hint]');
    if (!select || !amount || !hint) return;

    const sync = () => {
        const opt = select.selectedOptions[0];
        const debt = opt ? Number(opt.dataset.debt || 0) : 0;
        if (debt > 0) {
            hint.textContent = @json(__('ui.collection_available_debt')) + ': ' + debt.toLocaleString();
            amount.max = String(Math.floor(debt));
        } else {
            hint.textContent = '';
            amount.removeAttribute('max');
        }
    };

    select.addEventListener('change', sync);
    sync();
})();
</script>
@endsection
