@extends('layouts.app')

@section('title', __('ui.visit_action_report').' — '.$store->name)

@section('content')
<section class="page visit-report-page report-page">
    <header class="page__header page__header--iconed no-print">
        @include('partials.icon-badge', ['icon' => 'file', 'tone' => 'amber', 'size' => 'lg'])
        <div class="page__header-text">
            <h1 class="page__title">{{ __('ui.visit_action_report') }}</h1>
            <p class="page__lead">
                {{ $store->name }}
                · <span dir="ltr">{{ $from }} → {{ $to }}</span>
            </p>
        </div>
        <div class="page__actions">
            @include('partials.print-button', ['label' => __('ui.print_report'), 'btnClass' => 'btn btn--print btn--sm'])
            <a href="{{ route('visits.show', $visit) }}" class="btn btn--ghost btn--sm">{{ __('ui.back') }}</a>
        </div>
    </header>

    @include('partials.print-doc-head', [
        'printTitle' => __('ui.visit_action_report'),
        'printSubtitle' => $store->name.' · '.$from.' → '.$to,
    ])

    <div class="visit-report-grid">
        <section
            class="report-section visit-report-card"
            id="visit-report-invoices"
            data-print-block
            style="--report-accent: #b45309"
        >
            <div class="report-section__head">
                <h2 class="report-section__title">{{ __('ui.invoices') }}</h2>
                @include('partials.print-section-button', ['target' => '#visit-report-invoices'])
            </div>
            <div class="visit-report-body">
                @forelse ($visit->invoices as $invoice)
                    <a href="{{ route('invoices.show', $invoice) }}" class="visit-report-row">
                        <strong dir="ltr">{{ $invoice->invoice_number }}</strong>
                        <span dir="ltr">{{ number_format((float) $invoice->total_amount, 0) }}</span>
                    </a>
                @empty
                    <p class="empty">{{ __('ui.invoice_empty') }}</p>
                @endforelse
            </div>
        </section>

        <section
            class="report-section visit-report-card"
            id="visit-report-collections"
            data-print-block
            style="--report-accent: #0f766e"
        >
            <div class="report-section__head">
                <h2 class="report-section__title">{{ __('ui.collections') }}</h2>
                @include('partials.print-section-button', ['target' => '#visit-report-collections'])
            </div>
            <div class="visit-report-body">
                @forelse ($visit->collections as $collection)
                    <a href="{{ route('collections.show', $collection) }}" class="visit-report-row">
                        <strong dir="ltr">{{ $collection->receipt_number }}</strong>
                        <span dir="ltr">{{ number_format((float) $collection->amount, 0) }}</span>
                    </a>
                @empty
                    <p class="empty">{{ __('ui.collections_empty') }}</p>
                @endforelse
            </div>
        </section>

        <section
            class="report-section visit-report-card"
            id="visit-report-rejects"
            data-print-block
            style="--report-accent: #c2410c"
        >
            <div class="report-section__head">
                <h2 class="report-section__title">{{ __('ui.visit_action_reject') }}</h2>
                @include('partials.print-section-button', ['target' => '#visit-report-rejects'])
            </div>
            <div class="visit-report-body">
                @forelse ($visit->rejects as $reject)
                    <div class="visit-report-row">
                        <strong dir="ltr">{{ number_format((float) $reject->credit_amount, 0) }}</strong>
                        <span>{{ $reject->items->pluck('product_name')->take(3)->implode(' · ') ?: '—' }}</span>
                    </div>
                @empty
                    <p class="empty">{{ __('ui.rejects_empty') }}</p>
                @endforelse
            </div>
        </section>
    </div>

    @if ($report)
        <section
            class="report-section visit-report-summary"
            id="visit-report-summary"
            data-print-block
            style="--report-accent: var(--judi-600)"
        >
            <div class="report-section__head">
                <h2 class="report-section__title">{{ __('ui.reports') }}</h2>
                @include('partials.print-section-button', ['target' => '#visit-report-summary'])
            </div>
            <div class="visit-report-body visit-report-body--summary">
                <p class="visit-report-totals">
                    <span>
                        {{ __('ui.invoice_grand_total') }}:
                        <strong dir="ltr">{{ number_format((float) ($report['sales_total'] ?? 0), 0) }}</strong>
                    </span>
                    <span>
                        {{ __('ui.reject_credit') }}:
                        <strong dir="ltr">{{ number_format((float) $visit->rejects->sum('credit_amount'), 0) }}</strong>
                    </span>
                </p>
                <a
                    class="btn btn--regular no-print"
                    href="{{ route('reports.index', ['store_id' => $store->id, 'period' => 'custom', 'from' => $from, 'to' => $to]) }}"
                >
                    {{ __('ui.reports') }}
                </a>
            </div>
        </section>
    @endif
</section>
@endsection
