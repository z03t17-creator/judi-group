@extends('layouts.app')

@section('title', __('ui.expenses').' — JUDI')

@section('content')
<section class="page list-page">
    <header class="page__header page__header--iconed">
        @include('partials.icon-badge', ['icon' => 'wallet', 'tone' => 'sky', 'size' => 'lg'])
        <div class="page__header-text">
            <h1 class="page__title">{{ __('ui.expenses') }}</h1>
            <p class="page__lead">{{ __('ui.expenses_lead') }}</p>
        </div>
        <div class="page__actions">
            @include('partials.print-button', ['label' => __('ui.print_list')])
            <a href="{{ route('reports.index') }}" class="btn btn--regular">
                @include('partials.icons.clipboard', ['class' => 'btn__icon'])
                {{ __('ui.reports') }}
            </a>
            @if ($canCreate)
                <a href="{{ route('expenses.create') }}" class="btn btn--primary">
                    @include('partials.icons.plus', ['class' => 'btn__icon'])
                    {{ __('ui.expense_new') }}
                </a>
            @endif
        </div>
    </header>

    @include('partials.print-doc-head', ['printTitle' => __('ui.expenses'), 'printSubtitle' => __('ui.expenses_lead')])

    @include('partials.flash')

    @include('partials.list-filters', [
        'action' => route('expenses.index'),
        'period' => $period,
        'from' => $from,
        'to' => $to,
        'showAllPeriod' => true,
        'showChannel' => $canReview,
        'channel' => $channel,
        'showCategory' => true,
        'category' => $category,
        'categories' => $categories,
        'showCollector' => $canReview,
        'collectors' => $collectors,
        'selectedCollectorId' => $selectedCollectorId,
    ])

    @include('partials.list-kpis', [
        'kpis' => [
            [
                'label' => __('ui.expenses'),
                'value' => number_format((int) $stats['count']),
                'icon' => 'wallet',
                'tone' => 'sky',
            ],
            [
                'label' => __('ui.report_expenses'),
                'value' => number_format((float) $stats['total'], 0),
                'icon' => 'banknote',
                'tone' => 'amber',
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
        @forelse ($expenses as $expense)
            <div class="dir-card">
                <div class="dir-card__body">
                    <div class="dir-card__row">
                        @include('partials.icon-badge', ['icon' => 'wallet', 'tone' => 'sky', 'size' => 'md'])
                        <div>
                            <p class="dir-card__title">
                                {{ $expense->category->label() }}
                                · <span class="ltr-inline">{{ number_format((float) $expense->amount, 0) }}</span>
                            </p>
                            <p class="dir-card__meta">
                                <span class="ltr-inline">{{ $expense->spent_at?->format('Y-m-d') }}</span>
                                @if ($canReview)
                                    · {{ $expense->collector?->name }}
                                @endif
                                @if ($expense->note)
                                    · {{ \Illuminate\Support\Str::limit($expense->note, 40) }}
                                @endif
                                @if ($expense->receipt_path)
                                    · <a href="{{ $expense->receiptUrl() }}" target="_blank" rel="noopener">{{ __('ui.image') }}</a>
                                @endif
                            </p>
                        </div>
                    </div>
                </div>
                <form method="POST" action="{{ route('expenses.destroy', $expense) }}" onsubmit="return confirm(@json(__('ui.confirm_delete_expense')));">
                    @csrf
                    @method('DELETE')
                    <button type="submit" class="btn btn--regular btn--sm">{{ __('ui.delete') }}</button>
                </form>
            </div>
        @empty
            <div class="empty-state surface-panel">
                @include('partials.icon-badge', ['icon' => 'wallet', 'tone' => 'slate', 'size' => 'lg'])
                <p class="empty-state__title">{{ __('ui.expenses_empty') }}</p>
                @if ($canCreate)
                    <a href="{{ route('expenses.create') }}" class="btn btn--primary">
                        @include('partials.icons.plus', ['class' => 'btn__icon'])
                        {{ __('ui.expense_new') }}
                    </a>
                @endif
            </div>
        @endforelse
    </div>

    <div class="directory-table report-section" style="--report-accent: #0284c7">
        <div class="report-section__head">
            <h2 class="report-section__title">{{ __('ui.expenses') }}</h2>
        </div>
        <div class="table-wrap report-table-wrap">
            <table class="data-table report-table">
                <thead>
                    <tr>
                        <th>{{ __('ui.invoice_date') }}</th>
                        @if ($canReview)
                            <th>{{ __('ui.invoice_delegate') }}</th>
                        @endif
                        <th>{{ __('ui.expense_category') }}</th>
                        <th>{{ __('ui.invoice_grand_total') }}</th>
                        <th>{{ __('ui.notes') }}</th>
                        <th class="no-print"></th>
                    </tr>
                </thead>
                <tbody>
                    @forelse ($expenses as $expense)
                        <tr>
                            <td><span class="ltr-inline">{{ $expense->spent_at?->format('Y-m-d') }}</span></td>
                            @if ($canReview)
                                <td>{{ $expense->collector?->name }}</td>
                            @endif
                            <td><span class="report-chip report-chip--expense">{{ $expense->category->label() }}</span></td>
                            <td><span class="ltr-inline report-num report-num--expense">{{ number_format((float) $expense->amount, 0) }}</span></td>
                            <td>
                                {{ $expense->note ?: '—' }}
                                @if ($expense->receipt_path)
                                    · <a href="{{ $expense->receiptUrl() }}" target="_blank" rel="noopener">{{ __('ui.image') }}</a>
                                @endif
                            </td>
                            <td class="data-table__actions">
                                <form method="POST" action="{{ route('expenses.destroy', $expense) }}" onsubmit="return confirm(@json(__('ui.confirm_delete_expense')));">
                                    @csrf
                                    @method('DELETE')
                                    <button type="submit" class="btn btn--regular btn--sm">{{ __('ui.delete') }}</button>
                                </form>
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="{{ $canReview ? 6 : 5 }}" class="empty">{{ __('ui.expenses_empty') }}</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>

    @if ($expenses->hasPages())
        <div class="pager">{{ $expenses->links() }}</div>
    @endif
</section>
@endsection
