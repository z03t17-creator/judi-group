@extends('layouts.app')

@section('title', __('ui.visit_action_report').' — '.$store->name)

@section('content')
<section class="page">
    <header class="page__header page__header--iconed">
        @include('partials.icon-badge', ['icon' => 'file', 'tone' => 'amber', 'size' => 'lg'])
        <div class="page__header-text">
            <h1 class="page__title">{{ __('ui.visit_action_report') }}</h1>
            <p class="page__lead">
                {{ $store->name }}
                · <span dir="ltr">{{ $from }} → {{ $to }}</span>
            </p>
        </div>
        <a href="{{ route('visits.show', $visit) }}" class="btn btn--ghost btn--sm">{{ __('ui.back') }}</a>
    </header>

    <div class="visit-report-grid">
        <div class="surface-panel">
            <h2>{{ __('ui.invoices') }}</h2>
            @forelse ($visit->invoices as $invoice)
                <a href="{{ route('invoices.show', $invoice) }}" class="visit-report-row">
                    <strong dir="ltr">{{ $invoice->invoice_number }}</strong>
                    <span dir="ltr">{{ number_format((float) $invoice->total_amount, 0) }}</span>
                </a>
            @empty
                <p class="empty">{{ __('ui.approvals_empty') }}</p>
            @endforelse
        </div>

        <div class="surface-panel">
            <h2>{{ __('ui.collections') }}</h2>
            @forelse ($visit->collections as $collection)
                <a href="{{ route('collections.show', $collection) }}" class="visit-report-row">
                    <strong dir="ltr">{{ $collection->receipt_number }}</strong>
                    <span dir="ltr">{{ number_format((float) $collection->amount, 0) }}</span>
                </a>
            @empty
                <p class="empty">{{ __('ui.approvals_empty') }}</p>
            @endforelse
        </div>

        <div class="surface-panel">
            <h2>{{ __('ui.visit_action_reject') }}</h2>
            @forelse ($visit->rejects as $reject)
                <div class="visit-report-row">
                    <strong dir="ltr">{{ number_format((float) $reject->credit_amount, 0) }}</strong>
                    <span>{{ $reject->items->pluck('product_name')->take(3)->implode(' · ') }}</span>
                </div>
            @empty
                <p class="empty">{{ __('ui.approvals_empty') }}</p>
            @endforelse
        </div>
    </div>

    @if ($report)
        <div class="surface-panel" style="margin-top:1rem">
            <h2>{{ __('ui.reports') }}</h2>
            <p>
                {{ __('ui.invoice_grand_total') }}:
                <strong dir="ltr">{{ number_format((float) ($report['sales_total'] ?? 0), 0) }}</strong>
                · {{ __('ui.reject_credit') }}:
                <strong dir="ltr">{{ number_format((float) $visit->rejects->sum('credit_amount'), 0) }}</strong>
            </p>
            <a class="btn btn--regular" href="{{ route('reports.index', ['store_id' => $store->id, 'period' => 'custom', 'from' => $from, 'to' => $to]) }}">
                {{ __('ui.reports') }}
            </a>
        </div>
    @endif
</section>
@endsection
