@extends('layouts.app')

@section('title', __('ui.collections').' — JUDI')

@section('content')
<section class="page list-page">
    <header class="page__header page__header--iconed">
        @include('partials.icon-badge', ['icon' => 'cash', 'tone' => 'emerald', 'size' => 'lg'])
        <div class="page__header-text">
            <h1 class="page__title">{{ __('ui.collections') }}</h1>
            <p class="page__lead">{{ __('ui.collections_lead') }}</p>
        </div>
        <div class="page__actions">
            @include('partials.print-button', ['label' => __('ui.print_list')])
            <a href="{{ route('reports.index') }}" class="btn btn--regular">
                @include('partials.icons.clipboard', ['class' => 'btn__icon'])
                {{ __('ui.reports') }}
            </a>
            @if ($canCreate)
                <a href="{{ route('collections.create') }}" class="btn btn--primary">
                    @include('partials.icons.plus', ['class' => 'btn__icon'])
                    {{ __('ui.collection_new') }}
                </a>
            @endif
        </div>
    </header>

    @include('partials.print-doc-head', ['printTitle' => __('ui.collections'), 'printSubtitle' => __('ui.collections_lead')])

    @include('partials.flash')

    @include('partials.list-filters', [
        'action' => route('collections.index'),
        'period' => $period,
        'from' => $from,
        'to' => $to,
        'showAllPeriod' => true,
        'showChannel' => $canReview,
        'channel' => $channel,
        'showStatus' => true,
        'status' => $status,
        'statusOptions' => [
            'pending' => __('ui.collection_status_pending'),
            'confirmed' => __('ui.collection_status_confirmed'),
        ],
        'showCollector' => $canReview,
        'collectors' => $collectors,
        'selectedCollectorId' => $selectedCollectorId,
    ])

    @include('partials.list-kpis', [
        'kpis' => [
            [
                'label' => __('ui.collections'),
                'value' => number_format((int) $stats['count']),
                'icon' => 'cash',
                'tone' => 'emerald',
            ],
            [
                'label' => __('ui.report_collections'),
                'value' => number_format((float) $stats['total'], 0),
                'icon' => 'banknote',
                'tone' => 'amber',
            ],
            [
                'label' => __('ui.report_stores_visited'),
                'value' => number_format((int) $stats['stores']),
                'icon' => 'store',
                'tone' => 'orange',
            ],
            [
                'label' => __('ui.report_discount_avg'),
                'value' => number_format((float) $stats['average'], 0),
                'icon' => 'clipboard',
                'tone' => 'violet',
            ],
        ],
    ])

    <div class="directory-cards">
        @forelse ($collections as $collection)
            <a href="{{ route('collections.show', $collection) }}" class="dir-card">
                <div class="dir-card__body">
                    <div class="dir-card__row">
                        @include('partials.icon-badge', ['icon' => 'cash', 'tone' => 'emerald', 'size' => 'md'])
                        <div>
                            <p class="dir-card__title ltr-inline">{{ $collection->receipt_number }}</p>
                            <p class="dir-card__meta">
                                <span class="report-chip report-chip--{{ $collection->isPending() ? 'debt' : 'cash' }}">
                                    {{ $collection->status->label() }}
                                </span>
                                · {{ $collection->store?->name }}
                                @if ($canReview)
                                    · {{ $collection->collector?->name }}
                                @endif
                                · <span class="ltr-inline">{{ $collection->collected_at?->format('Y-m-d') }}</span>
                                · <span class="ltr-inline">{{ number_format((float) $collection->amount, 0) }}</span>
                            </p>
                        </div>
                    </div>
                </div>
                @include('partials.icons.chevron', ['class' => 'dir-card__chevron'])
            </a>
        @empty
            <div class="empty-state surface-panel">
                @include('partials.icon-badge', ['icon' => 'cash', 'tone' => 'slate', 'size' => 'lg'])
                <p class="empty-state__title">{{ __('ui.collections_empty') }}</p>
                @if ($canCreate)
                    <a href="{{ route('collections.create') }}" class="btn btn--primary">
                        @include('partials.icons.plus', ['class' => 'btn__icon'])
                        {{ __('ui.collection_new') }}
                    </a>
                @endif
            </div>
        @endforelse
    </div>

    <div class="directory-table report-section" style="--report-accent: var(--judi-500)">
        <div class="report-section__head">
            <h2 class="report-section__title">{{ __('ui.collections') }}</h2>
        </div>
        <div class="table-wrap report-table-wrap">
            <table class="data-table report-table">
                <thead>
                    <tr>
                        <th>{{ __('ui.collection_receipt_no') }}</th>
                        <th>{{ __('ui.invoice_date') }}</th>
                        @if ($canReview)
                            <th>{{ __('ui.invoice_delegate') }}</th>
                        @endif
                        <th>{{ __('ui.invoice_store') }}</th>
                        <th>{{ __('ui.invoice_status') }}</th>
                        <th>{{ __('ui.invoice_grand_total') }}</th>
                        <th>{{ __('ui.notes') }}</th>
                        <th class="no-print"></th>
                    </tr>
                </thead>
                <tbody>
                    @forelse ($collections as $collection)
                        <tr>
                            <td>
                                <a href="{{ route('collections.show', $collection) }}" class="ltr-inline report-link">
                                    <strong>{{ $collection->receipt_number }}</strong>
                                </a>
                            </td>
                            <td><span class="ltr-inline">{{ $collection->collected_at?->format('Y-m-d') }}</span></td>
                            @if ($canReview)
                                <td>{{ $collection->collector?->name }}</td>
                            @endif
                            <td>{{ $collection->store?->name }}</td>
                            <td>
                                <span class="report-chip report-chip--{{ $collection->isPending() ? 'debt' : 'cash' }}">
                                    {{ $collection->status->label() }}
                                </span>
                            </td>
                            <td><span class="ltr-inline report-num report-num--collect">{{ number_format((float) $collection->amount, 0) }}</span></td>
                            <td>
                                @if ($collection->note)
                                    <span class="report-chip report-chip--collect">{{ \Illuminate\Support\Str::limit($collection->note, 28) }}</span>
                                @else
                                    —
                                @endif
                                @if ($collection->receipt_path)
                                    · <a href="{{ $collection->receiptUrl() }}" target="_blank" rel="noopener">{{ __('ui.image') }}</a>
                                @endif
                            </td>
                            <td class="data-table__actions">
                                @include('partials.share-button', [
                                    'shareTitle' => $collection->receipt_number,
                                    'shareText' => \App\Support\ShareText::collection($collection, config('judi.company')),
                                    'shareId' => 'share-col-'.$collection->id,
                                    'compact' => true,
                                ])
                                <a href="{{ route('collections.show', $collection) }}" class="btn btn--regular btn--sm">{{ __('ui.print') }}</a>
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="{{ $canReview ? 8 : 7 }}" class="empty">{{ __('ui.collections_empty') }}</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>

    @if ($collections->hasPages())
        <div class="pager">{{ $collections->links() }}</div>
    @endif
</section>
@endsection
