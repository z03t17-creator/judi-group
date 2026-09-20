@extends('layouts.app')

@section('title', __('ui.stock').' — JUDI')

@section('content')
<section class="page list-page">
    <header class="page__header page__header--iconed">
        @include('partials.icon-badge', ['icon' => 'warehouse', 'tone' => 'slate', 'size' => 'lg'])
        <div class="page__header-text">
            <h1 class="page__title">{{ __('ui.stock') }}</h1>
            <p class="page__lead">
                {{ __('ui.stock_lead') }}
                @if ($warehouse)
                    · {{ $warehouse->displayName() }}
                @endif
            </p>
        </div>
        <div class="page__actions">
            @include('partials.print-button', ['label' => __('ui.print_list')])
            <a href="{{ route('purchases.create') }}" class="btn btn--primary">
                @include('partials.icons.plus', ['class' => 'btn__icon'])
                {{ __('ui.purchase_new') }}
            </a>
        </div>
    </header>

    @include('partials.print-doc-head', [
        'printTitle' => __('ui.stock'),
        'printSubtitle' => $warehouse?->displayName(),
        'printFilters' => array_values(array_filter([
            request('q') ? ['label' => __('ui.search'), 'value' => request('q')] : null,
        ])),
    ])

    @include('partials.flash')

    @unless ($warehouse)
        <div class="alert alert--danger" role="alert">{{ __('ui.stock_no_warehouse') }}</div>
    @else
        <form method="GET" action="{{ route('stock.index') }}" class="toolbar toolbar--iconed">
            <label class="field field--grow field--search">
                <span class="field__label visually-hidden">{{ __('ui.search') }}</span>
                <span class="field__search-icon" aria-hidden="true">
                    @include('partials.icons.search', ['class' => 'field__search-svg'])
                </span>
                <input class="field__input field__input--search" type="search" name="q" value="{{ request('q') }}" placeholder="{{ __('ui.invoice_product_search') }}" enterkeyhint="search">
            </label>
            <button type="submit" class="btn btn--regular">
                @include('partials.icons.search', ['class' => 'btn__icon'])
                {{ __('ui.search') }}
            </button>
        </form>

        @include('partials.list-kpis', [
            'kpis' => [
                [
                    'label' => __('ui.products'),
                    'value' => number_format((int) $stats['sku_count']),
                    'icon' => 'package',
                    'tone' => 'emerald',
                ],
                [
                    'label' => __('ui.stock_on_hand'),
                    'value' => number_format((int) $stats['piece_total']),
                    'hint' => __('ui.stock_pieces'),
                    'icon' => 'warehouse',
                    'tone' => 'slate',
                ],
            ],
        ])

        <div class="directory-cards">
            @forelse ($rows as $row)
                @php $breakdown = $row->breakdown(); @endphp
                <div class="dir-card">
                    <div class="dir-card__body">
                        <div class="dir-card__row">
                            <img class="dir-card__img" src="{{ $row->product?->imageUrl() }}" alt="">
                            <div>
                                <p class="dir-card__title">{{ $row->product?->displayName() }}</p>
                                <p class="dir-card__meta">
                                    <span class="ltr-inline">{{ $row->product?->sku }}</span>
                                    · <strong class="ltr-inline">{{ number_format((int) $row->qty_pieces) }}</strong> {{ __('ui.stock_pieces') }}
                                    · {{ number_format($breakdown['carton']) }} {{ __('ui.carton') }}
                                    · {{ number_format($breakdown['packet']) }} {{ __('ui.packet') }}
                                    · {{ number_format($breakdown['piece']) }} {{ __('ui.piece') }}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            @empty
                <div class="empty-state surface-panel">
                    @include('partials.icon-badge', ['icon' => 'warehouse', 'tone' => 'slate', 'size' => 'lg'])
                    <p class="empty-state__title">{{ __('ui.stock_empty') }}</p>
                    <a href="{{ route('purchases.create') }}" class="btn btn--primary">
                        @include('partials.icons.plus', ['class' => 'btn__icon'])
                        {{ __('ui.purchase_new') }}
                    </a>
                </div>
            @endforelse
        </div>

        <div class="directory-table report-section" style="--report-accent: var(--judi-600)">
            <div class="report-section__head">
                <h2 class="report-section__title">{{ __('ui.stock') }}</h2>
            </div>
            <div class="table-wrap report-table-wrap">
                <table class="data-table report-table">
                    <thead>
                        @include('partials.print-table-name', [
                            'printTableTitle' => __('ui.stock'),
                            'printTableSubtitle' => $warehouse?->displayName(),
                            'colspan' => 6,
                        ])
                        <tr>
                            <th>{{ __('ui.product_name') }}</th>
                            <th>{{ __('ui.sku') }}</th>
                            <th>{{ __('ui.stock_on_hand') }}</th>
                            <th>{{ __('ui.carton') }}</th>
                            <th>{{ __('ui.packet') }}</th>
                            <th>{{ __('ui.piece') }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse ($rows as $row)
                            @php $breakdown = $row->breakdown(); @endphp
                            <tr>
                                <td>
                                    <div class="table-entity">
                                        <img class="table-entity__img" src="{{ $row->product?->imageUrl() }}" alt="">
                                        <div>
                                            <strong>{{ $row->product?->displayName() }}</strong>
                                        </div>
                                    </div>
                                </td>
                                <td><span class="ltr-inline">{{ $row->product?->sku }}</span></td>
                                <td>
                                    <strong class="ltr-inline report-num">{{ number_format((int) $row->qty_pieces) }}</strong>
                                    <span class="muted"> {{ __('ui.stock_pieces') }}</span>
                                </td>
                                <td>
                                    <span class="stock-pill {{ $breakdown['carton'] < 1 ? 'stock-pill--empty' : '' }}">
                                        <strong>{{ number_format($breakdown['carton']) }}</strong>
                                        {{ __('ui.carton') }}
                                    </span>
                                </td>
                                <td>
                                    <span class="stock-pill {{ $breakdown['packet'] < 1 ? 'stock-pill--empty' : '' }}">
                                        <strong>{{ number_format($breakdown['packet']) }}</strong>
                                        {{ __('ui.packet') }}
                                    </span>
                                </td>
                                <td>
                                    <span class="stock-pill {{ $breakdown['piece'] < 1 ? 'stock-pill--empty' : '' }}">
                                        <strong>{{ number_format($breakdown['piece']) }}</strong>
                                        {{ __('ui.piece') }}
                                    </span>
                                </td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="6" class="empty">{{ __('ui.stock_empty') }}</td>
                            </tr>
                        @endforelse
                        @if ($rows->isNotEmpty())
                            <tr class="table-total">
                                <th colspan="2">{{ __('ui.invoice_grand_total') }}</th>
                                <td>
                                    <strong class="ltr-inline report-num">{{ number_format((int) $stockTotals['pieces']) }}</strong>
                                    <span class="muted"> {{ __('ui.stock_pieces') }}</span>
                                </td>
                                <td>
                                    <span class="stock-pill {{ $stockTotals['carton'] < 1 ? 'stock-pill--empty' : '' }}">
                                        <strong>{{ number_format((int) $stockTotals['carton']) }}</strong>
                                        {{ __('ui.carton') }}
                                    </span>
                                </td>
                                <td>
                                    <span class="stock-pill {{ $stockTotals['packet'] < 1 ? 'stock-pill--empty' : '' }}">
                                        <strong>{{ number_format((int) $stockTotals['packet']) }}</strong>
                                        {{ __('ui.packet') }}
                                    </span>
                                </td>
                                <td>
                                    <span class="stock-pill {{ $stockTotals['piece'] < 1 ? 'stock-pill--empty' : '' }}">
                                        <strong>{{ number_format((int) $stockTotals['piece']) }}</strong>
                                        {{ __('ui.piece') }}
                                    </span>
                                </td>
                            </tr>
                        @endif
                    </tbody>
                </table>
            </div>
        </div>

        @if ($rows->hasPages())
            <div class="pager">{{ $rows->links() }}</div>
        @endif
    @endunless
</section>
@endsection
