@extends('layouts.app')

@section('title', __('ui.suppliers').' — JUDI')

@section('content')
<section class="page list-page">
    <header class="page__header page__header--iconed">
        @include('partials.icon-badge', ['icon' => 'users', 'tone' => 'slate', 'size' => 'lg'])
        <div class="page__header-text">
            <h1 class="page__title">{{ __('ui.suppliers') }}</h1>
            <p class="page__lead">{{ __('ui.suppliers_lead') }}</p>
        </div>
        <div class="page__actions">
            @include('partials.print-button', ['label' => __('ui.print_list')])
            <a href="{{ route('suppliers.create') }}" class="btn btn--primary">
                @include('partials.icons.plus', ['class' => 'btn__icon'])
                {{ __('ui.supplier_new') }}
            </a>
        </div>
    </header>

    @include('partials.print-doc-head', [
        'printTitle' => __('ui.suppliers'),
        'printSubtitle' => __('ui.suppliers_lead'),
        'printFilters' => array_values(array_filter([
            request('q') ? ['label' => __('ui.search'), 'value' => request('q')] : null,
        ])),
    ])

    @include('partials.flash')

    <form method="GET" action="{{ route('suppliers.index') }}" class="toolbar toolbar--iconed">
        <label class="field field--grow field--search">
            <span class="field__label visually-hidden">{{ __('ui.search') }}</span>
            <span class="field__search-icon" aria-hidden="true">
                @include('partials.icons.search', ['class' => 'field__search-svg'])
            </span>
            <input class="field__input field__input--search" type="search" name="q" value="{{ request('q') }}" placeholder="{{ __('ui.search') }}…" enterkeyhint="search">
        </label>
        <button type="submit" class="btn btn--regular">
            @include('partials.icons.search', ['class' => 'btn__icon'])
            {{ __('ui.search') }}
        </button>
    </form>

    @include('partials.list-kpis', [
        'kpis' => [
            [
                'label' => __('ui.suppliers'),
                'value' => number_format((int) $stats['count']),
                'icon' => 'users',
                'tone' => 'slate',
            ],
            [
                'label' => __('ui.active'),
                'value' => number_format((int) $stats['active']),
                'icon' => 'users',
                'tone' => 'emerald',
            ],
            [
                'label' => __('ui.inactive'),
                'value' => number_format((int) $stats['inactive']),
                'icon' => 'users',
                'tone' => 'orange',
            ],
        ],
    ])

    <div class="directory-cards">
        @forelse ($suppliers as $supplier)
            <a href="{{ route('suppliers.edit', $supplier) }}" class="dir-card">
                <div class="dir-card__body">
                    <div class="dir-card__row">
                        @include('partials.icon-badge', [
                            'icon' => 'users',
                            'tone' => $supplier->is_active ? 'emerald' : 'slate',
                            'size' => 'md',
                        ])
                        <div>
                            <p class="dir-card__title">{{ $supplier->name }}</p>
                            <p class="dir-card__meta">
                                <span dir="ltr">{{ $supplier->phone ?: '—' }}</span>
                                · {{ $supplier->is_active ? __('ui.active') : __('ui.inactive') }}
                            </p>
                        </div>
                    </div>
                </div>
                @include('partials.icons.chevron', ['class' => 'dir-card__chevron'])
            </a>
        @empty
            <div class="empty-state surface-panel">
                @include('partials.icon-badge', ['icon' => 'users', 'tone' => 'slate', 'size' => 'lg'])
                <p class="empty-state__title">{{ __('ui.suppliers_empty') }}</p>
                <a href="{{ route('suppliers.create') }}" class="btn btn--primary">
                    @include('partials.icons.plus', ['class' => 'btn__icon'])
                    {{ __('ui.supplier_new') }}
                </a>
            </div>
        @endforelse
    </div>

    <div class="directory-table report-section" style="--report-accent: #57534e">
        <div class="report-section__head">
            <h2 class="report-section__title">{{ __('ui.suppliers') }}</h2>
        </div>
        <div class="table-wrap report-table-wrap">
            <table class="data-table report-table">
                <thead>
                    <tr>
                        <th>{{ __('ui.supplier_name') }}</th>
                        <th>{{ __('ui.phone') }}</th>
                        <th>{{ __('ui.active') }}</th>
                        <th class="no-print"></th>
                    </tr>
                </thead>
                <tbody>
                    @forelse ($suppliers as $supplier)
                        <tr>
                            <td><strong>{{ $supplier->name }}</strong></td>
                            <td dir="ltr">{{ $supplier->phone ?: '—' }}</td>
                            <td>
                                <span class="badge {{ $supplier->is_active ? 'badge--ok' : 'badge--off' }}">
                                    {{ $supplier->is_active ? __('ui.active') : __('ui.inactive') }}
                                </span>
                            </td>
                            <td class="data-table__actions">
                                <a href="{{ route('suppliers.edit', $supplier) }}" class="btn btn--regular btn--sm">
                                    @include('partials.icons.pencil', ['class' => 'btn__icon'])
                                    {{ __('ui.edit') }}
                                </a>
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="4" class="empty">{{ __('ui.suppliers_empty') }}</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>

    @if ($suppliers->hasPages())
        <div class="pager">{{ $suppliers->links() }}</div>
    @endif
</section>
@endsection
