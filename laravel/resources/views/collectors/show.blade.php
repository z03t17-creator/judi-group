@extends('layouts.app')

@section('title', $collector->name.' — JUDI')

@section('content')
<section class="page collector-profile">
    <header class="page__header page__header--iconed">
        @include('partials.icon-badge', ['icon' => 'users', 'tone' => 'violet', 'size' => 'lg'])
        <div class="page__header-text">
            <h1 class="page__title">{{ __('ui.collector_profile') }}</h1>
            <p class="page__lead">
                {{ $collector->name }}
                · {{ $collector->collector_channel?->label() ?? '—' }}
                · {{ $collector->is_active ? __('ui.active') : __('ui.inactive') }}
            </p>
        </div>
        <div class="page__actions">
            <a href="{{ route('users.index', ['role' => 'collector']) }}" class="btn btn--regular">
                @include('partials.icons.arrow-back', ['class' => 'btn__icon'])
                {{ __('ui.back') }}
            </a>
            @if ($canManage)
                <a href="{{ route('collectors.edit', $collector) }}" class="btn btn--primary">
                    @include('partials.icons.pencil', ['class' => 'btn__icon'])
                    {{ __('ui.edit') }}
                </a>
            @endif
        </div>
    </header>

    @include('partials.flash')

    <div class="collector-profile__hero surface-panel">
        <img class="collector-profile__img" src="{{ $collector->imageUrl() }}" alt="">
        <div>
            <h2>{{ $collector->name }}</h2>
            <p class="collector-profile__meta" dir="ltr">{{ $collector->email }}</p>
            <p class="collector-profile__limits">
                {{ __('ui.max_discount') }}:
                <strong>{{ rtrim(rtrim(number_format((float) $collector->max_discount_percent, 2, '.', ''), '0'), '.') }}%</strong>
                · {{ __('ui.max_gift') }}:
                <strong>{{ rtrim(rtrim(number_format((float) $collector->max_gift_percent, 2, '.', ''), '0'), '.') }}%</strong>
            </p>
        </div>
    </div>

    <div class="report-page__filters">
        @include('partials.list-filters', [
            'action' => route('collectors.show', $collector),
            'routeParams' => ['collector' => $collector],
            'period' => $period,
            'from' => $from,
            'to' => $to,
            'showAllPeriod' => false,
            'showChannel' => false,
            'showInvoiceType' => false,
            'showCollector' => false,
            'showStore' => false,
        ])
    </div>

    <div class="kpi-grid collector-profile__kpis">
        <div class="kpi-card">
            <h2>{{ __('ui.report_sales_total') }}</h2>
            <p class="kpi-card__value ltr-inline">{{ number_format((float) ($report['sales_total'] ?? 0), 0) }}</p>
            <p class="kpi-card__hint">{{ number_format((int) ($report['invoice_count'] ?? 0)) }} {{ __('ui.invoices') }}</p>
        </div>
        <div class="kpi-card">
            <h2>{{ __('ui.collections') }}</h2>
            <p class="kpi-card__value ltr-inline">{{ number_format((float) ($report['collection_total'] ?? 0), 0) }}</p>
            <p class="kpi-card__hint">
                {{ __('ui.collection_status_pending') }}:
                {{ number_format((float) ($report['pending_collection_total'] ?? 0), 0) }}
            </p>
        </div>
        <div class="kpi-card">
            <h2>{{ __('ui.invoice_discount') }}</h2>
            <p class="kpi-card__value ltr-inline">{{ number_format((float) ($report['discount_total'] ?? 0), 0) }}</p>
            <p class="kpi-card__hint">
                {{ __('ui.max_discount') }} {{ number_format((float) ($report['discount_max_used_percent'] ?? 0), 1) }}%
                / {{ number_format((float) ($report['discount_limit_percent'] ?? 0), 1) }}%
            </p>
        </div>
        <div class="kpi-card">
            <h2>{{ __('ui.invoice_gift') }}</h2>
            <p class="kpi-card__value ltr-inline">{{ number_format((float) ($report['gift_units'] ?? 0), 0) }}</p>
            <p class="kpi-card__hint">
                {{ number_format((float) ($report['gift_pct_of_sold'] ?? 0), 1) }}%
                / {{ number_format((float) ($report['gift_limit_percent'] ?? 0), 1) }}%
            </p>
        </div>
        <div class="kpi-card">
            <h2>{{ __('ui.salary_ledger') }}</h2>
            <p class="kpi-card__value ltr-inline">{{ number_format($salaryTotal, 0) }}</p>
        </div>
        <div class="kpi-card">
            <h2>{{ __('ui.penalty_ledger') }}</h2>
            <p class="kpi-card__value ltr-inline">{{ number_format($penaltyTotal, 0) }}</p>
        </div>
    </div>

    <div class="collector-profile__grid">
        <section class="surface-panel">
            <header class="collector-profile__section-head">
                <h2>{{ __('ui.salary_ledger') }}</h2>
            </header>

            @if ($canLedger)
                <form method="POST" action="{{ route('collectors.salaries.store', $collector) }}" class="collector-ledger-form">
                    @csrf
                    <label class="field">
                        <span class="field__label">{{ __('ui.amount') }}</span>
                        <input class="field__input" type="number" name="amount" min="1" step="1" required inputmode="numeric" value="{{ old('amount') }}">
                    </label>
                    <label class="field">
                        <span class="field__label">{{ __('ui.invoice_date') }}</span>
                        <input class="field__input" type="date" name="paid_at" required value="{{ old('paid_at', now()->toDateString()) }}">
                    </label>
                    <label class="field field--grow">
                        <span class="field__label">{{ __('ui.notes') }}</span>
                        <input class="field__input" type="text" name="note" value="{{ old('note') }}" placeholder="{{ __('ui.optional') }}">
                    </label>
                    <button type="submit" class="btn btn--primary">{{ __('ui.salary_add') }}</button>
                </form>
                @error('amount')
                    <p class="field__error">{{ $message }}</p>
                @enderror
            @endif

            <ul class="collector-ledger-list">
                @forelse ($salaries as $row)
                    <li>
                        <div>
                            <strong dir="ltr">{{ number_format((float) $row->amount, 0) }}</strong>
                            <span dir="ltr">{{ $row->paid_at?->format('Y-m-d') }}</span>
                            @if ($row->note)
                                <span>{{ $row->note }}</span>
                            @endif
                        </div>
                        @if ($canLedger)
                            <form method="POST" action="{{ route('collectors.salaries.destroy', [$collector, $row]) }}" onsubmit="return confirm(@json(__('ui.confirm_delete_collector')));">
                                @csrf
                                @method('DELETE')
                                <button type="submit" class="btn btn--ghost btn--sm">{{ __('ui.delete') }}</button>
                            </form>
                        @endif
                    </li>
                @empty
                    <li class="empty">{{ __('ui.salary_empty') }}</li>
                @endforelse
            </ul>
        </section>

        <section class="surface-panel">
            <header class="collector-profile__section-head">
                <h2>{{ __('ui.penalty_ledger') }}</h2>
            </header>

            @if ($canLedger)
                <form method="POST" action="{{ route('collectors.penalties.store', $collector) }}" class="collector-ledger-form">
                    @csrf
                    <label class="field">
                        <span class="field__label">{{ __('ui.amount') }}</span>
                        <input class="field__input" type="number" name="amount" min="1" step="1" required inputmode="numeric" value="{{ old('amount') }}">
                    </label>
                    <label class="field">
                        <span class="field__label">{{ __('ui.invoice_date') }}</span>
                        <input class="field__input" type="date" name="penalized_at" required value="{{ old('penalized_at', now()->toDateString()) }}">
                    </label>
                    <label class="field field--grow">
                        <span class="field__label">{{ __('ui.penalty_reason') }}</span>
                        <input class="field__input" type="text" name="reason" required value="{{ old('reason') }}">
                    </label>
                    <label class="field field--grow">
                        <span class="field__label">{{ __('ui.notes') }}</span>
                        <input class="field__input" type="text" name="note" value="{{ old('note') }}" placeholder="{{ __('ui.optional') }}">
                    </label>
                    <button type="submit" class="btn btn--primary">{{ __('ui.penalty_add') }}</button>
                </form>
                @error('reason')
                    <p class="field__error">{{ $message }}</p>
                @enderror
            @endif

            <ul class="collector-ledger-list">
                @forelse ($penalties as $row)
                    <li>
                        <div>
                            <strong dir="ltr">{{ number_format((float) $row->amount, 0) }}</strong>
                            <span dir="ltr">{{ $row->penalized_at?->format('Y-m-d') }}</span>
                            <span>{{ $row->reason }}</span>
                            @if ($row->note)
                                <span>{{ $row->note }}</span>
                            @endif
                        </div>
                        @if ($canLedger)
                            <form method="POST" action="{{ route('collectors.penalties.destroy', [$collector, $row]) }}" onsubmit="return confirm(@json(__('ui.confirm_delete_collector')));">
                                @csrf
                                @method('DELETE')
                                <button type="submit" class="btn btn--ghost btn--sm">{{ __('ui.delete') }}</button>
                            </form>
                        @endif
                    </li>
                @empty
                    <li class="empty">{{ __('ui.penalty_empty') }}</li>
                @endforelse
            </ul>
        </section>
    </div>

    <section class="surface-panel" style="margin-top:1rem">
        <header class="collector-profile__section-head">
            <h2>{{ __('ui.invoices') }}</h2>
            <a href="{{ route('reports.index', ['collector_id' => $collector->id, 'period' => $period, 'from' => $from, 'to' => $to]) }}" class="btn btn--ghost btn--sm">{{ __('ui.reports') }}</a>
        </header>
        <ul class="collector-ledger-list">
            @forelse (($report['invoices'] ?? collect())->take(12) as $invoice)
                <li>
                    <a href="{{ route('invoices.show', $invoice) }}">
                        <strong dir="ltr">{{ $invoice->invoice_number }}</strong>
                        <span>{{ $invoice->store?->name }}</span>
                    </a>
                    <span dir="ltr">{{ number_format((float) $invoice->total_amount, 0) }}</span>
                </li>
            @empty
                <li class="empty">{{ __('ui.approvals_empty') }}</li>
            @endforelse
        </ul>
    </section>
</section>
@endsection
