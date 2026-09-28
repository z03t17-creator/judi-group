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

    <div class="visit-report-stack">
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
            <div class="table-wrap report-table-wrap">
                <table class="data-table report-table visit-report-table">
                    <thead>
                        @include('partials.print-table-name', [
                            'printTableTitle' => __('ui.invoices'),
                            'colspan' => 3,
                        ])
                        <tr>
                            <th>{{ __('ui.invoice_no') }}</th>
                            <th>{{ __('ui.invoice_type') }}</th>
                            <th class="num">{{ __('ui.invoice_grand_total') }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse ($visit->invoices as $invoice)
                            <tr>
                                <td>
                                    <a href="{{ route('invoices.show', $invoice) }}" class="ltr-inline report-link">
                                        <strong>{{ $invoice->invoice_number }}</strong>
                                    </a>
                                </td>
                                <td>{{ $invoice->invoice_type->label() }}</td>
                                <td class="num"><span class="ltr-inline report-num">{{ number_format((float) $invoice->total_amount, 0) }}</span></td>
                            </tr>
                        @empty
                            <tr><td colspan="3" class="empty">{{ __('ui.invoice_empty') }}</td></tr>
                        @endforelse
                    </tbody>
                    @if ($visit->invoices->isNotEmpty())
                        <tfoot>
                            <tr>
                                <th colspan="2">{{ __('ui.invoice_grand_total') }}</th>
                                <th class="num"><span class="ltr-inline">{{ number_format((float) $visit->invoices->sum('total_amount'), 0) }}</span></th>
                            </tr>
                        </tfoot>
                    @endif
                </table>
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
            <div class="table-wrap report-table-wrap">
                <table class="data-table report-table visit-report-table">
                    <thead>
                        @include('partials.print-table-name', [
                            'printTableTitle' => __('ui.collections'),
                            'colspan' => 3,
                        ])
                        <tr>
                            <th>{{ __('ui.collection_receipt_no') }}</th>
                            <th>{{ __('ui.invoice_date') }}</th>
                            <th class="num">{{ __('ui.invoice_grand_total') }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse ($visit->collections as $collection)
                            <tr>
                                <td>
                                    <a href="{{ route('collections.show', $collection) }}" class="ltr-inline report-link">
                                        <strong>{{ $collection->receipt_number }}</strong>
                                    </a>
                                </td>
                                <td><span class="ltr-inline">{{ $collection->collected_at?->format('Y-m-d') ?: '—' }}</span></td>
                                <td class="num"><span class="ltr-inline report-num">{{ number_format((float) $collection->amount, 0) }}</span></td>
                            </tr>
                        @empty
                            <tr><td colspan="3" class="empty">{{ __('ui.collections_empty') }}</td></tr>
                        @endforelse
                    </tbody>
                    @if ($visit->collections->isNotEmpty())
                        <tfoot>
                            <tr>
                                <th colspan="2">{{ __('ui.invoice_grand_total') }}</th>
                                <th class="num"><span class="ltr-inline">{{ number_format((float) $visit->collections->sum('amount'), 0) }}</span></th>
                            </tr>
                        </tfoot>
                    @endif
                </table>
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
            <div class="table-wrap report-table-wrap">
                <table class="data-table report-table visit-report-table">
                    <thead>
                        @include('partials.print-table-name', [
                            'printTableTitle' => __('ui.visit_action_reject'),
                            'colspan' => 5,
                        ])
                        <tr>
                            <th>{{ __('ui.product_name') }}</th>
                            <th>{{ __('ui.unit') }}</th>
                            <th class="num">{{ __('ui.invoice_qty') }}</th>
                            <th class="num">{{ __('ui.invoice_unit_price') }}</th>
                            <th class="num">{{ __('ui.reject_credit') }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        @php $rejectRows = 0; @endphp
                        @forelse ($visit->rejects as $reject)
                            @foreach ($reject->items as $item)
                                @php $rejectRows++; @endphp
                                <tr>
                                    <td>{{ $item->product_name }}</td>
                                    <td>{{ $item->unitLabel() }}</td>
                                    <td class="num"><span class="ltr-inline">{{ number_format((float) $item->quantity, 0) }}</span></td>
                                    <td class="num"><span class="ltr-inline">{{ number_format((float) $item->unit_price, 0) }}</span></td>
                                    <td class="num"><span class="ltr-inline report-num">{{ number_format((float) $item->line_credit, 0) }}</span></td>
                                </tr>
                            @endforeach
                            @if ($reject->items->isEmpty())
                                <tr>
                                    <td colspan="4">{{ __('ui.visit_action_reject') }} · <span class="ltr-inline">{{ $reject->created_at?->format('Y-m-d H:i') }}</span></td>
                                    <td class="num"><span class="ltr-inline report-num">{{ number_format((float) $reject->credit_amount, 0) }}</span></td>
                                </tr>
                                @php $rejectRows++; @endphp
                            @endif
                        @empty
                            <tr><td colspan="5" class="empty">{{ __('ui.rejects_empty') }}</td></tr>
                        @endforelse
                    </tbody>
                    @if ($rejectRows > 0)
                        <tfoot>
                            <tr>
                                <th colspan="4">{{ __('ui.reject_credit') }}</th>
                                <th class="num"><span class="ltr-inline">{{ number_format((float) $visit->rejects->sum('credit_amount'), 0) }}</span></th>
                            </tr>
                        </tfoot>
                    @endif
                </table>
            </div>
        </section>

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
                <div class="table-wrap report-table-wrap">
                    <table class="data-table report-table visit-report-table">
                        <thead>
                            @include('partials.print-table-name', [
                                'printTableTitle' => __('ui.reports'),
                                'colspan' => 2,
                            ])
                            <tr>
                                <th>{{ __('ui.reports') }}</th>
                                <th class="num">{{ __('ui.invoice_grand_total') }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>{{ __('ui.invoice_grand_total') }}</td>
                                <td class="num"><span class="ltr-inline report-num">{{ number_format((float) ($report['sales_total'] ?? 0), 0) }}</span></td>
                            </tr>
                            <tr>
                                <td>{{ __('ui.reject_credit') }}</td>
                                <td class="num"><span class="ltr-inline report-num">{{ number_format((float) $visit->rejects->sum('credit_amount'), 0) }}</span></td>
                            </tr>
                            <tr>
                                <td>{{ __('ui.collections') }}</td>
                                <td class="num"><span class="ltr-inline report-num">{{ number_format((float) $visit->collections->sum('amount'), 0) }}</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="visit-report-body visit-report-body--summary no-print">
                    <a
                        class="btn btn--regular"
                        href="{{ route('reports.index', ['store_id' => $store->id, 'period' => 'custom', 'from' => $from, 'to' => $to]) }}"
                    >
                        {{ __('ui.reports') }}
                    </a>
                </div>
            </section>
        @endif
    </div>
</section>
@endsection
