@extends('layouts.app')

@section('title', __('ui.visit_hub').' — '.$store->name)

@section('content')
<section class="page visit-hub-page">
    <header class="visit-hub__header">
        <div class="visit-hub__store">
            <img class="visit-hub__img" src="{{ $store->imageUrl() }}" alt="">
            <div>
                <p class="visit-hub__eyebrow">{{ __('ui.visit_hub') }} · {{ $visit->status->label() }}</p>
                <h1 class="visit-hub__title">{{ $store->name }}</h1>
                <p class="visit-hub__meta" dir="ltr">
                    {{ $store->phone ?: '—' }}
                    @if ((float) $store->current_debt > 0)
                        · {{ __('ui.current_debt') }} {{ number_format((float) $store->current_debt, 0) }}
                    @endif
                </p>
            </div>
        </div>
        @if ($visit->isOpen())
            <div class="visit-hub__end">
                @if ($visit->started_at)
                    <span
                        class="visit-timer visit-timer--hub"
                        data-visit-timer
                        data-started-at="{{ $visit->started_at->toIso8601String() }}"
                        dir="ltr"
                    >00:00:00</span>
                @endif
                <form method="POST" action="{{ route('visits.end', $visit) }}" onsubmit="return confirm(@json(__('ui.visit_end_confirm')));">
                    @csrf
                    <button type="submit" class="btn btn--ghost btn--sm">{{ __('ui.visit_end') }}</button>
                </form>
            </div>
        @endif
    </header>

    @include('partials.flash')
    @error('visit')
        <p class="field__error">{{ $message }}</p>
    @enderror

    @if (session('last_invoice_id'))
        @php $lastInvoice = \App\Models\Invoice::query()->find(session('last_invoice_id')); @endphp
        @if ($lastInvoice)
            <div class="visit-hub__last-invoice surface-panel">
                <div>
                    <strong dir="ltr">{{ $lastInvoice->invoice_number }}</strong>
                    <span>{{ __('ui.invoice_grand_total') }}:
                        <strong dir="ltr">{{ number_format((float) $lastInvoice->total_amount, 0) }}</strong>
                    </span>
                </div>
                <a class="btn btn--primary btn--sm" href="{{ route('invoices.show', [$lastInvoice, 'print' => 1]) }}">
                    {{ __('ui.print_a4') }}
                </a>
            </div>
        @endif
    @endif

    <div class="visit-hub__stats">
        <div>
            <span>{{ __('ui.invoices') }}</span>
            <strong dir="ltr">{{ $stats['invoices'] }}</strong>
        </div>
        <div>
            <span>{{ __('ui.collections') }}</span>
            <strong dir="ltr">{{ number_format($stats['collections'], 0) }}</strong>
        </div>
        <div>
            <span>{{ __('ui.reject_credit') }}</span>
            <strong dir="ltr">{{ number_format($stats['rejects'], 0) }}</strong>
        </div>
    </div>

    <nav class="visit-hub__actions" aria-label="{{ __('ui.visit_hub') }}">
        @if ($canOrder && $visit->isOpen())
            <a class="visit-hub__action" href="{{ route('invoices.create', ['visit' => $visit->id]) }}">
                <strong>{{ __('ui.visit_action_order') }}</strong>
                <span>{{ __('ui.invoice_debt') }}</span>
            </a>
        @endif
        @if ($canCollect && $visit->isOpen())
            <a class="visit-hub__action" href="{{ route('collections.create', ['visit' => $visit->id]) }}">
                <strong>{{ __('ui.visit_action_collect') }}</strong>
                <span>{{ __('ui.collection_debt_payment') }}</span>
            </a>
        @endif
        @if ($canReject && $visit->isOpen())
            <a class="visit-hub__action visit-hub__action--warn" href="{{ route('visits.reject', $visit) }}">
                <strong>{{ __('ui.visit_action_reject') }}</strong>
                <span>{{ __('ui.warehouse_main') }}</span>
            </a>
        @endif
        <a class="visit-hub__action" href="{{ route('visits.report', $visit) }}">
            <strong>{{ __('ui.visit_action_report') }}</strong>
            <span>{{ __('ui.reports') }}</span>
        </a>
        @if ($visit->isOpen())
            <form method="POST" action="{{ route('visits.end', $visit) }}" class="visit-hub__action visit-hub__action--end" onsubmit="return confirm(@json(__('ui.visit_end_confirm')));">
                @csrf
                <button type="submit">
                    <strong>{{ __('ui.visit_end') }}</strong>
                    <span>{{ __('ui.visit_end_hint') }}</span>
                </button>
            </form>
        @endif
    </nav>

    @if ($visit->rejects->isNotEmpty())
        <section class="visit-hub__list">
            <h2>{{ __('ui.reject_history') }}</h2>
            <ul>
                @foreach ($visit->rejects as $reject)
                    <li>
                        <span dir="ltr">{{ $reject->created_at?->timezone(config('app.timezone'))->format('Y-m-d H:i') }}</span>
                        <strong dir="ltr">{{ number_format((float) $reject->credit_amount, 0) }}</strong>
                        <span>{{ $reject->items->count() }} {{ __('ui.invoice_lines') }}</span>
                    </li>
                @endforeach
            </ul>
        </section>
    @endif
</section>
@endsection
