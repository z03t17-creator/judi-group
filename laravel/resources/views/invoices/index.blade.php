@extends('layouts.app')

@section('title', __('ui.invoices').' — JUDI')

@section('content')
<section class="page list-page">
    <header class="page__header page__header--iconed">
        @include('partials.icon-badge', ['icon' => 'file', 'tone' => 'amber', 'size' => 'lg'])
        <div class="page__header-text">
            <h1 class="page__title">{{ __('ui.invoices') }}</h1>
            <p class="page__lead">{{ __('ui.invoice_list_lead') }}</p>
        </div>
        <div class="page__actions">
            @include('partials.print-button', ['label' => __('ui.print_list')])
            @if ($canCreate)
                <a href="{{ route('invoices.create') }}" class="btn btn--primary">
                    @include('partials.icons.plus', ['class' => 'btn__icon'])
                    {{ __('ui.invoice_new') }}
                </a>
            @endif
        </div>
    </header>

    @include('partials.print-doc-head', ['printTitle' => __('ui.invoices'), 'printSubtitle' => __('ui.invoice_list_lead')])

    @include('partials.flash')

    @include('partials.list-filters', [
        'action' => route('invoices.index'),
        'period' => $period,
        'from' => $from,
        'to' => $to,
        'showAllPeriod' => true,
        'showChannel' => $canFilterCollectors,
        'channel' => $channel,
        'showInvoiceType' => true,
        'invoiceType' => $invoiceType,
        'showStatus' => true,
        'status' => $status,
        'statusOptions' => [
            'pending_send' => __('ui.status_pending_send'),
            'sent' => __('ui.status_sent'),
            'cancelled' => __('ui.status_cancelled'),
        ],
        'showCollector' => $canFilterCollectors,
        'collectors' => $collectors,
        'selectedCollectorId' => $selectedCollectorId,
        'showSearch' => true,
        'q' => $q,
        'searchPlaceholder' => __('ui.search_invoice'),
    ])

    <div class="directory-cards">
        @forelse ($invoices as $invoice)
            <a href="{{ route('invoices.show', $invoice) }}" class="dir-card">
                <div class="dir-card__body">
                    <div class="dir-card__row">
                        @include('partials.icon-badge', [
                            'icon' => $invoice->invoice_type->value === 'cash' ? 'cash' : 'banknote',
                            'tone' => $invoice->invoice_type->value === 'cash' ? 'emerald' : 'amber',
                            'size' => 'md',
                        ])
                        <div>
                            <p class="dir-card__title ltr-inline">{{ $invoice->invoice_number }}</p>
                            <p class="dir-card__meta">
                                {{ $invoice->store?->name }}
                                · {{ $invoice->invoice_type->label() }}
                                · <span class="ltr-inline">{{ number_format((float) $invoice->total_amount, 0) }}</span>
                            </p>
                        </div>
                    </div>
                </div>
                @include('partials.icons.chevron', ['class' => 'dir-card__chevron'])
            </a>
        @empty
            <div class="empty-state surface-panel">
                @include('partials.icon-badge', ['icon' => 'file', 'tone' => 'slate', 'size' => 'lg'])
                <p class="empty-state__title">{{ __('ui.invoice_empty') }}</p>
                @if ($canCreate)
                    <a href="{{ route('invoices.create') }}" class="btn btn--primary">
                        @include('partials.icons.plus', ['class' => 'btn__icon'])
                        {{ __('ui.invoice_new') }}
                    </a>
                @endif
            </div>
        @endforelse
    </div>

    <div class="directory-table report-section" style="--report-accent: #b45309">
        <div class="report-section__head">
            <h2 class="report-section__title">{{ __('ui.invoices') }}</h2>
        </div>
        <div class="table-wrap report-table-wrap">
            <table class="data-table report-table">
                <thead>
                    <tr>
                        <th>{{ __('ui.invoice_no') }}</th>
                        <th>{{ __('ui.invoice_store') }}</th>
                        <th>{{ __('ui.invoice_type') }}</th>
                        <th>{{ __('ui.invoice_grand_total') }}</th>
                        <th>{{ __('ui.invoice_status') }}</th>
                        <th>{{ __('ui.invoice_date') }}</th>
                        <th class="no-print"></th>
                    </tr>
                </thead>
                <tbody>
                    @forelse ($invoices as $invoice)
                        <tr>
                            <td>
                                <div class="table-entity">
                                    @include('partials.icon-badge', [
                                        'icon' => $invoice->invoice_type->value === 'cash' ? 'cash' : 'banknote',
                                        'tone' => $invoice->invoice_type->value === 'cash' ? 'emerald' : 'amber',
                                        'size' => 'sm',
                                    ])
                                    <a href="{{ route('invoices.show', $invoice) }}" class="report-link ltr-inline">
                                        <strong>{{ $invoice->invoice_number }}</strong>
                                    </a>
                                </div>
                            </td>
                            <td>{{ $invoice->store?->name }}</td>
                            <td>
                                <span class="report-chip report-chip--{{ $invoice->invoice_type->value === 'debt' ? 'debt' : 'cash' }}">
                                    {{ $invoice->invoice_type->label() }}
                                </span>
                            </td>
                            <td>
                                <span class="ltr-inline report-num report-num--{{ $invoice->invoice_type->value === 'debt' ? 'debt' : 'cash' }}">
                                    {{ number_format((float) $invoice->total_amount, 0) }}
                                </span>
                            </td>
                            <td>
                                <span class="report-chip @if($invoice->status->value === 'cancelled') report-chip--off @endif">
                                    {{ $invoice->status->label() }}
                                </span>
                            </td>
                            <td><span class="ltr-inline">{{ $invoice->created_at?->timezone(config('app.timezone'))->format('Y-m-d') }}</span></td>
                            <td class="data-table__actions">
                                @include('partials.share-button', [
                                    'shareTitle' => $invoice->invoice_number,
                                    'shareText' => \App\Support\ShareText::invoice($invoice, config('judi.company')),
                                    'shareId' => 'share-inv-'.$invoice->id,
                                    'compact' => true,
                                ])
                                <a href="{{ route('invoices.show', $invoice) }}" class="btn btn--regular btn--sm">
                                    @include('partials.icons.print', ['class' => 'btn__icon'])
                                    {{ __('ui.print') }}
                                </a>
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="7" class="empty">{{ __('ui.invoice_empty') }}</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>

    @if ($invoices->hasPages())
        <div class="pager">{{ $invoices->links() }}</div>
    @endif
</section>
@endsection
