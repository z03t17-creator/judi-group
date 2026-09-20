@extends('layouts.app')

@section('title', __('ui.releases').' — JUDI')

@section('content')
<section class="page list-page">
    <header class="page__header page__header--iconed">
        @include('partials.icon-badge', ['icon' => 'warehouse', 'tone' => 'teal', 'size' => 'lg'])
        <div class="page__header-text">
            <h1 class="page__title">{{ __('ui.releases') }}</h1>
            <p class="page__lead">{{ __('ui.releases_lead') }}</p>
        </div>
        <div class="page__actions">
            @include('partials.print-button', ['label' => __('ui.print_list')])
            <a href="{{ route('stock.index') }}" class="btn btn--regular">
                @include('partials.icons.warehouse', ['class' => 'btn__icon'])
                {{ __('ui.stock') }}
            </a>
            <a href="{{ route('invoices.index') }}" class="btn btn--regular">
                @include('partials.icons.file', ['class' => 'btn__icon'])
                {{ __('ui.invoices') }}
            </a>
        </div>
    </header>

    @include('partials.print-doc-head', ['printTitle' => __('ui.releases'), 'printSubtitle' => __('ui.releases_lead')])

    @include('partials.flash')

    @include('partials.list-filters', [
        'action' => route('releases.index'),
        'period' => $period,
        'from' => $from,
        'to' => $to,
        'showAllPeriod' => true,
        'showChannel' => true,
        'channel' => $channel,
        'showCollector' => true,
        'collectors' => $collectors,
        'selectedCollectorId' => $selectedCollectorId,
        'showSearch' => true,
        'q' => $q,
        'searchPlaceholder' => __('ui.search_release'),
    ])

    <div class="directory-cards">
        @forelse ($invoices as $invoice)
            <a href="{{ route('invoices.show', $invoice) }}" class="dir-card">
                <div class="dir-card__body">
                    <div class="dir-card__row">
                        @include('partials.icon-badge', [
                            'icon' => 'warehouse',
                            'tone' => 'teal',
                            'size' => 'md',
                        ])
                        <div>
                            <p class="dir-card__title" dir="ltr">{{ $invoice->invoice_number }}</p>
                            <p class="dir-card__meta">
                                {{ $invoice->store?->name }}
                                · {{ $invoice->collector?->name }}
                                · {{ $invoice->items->count() }} {{ __('ui.invoice_lines') }}
                            </p>
                        </div>
                    </div>
                </div>
                @include('partials.icons.chevron', ['class' => 'dir-card__chevron'])
            </a>
        @empty
            <div class="empty-state surface-panel">
                @include('partials.icon-badge', ['icon' => 'warehouse', 'tone' => 'slate', 'size' => 'lg'])
                <p class="empty-state__title">{{ __('ui.releases_empty') }}</p>
            </div>
        @endforelse
    </div>

    <div class="directory-table report-section" style="--report-accent: var(--judi-500)">
        <div class="report-section__head">
            <h2 class="report-section__title">{{ __('ui.releases') }}</h2>
        </div>
        <div class="table-wrap report-table-wrap">
            <table class="data-table report-table">
                <thead>
                    @include('partials.print-table-name', [
                        'printTableTitle' => __('ui.releases'),
                        'printTableSubtitle' => __('ui.releases_lead'),
                        'colspan' => 6,
                    ])
                    <tr>
                        <th>{{ __('ui.invoice_no') }}</th>
                        <th>{{ __('ui.invoice_store') }}</th>
                        <th>{{ __('ui.invoice_delegate') }}</th>
                        <th>{{ __('ui.invoice_grand_total') }}</th>
                        <th>{{ __('ui.invoice_date') }}</th>
                        <th class="no-print"></th>
                    </tr>
                </thead>
                <tbody>
                    @forelse ($invoices as $invoice)
                        <tr>
                            <td>
                                <a href="{{ route('invoices.show', $invoice) }}" class="ltr-inline report-link">
                                    <strong>{{ $invoice->invoice_number }}</strong>
                                </a>
                            </td>
                            <td>{{ $invoice->store?->name }}</td>
                            <td>{{ $invoice->collector?->name }}</td>
                            <td><span class="ltr-inline report-num">{{ number_format((float) $invoice->total_amount, 0) }}</span></td>
                            <td><span class="ltr-inline">{{ $invoice->created_at?->timezone(config('app.timezone'))->format('Y-m-d') }}</span></td>
                            <td class="data-table__actions">
                                <a href="{{ route('invoices.show', ['invoice' => $invoice, 'print' => 1]) }}" class="btn btn--primary btn--sm">
                                    @include('partials.icons.print', ['class' => 'btn__icon'])
                                    {{ __('ui.release_print_then_send') }}
                                </a>
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="6" class="empty">{{ __('ui.releases_empty') }}</td>
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
