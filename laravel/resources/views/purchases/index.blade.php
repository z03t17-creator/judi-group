@extends('layouts.app')

@section('title', __('ui.purchases').' — JUDI')

@section('content')
<section class="page list-page">
    <header class="page__header page__header--iconed">
        @include('partials.icon-badge', ['icon' => 'package', 'tone' => 'emerald', 'size' => 'lg'])
        <div class="page__header-text">
            <h1 class="page__title">{{ __('ui.purchases') }}</h1>
            <p class="page__lead">{{ __('ui.purchases_lead') }}</p>
        </div>
        <div class="page__actions">
            @include('partials.print-button', ['label' => __('ui.print_list')])
            <a href="{{ route('stock.index') }}" class="btn btn--regular">
                @include('partials.icons.warehouse', ['class' => 'btn__icon'])
                {{ __('ui.stock') }}
            </a>
            <a href="{{ route('purchases.create') }}" class="btn btn--primary">
                @include('partials.icons.plus', ['class' => 'btn__icon'])
                {{ __('ui.purchase_new') }}
            </a>
        </div>
    </header>

    @include('partials.print-doc-head', ['printTitle' => __('ui.purchases'), 'printSubtitle' => __('ui.purchases_lead')])

    @include('partials.flash')

    @include('partials.list-filters', [
        'action' => route('purchases.index'),
        'period' => $period,
        'from' => $from,
        'to' => $to,
        'showAllPeriod' => true,
        'showSupplier' => true,
        'suppliers' => $suppliers,
        'supplierId' => $supplierId,
        'showSearch' => true,
        'q' => $q,
        'searchPlaceholder' => 'No. / دابینکەر…',
    ])

    @include('partials.list-kpis', [
        'kpis' => [
            [
                'label' => __('ui.purchases'),
                'value' => number_format((int) $stats['count']),
                'icon' => 'package',
                'tone' => 'emerald',
            ],
            [
                'label' => __('ui.invoice_grand_total'),
                'value' => number_format((float) $stats['total'], 0),
                'icon' => 'banknote',
                'tone' => 'amber',
            ],
            [
                'label' => __('ui.suppliers'),
                'value' => number_format((int) $stats['suppliers']),
                'icon' => 'users',
                'tone' => 'slate',
            ],
        ],
    ])

    <div class="directory-cards">
        @forelse ($purchases as $purchase)
            <a href="{{ route('purchases.show', $purchase) }}" class="dir-card">
                <div class="dir-card__body">
                    <div class="dir-card__row">
                        @include('partials.icon-badge', ['icon' => 'package', 'tone' => 'emerald', 'size' => 'md'])
                        <div>
                            <p class="dir-card__title ltr-inline">{{ $purchase->purchase_number }}</p>
                            <p class="dir-card__meta">
                                {{ $purchase->supplier?->name ?: '—' }}
                                · <span class="ltr-inline">{{ $purchase->purchased_at?->format('Y-m-d') }}</span>
                                · <span class="ltr-inline">{{ number_format((float) $purchase->total_cost, 0) }}</span>
                            </p>
                        </div>
                    </div>
                </div>
                @include('partials.icons.chevron', ['class' => 'dir-card__chevron'])
            </a>
        @empty
            <div class="empty-state surface-panel">
                @include('partials.icon-badge', ['icon' => 'package', 'tone' => 'slate', 'size' => 'lg'])
                <p class="empty-state__title">{{ __('ui.purchases_empty') }}</p>
                <a href="{{ route('purchases.create') }}" class="btn btn--primary">
                    @include('partials.icons.plus', ['class' => 'btn__icon'])
                    {{ __('ui.purchase_new') }}
                </a>
            </div>
        @endforelse
    </div>

    <div class="directory-table report-section" style="--report-accent: #059669">
        <div class="report-section__head">
            <h2 class="report-section__title">{{ __('ui.purchases') }}</h2>
        </div>
        <div class="table-wrap report-table-wrap">
            <table class="data-table report-table">
                <thead>
                    @include('partials.print-table-name', [
                        'printTableTitle' => __('ui.purchases'),
                        'printTableSubtitle' => __('ui.purchases_lead'),
                        'colspan' => 5,
                    ])
                    <tr>
                        <th>{{ __('ui.purchase_no') }}</th>
                        <th>{{ __('ui.invoice_date') }}</th>
                        <th>{{ __('ui.supplier') }}</th>
                        <th>{{ __('ui.invoice_grand_total') }}</th>
                        <th class="no-print"></th>
                    </tr>
                </thead>
                <tbody>
                    @forelse ($purchases as $purchase)
                        <tr>
                            <td>
                                <a href="{{ route('purchases.show', $purchase) }}" class="ltr-inline report-link">
                                    <strong>{{ $purchase->purchase_number }}</strong>
                                </a>
                            </td>
                            <td><span class="ltr-inline">{{ $purchase->purchased_at?->format('Y-m-d') }}</span></td>
                            <td>{{ $purchase->supplier?->name ?: '—' }}</td>
                            <td><span class="ltr-inline report-num">{{ number_format((float) $purchase->total_cost, 0) }}</span></td>
                            <td class="data-table__actions">
                                <a href="{{ route('purchases.show', $purchase) }}" class="btn btn--regular btn--sm">
                                    {{ __('ui.more') }}
                                </a>
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="5" class="empty">{{ __('ui.purchases_empty') }}</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>

    @if ($purchases->hasPages())
        <div class="pager">{{ $purchases->links() }}</div>
    @endif
</section>
@endsection
