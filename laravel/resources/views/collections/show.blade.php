@extends('layouts.app')

@section('title', $collection->receipt_number.' — JUDI')

@section('content')
<section class="page page--invoice-show">
    <header class="page__header page__header--iconed no-print">
        @include('partials.icon-badge', ['icon' => 'cash', 'tone' => 'emerald', 'size' => 'lg'])
        <div class="page__header-text">
            <p class="page__eyebrow">
                @if ($collection->isPending())
                    {{ __('ui.collection_awaiting_confirm') }}
                @else
                    {{ __('ui.collection_posted') }}
                @endif
            </p>
            <h1 class="page__title" dir="ltr">{{ $collection->receipt_number }}</h1>
            <p class="page__lead">
                <span class="report-chip report-chip--{{ $collection->isPending() ? 'debt' : 'cash' }}">
                    {{ $collection->status->label() }}
                </span>
                · {{ $collection->store?->name }}
                · <span class="ltr-inline">{{ number_format((float) $collection->amount, 0) }}</span>
                @if ($collection->isConfirmed() && $collection->confirmedBy)
                    · {{ $collection->confirmedBy->name }}
                @endif
            </p>
        </div>
        <div class="page__actions">
            <a href="{{ route('collections.index') }}" class="btn btn--regular">
                @include('partials.icons.arrow-back', ['class' => 'btn__icon'])
                {{ __('ui.back') }}
            </a>
            @if (auth()->user()->canAccess('collections'))
                <a href="{{ route('collections.create') }}" class="btn btn--regular">
                    @include('partials.icons.plus', ['class' => 'btn__icon'])
                    {{ __('ui.collection_another') }}
                </a>
            @endif
            @include('partials.share-button', [
                'shareTitle' => $collection->receipt_number,
                'shareText' => \App\Support\ShareText::collection($collection, $company),
            ])
            <button type="button" class="btn btn--primary" onclick="judiPrint('voucher')">
                @include('partials.icons.print', ['class' => 'btn__icon'])
                {{ __('ui.print_voucher') }}
            </button>
            <button type="button" class="btn btn--regular" onclick="judiPrint('slip')">
                @include('partials.icons.print', ['class' => 'btn__icon'])
                {{ __('ui.print_slip') }}
            </button>
            @if (!empty($canConfirm))
                <form method="POST" action="{{ route('collections.confirm', $collection) }}">
                    @csrf
                    <button type="submit" class="btn btn--primary">{{ __('ui.collection_confirm') }}</button>
                </form>
            @endif
            @if (!empty($canDelete))
                <form method="POST" action="{{ route('collections.destroy', $collection) }}" onsubmit="return confirm(@json(__('ui.confirm_delete_collection')));">
                    @csrf
                    @method('DELETE')
                    <button type="submit" class="btn btn--regular">{{ __('ui.delete') }}</button>
                </form>
            @endif
        </div>
    </header>

    @include('partials.flash')

    @if ($errors->has('confirm'))
        <div class="alert alert--danger no-print" role="alert">{{ $errors->first('confirm') }}</div>
    @endif

    @include('collections.partials.paper-receipt', [
        'collection' => $collection,
        'company' => $company,
    ])
    @include('collections.partials.paper-slip', [
        'collection' => $collection,
        'company' => $company,
    ])
</section>

@if (!empty($autoPrint))
<script>
    window.addEventListener('load', function () {
        if (typeof judiPrint === 'function') {
            judiPrint(@json($autoPrint === 'slip' ? 'slip' : 'voucher'));
        } else {
            window.print();
        }
    });
</script>
@endif
@endsection
