@extends('layouts.app')

@section('title', __('ui.reports').' — JUDI')

@section('content')
<section class="page report-page">
    <header class="page__header page__header--iconed report-page__hero no-print">
        @include('partials.icon-badge', ['icon' => 'clipboard', 'tone' => 'amber', 'size' => 'lg'])
        <div class="page__header-text">
            <h1 class="page__title">{{ __('ui.reports') }}</h1>
            <p class="page__lead">
                @if ($canReviewAll)
                    {{ __('ui.reports_review_lead') }}
                @else
                    {{ __('ui.reports_own_lead') }}
                @endif
                @if ($report)
                    · <strong>{{ $report['title'] }}</strong>
                @endif
            </p>
        </div>
        <div class="page__actions">
            @include('partials.print-button', ['label' => __('ui.print_report'), 'btnClass' => 'btn btn--print'])
            @if (auth()->user()->canAccess('collections') || auth()->user()->canAccess('reports.review'))
                <a href="{{ route('collections.index') }}" class="btn btn--regular">
                    @include('partials.icons.cash', ['class' => 'btn__icon'])
                    {{ __('ui.collections') }}
                </a>
            @endif
            @if (auth()->user()->canAccess('expenses') || auth()->user()->canAccess('reports.review'))
                <a href="{{ route('expenses.index') }}" class="btn btn--regular">
                    @include('partials.icons.wallet', ['class' => 'btn__icon'])
                    {{ __('ui.expenses') }}
                </a>
            @endif
        </div>
    </header>

    @include('partials.print-doc-head', [
        'printTitle' => __('ui.reports'),
        'printSubtitle' => $report['title'] ?? ($canReviewAll ? __('ui.reports_review_lead') : __('ui.reports_own_lead')),
    ])

    @include('partials.flash')

    <div class="report-page__filters">
        @include('partials.list-filters', [
            'action' => route('reports.index'),
            'period' => $period,
            'from' => $from,
            'to' => $to,
            'showAllPeriod' => false,
            'showChannel' => $canReviewAll,
            'channel' => $channel,
            'showInvoiceType' => true,
            'invoiceType' => $invoiceType,
            'showCollector' => $canReviewAll,
            'collectors' => $collectors,
            'selectedCollectorId' => $selectedCollectorId,
            'showStore' => true,
            'stores' => $stores,
            'selectedStoreId' => $selectedStoreId,
        ])
    </div>

    @if (!empty($showOffice) && $office)
        <section class="report-block report-block--office" style="--report-accent: var(--judi-600)">
            <header class="report-block__head">
                <span class="report-block__accent" aria-hidden="true"></span>
                <div>
                    <h2 class="report-block__title">{{ __('ui.office_report_title') }}</h2>
                    <p class="report-block__lead">{{ __('ui.office_report_lead') }}</p>
                </div>
            </header>

            <div class="kpi-grid kpi-grid--report report-kpis">
                <article class="kpi-card kpi-card--iconed report-kpi report-kpi--teal">
                    @include('partials.icon-badge', ['icon' => 'warehouse', 'tone' => 'teal', 'size' => 'md'])
                    <div>
                        <h2>{{ __('ui.stock_on_hand') }}</h2>
                        <p class="kpi-card__value ltr-inline">{{ number_format($office['stock_piece_total']) }}</p>
                        <p class="kpi-card__hint">
                            {{ number_format($office['stock_sku_count']) }} {{ __('ui.products') }}
                            · {{ __('ui.stock_pieces') }}
                        </p>
                    </div>
                </article>
                <article class="kpi-card kpi-card--iconed report-kpi report-kpi--amber">
                    @include('partials.icon-badge', ['icon' => 'package', 'tone' => 'amber', 'size' => 'md'])
                    <div>
                        <h2>{{ __('ui.report_purchases') }}</h2>
                        <p class="kpi-card__value ltr-inline">{{ number_format($office['purchase_total_cost'], 0) }}</p>
                        <p class="kpi-card__hint">
                            {{ number_format($office['purchase_count']) }} {{ __('ui.purchases') }}
                        </p>
                    </div>
                </article>
            </div>

            <div class="report-section" style="--report-accent: var(--judi-500)">
                <div class="report-section__head">
                    <h3 class="report-section__title">{{ __('ui.stock') }}</h3>
                </div>
                <div class="table-wrap report-table-wrap">
                    <table class="data-table report-table">
                        <thead>
                            @include('partials.print-table-name', [
                                'printTableTitle' => __('ui.stock'),
                                'colspan' => 4,
                            ])
                            <tr>
                                <th>{{ __('ui.product_name') }}</th>
                                <th>{{ __('ui.sku') }}</th>
                                <th>{{ __('ui.stock_pieces') }}</th>
                                <th>{{ __('ui.stock_breakdown') }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            @forelse ($office['stock_rows'] as $row)
                                @php $breakdown = $row->breakdown(); @endphp
                                <tr>
                                    <td>{{ $row->product?->displayName() ?? '—' }}</td>
                                    <td><span class="ltr-inline">{{ $row->product?->sku ?: '—' }}</span></td>
                                    <td><span class="ltr-inline report-num">{{ number_format((int) $row->qty_pieces) }}</span></td>
                                    <td>{{ $breakdown['label'] }}</td>
                                </tr>
                            @empty
                                <tr><td colspan="4" class="empty">{{ __('ui.stock_empty') }}</td></tr>
                            @endforelse
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="report-section" style="--report-accent: #c27803">
                <div class="report-section__head">
                    <h3 class="report-section__title">{{ __('ui.purchases') }}</h3>
                </div>
                <div class="table-wrap report-table-wrap">
                    <table class="data-table report-table">
                        <thead>
                            <tr>
                                <th>{{ __('ui.purchase_no') }}</th>
                                <th>{{ __('ui.invoice_date') }}</th>
                                <th>{{ __('ui.suppliers') }}</th>
                                <th>{{ __('ui.invoice_grand_total') }}</th>
                                <th>{{ __('ui.notes') }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            @forelse ($office['purchases'] as $purchase)
                                <tr>
                                    <td>
                                        <a href="{{ route('purchases.show', $purchase) }}" class="ltr-inline report-link">
                                            <strong>{{ $purchase->purchase_number }}</strong>
                                        </a>
                                    </td>
                                    <td><span class="ltr-inline">{{ $purchase->purchased_at?->format('Y-m-d') }}</span></td>
                                    <td>{{ $purchase->supplier?->name ?: '—' }}</td>
                                    <td><span class="ltr-inline report-num">{{ number_format((float) $purchase->total_cost, 0) }}</span></td>
                                    <td>{{ $purchase->notes ?: '—' }}</td>
                                </tr>
                            @empty
                                <tr><td colspan="5" class="empty">{{ __('ui.purchases_empty') }}</td></tr>
                            @endforelse
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    @endif

    @unless ($report)
        <div class="empty-state surface-panel report-empty">
            @include('partials.icon-badge', ['icon' => 'clipboard', 'tone' => 'slate', 'size' => 'lg'])
            <p class="empty-state__title">{{ __('ui.reports_empty') }}</p>
        </div>
    @else
        <div class="kpi-grid kpi-grid--report report-kpis">
            <article class="kpi-card kpi-card--iconed report-kpi report-kpi--orange">
                @include('partials.icon-badge', ['icon' => 'store', 'tone' => 'orange', 'size' => 'md'])
                <div>
                    <h2>{{ __('ui.report_stores_visited') }}</h2>
                    <p class="kpi-card__value">{{ number_format($report['stores_visited']) }}</p>
                </div>
            </article>
            <article class="kpi-card kpi-card--iconed report-kpi report-kpi--amber">
                @include('partials.icon-badge', ['icon' => 'file', 'tone' => 'amber', 'size' => 'md'])
                <div>
                    <h2>{{ __('ui.report_invoices') }}</h2>
                    <p class="kpi-card__value">{{ number_format($report['invoice_count']) }}</p>
                    <p class="kpi-card__hint">
                        {{ __('ui.invoice_cash') }} {{ $report['cash_count'] }}
                        · {{ __('ui.invoice_debt') }} {{ $report['debt_count'] }}
                    </p>
                </div>
            </article>
            <article class="kpi-card kpi-card--iconed report-kpi report-kpi--emerald">
                @include('partials.icon-badge', ['icon' => 'cash', 'tone' => 'emerald', 'size' => 'md'])
                <div>
                    <h2>{{ __('ui.report_cash_payments') }}</h2>
                    <p class="kpi-card__value ltr-inline">{{ number_format($report['cash_total'], 0) }}</p>
                    <p class="kpi-card__hint">{{ __('ui.report_cash_hint') }}</p>
                </div>
            </article>
            <article class="kpi-card kpi-card--iconed report-kpi report-kpi--violet">
                @include('partials.icon-badge', ['icon' => 'banknote', 'tone' => 'violet', 'size' => 'md'])
                <div>
                    <h2>{{ __('ui.report_debt_sales') }}</h2>
                    <p class="kpi-card__value ltr-inline">{{ number_format($report['debt_total'], 0) }}</p>
                </div>
            </article>
            <article class="kpi-card kpi-card--iconed report-kpi report-kpi--teal">
                @include('partials.icon-badge', ['icon' => 'cash', 'tone' => 'teal', 'size' => 'md'])
                <div>
                    <h2>{{ __('ui.report_collections') }}</h2>
                    <p class="kpi-card__value ltr-inline">{{ number_format($report['collection_total'], 0) }}</p>
                    <p class="kpi-card__hint">{{ number_format($report['collection_count']) }} {{ __('ui.collections') }}</p>
                </div>
            </article>
            <article class="kpi-card kpi-card--iconed report-kpi report-kpi--sky">
                @include('partials.icon-badge', ['icon' => 'wallet', 'tone' => 'sky', 'size' => 'md'])
                <div>
                    <h2>{{ __('ui.report_expenses') }}</h2>
                    <p class="kpi-card__value ltr-inline">{{ number_format($report['expense_total'], 0) }}</p>
                    <p class="kpi-card__hint">{{ number_format($report['expense_count']) }} {{ __('ui.expenses') }}</p>
                </div>
            </article>
            <article class="kpi-card kpi-card--iconed report-kpi report-kpi--net">
                @include('partials.icon-badge', ['icon' => 'cash', 'tone' => 'teal', 'size' => 'md'])
                <div>
                    <h2>{{ __('ui.report_net_cash') }}</h2>
                    <p class="kpi-card__value ltr-inline">{{ number_format($report['net_cash'], 0) }}</p>
                    <p class="kpi-card__hint">{{ __('ui.report_net_hint') }}</p>
                </div>
            </article>
        </div>

        <p class="report-sales-banner">
            <span>{{ __('ui.report_sales_total') }}</span>
            <strong class="ltr-inline">{{ number_format($report['sales_total'], 0) }}</strong>
        </p>

        <div class="kpi-grid kpi-grid--report report-kpis report-kpis--limits">
            <article class="kpi-card kpi-card--iconed report-kpi report-kpi--amber">
                @include('partials.icon-badge', ['icon' => 'banknote', 'tone' => 'amber', 'size' => 'md'])
                <div>
                    <h2>{{ __('ui.report_discount_vs_limit') }}</h2>
                    <p class="kpi-card__value ltr-inline">
                        {{ rtrim(rtrim(number_format($report['discount_max_used_percent'], 2, '.', ''), '0'), '.') ?: '0' }}%
                        <span class="kpi-card__hint" style="display:inline;margin:0">/
                            {{ rtrim(rtrim(number_format($report['discount_limit_percent'], 2, '.', ''), '0'), '.') ?: '0' }}%
                        </span>
                    </p>
                    <p class="kpi-card__hint">
                        {{ __('ui.report_discount_avg') }}:
                        {{ rtrim(rtrim(number_format($report['discount_avg_percent'], 2, '.', ''), '0'), '.') ?: '0' }}%
                        · {{ __('ui.invoice_discount') }}:
                        <span class="ltr-inline">{{ number_format($report['discount_total'], 0) }}</span>
                    </p>
                </div>
            </article>
            <article class="kpi-card kpi-card--iconed report-kpi report-kpi--violet">
                @include('partials.icon-badge', ['icon' => 'package', 'tone' => 'violet', 'size' => 'md'])
                <div>
                    <h2>{{ __('ui.report_gift_vs_limit') }}</h2>
                    <p class="kpi-card__value ltr-inline">
                        {{ rtrim(rtrim(number_format($report['gift_pct_of_sold'], 2, '.', ''), '0'), '.') ?: '0' }}%
                        <span class="kpi-card__hint" style="display:inline;margin:0">/
                            {{ rtrim(rtrim(number_format($report['gift_limit_percent'], 2, '.', ''), '0'), '.') ?: '0' }}%
                        </span>
                    </p>
                    <p class="kpi-card__hint">
                        {{ __('ui.invoice_gift') }}:
                        <span class="ltr-inline">{{ number_format($report['gift_units'], 0) }}</span>
                        · {{ __('ui.report_sold_units') }}:
                        <span class="ltr-inline">{{ number_format($report['sold_units'], 0) }}</span>
                    </p>
                </div>
            </article>
        </div>

        <div class="report-section" style="--report-accent: #ea580c">
            <div class="report-section__head">
                <h2 class="report-section__title">{{ __('ui.report_stores_list') }}</h2>
            </div>
            <div class="table-wrap report-table-wrap">
                <table class="data-table report-table">
                    <thead>
                        <tr>
                            <th>{{ __('ui.invoice_store') }}</th>
                            <th>{{ __('ui.report_invoices') }}</th>
                            <th>{{ __('ui.invoice_grand_total') }}</th>
                            <th>{{ __('ui.invoice_cash') }}</th>
                            <th>{{ __('ui.invoice_debt') }}</th>
                            <th>{{ __('ui.report_collections') }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse ($report['stores'] as $row)
                            <tr>
                                <td><strong>{{ $row['store']?->name ?? '—' }}</strong></td>
                                <td><span class="ltr-inline">{{ $row['invoice_count'] }}</span></td>
                                <td><span class="ltr-inline report-num">{{ number_format($row['sales_total'], 0) }}</span></td>
                                <td><span class="ltr-inline report-num report-num--cash">{{ number_format($row['cash_total'], 0) }}</span></td>
                                <td><span class="ltr-inline report-num report-num--debt">{{ number_format($row['debt_total'], 0) }}</span></td>
                                <td><span class="ltr-inline report-num report-num--collect">{{ number_format($row['collected_total'] ?? 0, 0) }}</span></td>
                            </tr>
                        @empty
                            <tr><td colspan="6" class="empty">{{ __('ui.reports_no_sales') }}</td></tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>

        <div class="report-section" style="--report-accent: var(--judi-500)">
            <div class="report-section__head">
                <h2 class="report-section__title">{{ __('ui.collections') }}</h2>
            </div>
            <div class="table-wrap report-table-wrap">
                <table class="data-table report-table">
                    <thead>
                        <tr>
                            <th>{{ __('ui.collection_receipt_no') }}</th>
                            <th>{{ __('ui.invoice_date') }}</th>
                            @if ($canReviewAll && ! $report['collector'])
                                <th>{{ __('ui.invoice_delegate') }}</th>
                            @endif
                            <th>{{ __('ui.invoice_store') }}</th>
                            <th>{{ __('ui.invoice_status') }}</th>
                            <th>{{ __('ui.invoice_grand_total') }}</th>
                            <th>{{ __('ui.notes') }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse ($report['collections'] as $collection)
                            <tr>
                                <td>
                                    <a href="{{ route('collections.show', $collection) }}" class="ltr-inline report-link">
                                        <strong>{{ $collection->receipt_number }}</strong>
                                    </a>
                                </td>
                                <td><span class="ltr-inline">{{ $collection->collected_at?->format('Y-m-d') }}</span></td>
                                @if ($canReviewAll && ! $report['collector'])
                                    <td>{{ $collection->collector?->name }}</td>
                                @endif
                                <td>{{ $collection->store?->name }}</td>
                                <td>
                                    <span class="report-chip report-chip--{{ $collection->isPending() ? 'debt' : 'cash' }}">
                                        {{ $collection->status?->label() ?? __('ui.collection_status_pending') }}
                                    </span>
                                </td>
                                <td><span class="ltr-inline report-num report-num--collect">{{ number_format((float) $collection->amount, 0) }}</span></td>
                                <td>{{ $collection->note ?: '—' }}</td>
                            </tr>
                        @empty
                            <tr><td colspan="{{ ($canReviewAll && ! $report['collector']) ? 7 : 6 }}" class="empty">{{ __('ui.collections_empty') }}</td></tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>

        <div class="report-section" style="--report-accent: #0284c7">
            <div class="report-section__head">
                <h2 class="report-section__title">{{ __('ui.expenses') }}</h2>
            </div>
            <div class="table-wrap report-table-wrap">
                <table class="data-table report-table">
                    <thead>
                        <tr>
                            <th>{{ __('ui.invoice_date') }}</th>
                            @if ($canReviewAll && ! $report['collector'])
                                <th>{{ __('ui.invoice_delegate') }}</th>
                            @endif
                            <th>{{ __('ui.expense_category') }}</th>
                            <th>{{ __('ui.invoice_grand_total') }}</th>
                            <th>{{ __('ui.notes') }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse ($report['expenses'] as $expense)
                            <tr>
                                <td><span class="ltr-inline">{{ $expense->spent_at?->format('Y-m-d') }}</span></td>
                                @if ($canReviewAll && ! $report['collector'])
                                    <td>{{ $expense->collector?->name }}</td>
                                @endif
                                <td><span class="report-chip">{{ $expense->category->label() }}</span></td>
                                <td><span class="ltr-inline report-num report-num--expense">{{ number_format((float) $expense->amount, 0) }}</span></td>
                                <td>{{ $expense->note ?: '—' }}</td>
                            </tr>
                        @empty
                            <tr><td colspan="{{ ($canReviewAll && ! $report['collector']) ? 5 : 4 }}" class="empty">{{ __('ui.expenses_empty') }}</td></tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>

        <div class="report-section" style="--report-accent: #b45309">
            <div class="report-section__head">
                <h2 class="report-section__title">{{ __('ui.invoices') }}</h2>
            </div>
            <div class="table-wrap report-table-wrap">
                <table class="data-table report-table">
                    @php $showCollectorCol = $canReviewAll && ! $report['collector']; @endphp
                    <thead>
                        <tr>
                            <th>{{ __('ui.invoice_no') }}</th>
                            <th>{{ __('ui.invoice_store') }}</th>
                            @if ($showCollectorCol)
                                <th>{{ __('ui.invoice_delegate') }}</th>
                            @endif
                            <th>{{ __('ui.invoice_type') }}</th>
                            <th>{{ __('ui.invoice_discount') }} %</th>
                            <th>{{ __('ui.invoice_gift') }}</th>
                            <th>{{ __('ui.invoice_grand_total') }}</th>
                            <th>{{ __('ui.invoice_date') }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse ($report['invoices'] as $invoice)
                            @php
                                $giftQty = (float) $invoice->items->sum(fn ($line) => (float) $line->gift_quantity);
                                $typeKey = $invoice->invoice_type->value ?? '';
                            @endphp
                            <tr>
                                <td>
                                    <a href="{{ route('invoices.show', $invoice) }}" class="ltr-inline report-link">
                                        <strong>{{ $invoice->invoice_number }}</strong>
                                    </a>
                                </td>
                                <td>{{ $invoice->store?->name }}</td>
                                @if ($showCollectorCol)
                                    <td>{{ $invoice->collector?->name }}</td>
                                @endif
                                <td>
                                    <span class="report-chip report-chip--{{ $typeKey === 'debt' ? 'debt' : 'cash' }}">
                                        {{ $invoice->invoice_type->label() }}
                                    </span>
                                </td>
                                <td>
                                    <span class="ltr-inline">
                                        {{ rtrim(rtrim(number_format((float) $invoice->discount_percent, 2, '.', ''), '0'), '.') ?: '0' }}%
                                    </span>
                                </td>
                                <td><span class="ltr-inline">{{ number_format($giftQty, 0) }}</span></td>
                                <td><span class="ltr-inline report-num">{{ number_format((float) $invoice->total_amount, 0) }}</span></td>
                                <td><span class="ltr-inline">{{ $invoice->created_at?->timezone(config('app.timezone'))->format('Y-m-d') }}</span></td>
                            </tr>
                        @empty
                            <tr><td colspan="{{ $showCollectorCol ? 8 : 7 }}" class="empty">{{ __('ui.invoice_empty') }}</td></tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>
    @endunless
</section>
@endsection
