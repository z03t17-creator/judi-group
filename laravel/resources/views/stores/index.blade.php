@extends('layouts.app')

@section('title', __('ui.stores').' — JUDI')

@section('content')
<section class="page list-page">
    <header class="page__header page__header--iconed">
        @include('partials.icon-badge', ['icon' => 'store', 'tone' => 'orange', 'size' => 'lg'])
        <div class="page__header-text">
            <h1 class="page__title">{{ __('ui.stores') }}</h1>
            <p class="page__lead">{{ __('ui.stores_lead') }}</p>
        </div>
        <div class="page__actions">
            @include('partials.print-button', ['label' => __('ui.print_list')])
            @if ($canManage)
                <a href="{{ route('stores.create') }}" class="btn btn--primary">
                    @include('partials.icons.plus', ['class' => 'btn__icon'])
                    {{ __('ui.store_new') }}
                </a>
            @endif
        </div>
    </header>

    @include('partials.print-doc-head', [
        'printTitle' => __('ui.stores'),
        'printFilters' => array_values(array_filter([
            request('q') ? ['label' => __('ui.search'), 'value' => request('q')] : null,
        ])),
    ])

    @include('partials.flash')

    <form method="GET" action="{{ route('stores.index') }}" class="toolbar toolbar--iconed">
        <label class="field field--grow field--search">
            <span class="field__label visually-hidden">{{ __('ui.search') }}</span>
            <span class="field__search-icon" aria-hidden="true">
                @include('partials.icons.search', ['class' => 'field__search-svg'])
            </span>
            <input class="field__input field__input--search" type="search" name="q" value="{{ request('q') }}" placeholder="{{ __('ui.search_store') }}" enterkeyhint="search">
        </label>
        <button type="submit" class="btn btn--regular">
            @include('partials.icons.search', ['class' => 'btn__icon'])
            {{ __('ui.search') }}
        </button>
    </form>

    <div class="directory-cards">
        @forelse ($stores as $store)
            <a href="{{ route('stores.show', $store) }}" class="dir-card">
                <div class="dir-card__body">
                    <div class="dir-card__row">
                        <img class="dir-card__img" src="{{ $store->imageUrl() }}" alt="">
                        <div>
                            <p class="dir-card__title">{{ $store->name }}</p>
                            <p class="dir-card__meta" dir="ltr">{{ $store->phone }} · {{ $store->address ?: '—' }}</p>
                        </div>
                    </div>
                </div>
                @include('partials.icons.chevron', ['class' => 'dir-card__chevron'])
            </a>
        @empty
            <div class="surface-panel"><p class="empty">{{ __('ui.stores_empty') }}</p></div>
        @endforelse
    </div>

    <div class="directory-table report-section" style="--report-accent: #ea580c">
        <div class="report-section__head">
            <h2 class="report-section__title">{{ __('ui.stores') }}</h2>
        </div>
        <div class="table-wrap report-table-wrap">
            <table class="data-table report-table">
                <thead>
                    <tr>
                        <th>{{ __('ui.store_name') }}</th>
                        <th>{{ __('ui.phone') }}</th>
                        <th>{{ __('ui.address') }}</th>
                        <th>{{ __('ui.credit_limit') }}</th>
                        <th>{{ __('ui.current_debt') }}</th>
                        <th>{{ __('ui.active_store') }}</th>
                        <th class="no-print"></th>
                    </tr>
                </thead>
                <tbody>
                    @forelse ($stores as $store)
                        <tr>
                            <td>
                                <div class="table-entity">
                                    <img class="table-entity__img" src="{{ $store->imageUrl() }}" alt="">
                                    <div>
                                        <strong>{{ $store->name }}</strong>
                                        @if ($store->owner_name)
                                            <span class="muted block">{{ $store->owner_name }}</span>
                                        @endif
                                    </div>
                                </div>
                            </td>
                            <td dir="ltr">{{ $store->phone }}</td>
                            <td>{{ $store->address ?: '—' }}</td>
                            <td dir="ltr"><span class="report-num">{{ number_format((float) $store->credit_limit, 0) }}</span></td>
                            <td dir="ltr"><span class="report-num report-num--debt">{{ number_format((float) $store->current_debt, 0) }}</span></td>
                            <td>
                                <span class="badge {{ $store->is_active ? 'badge--ok' : 'badge--off' }}">
                                    {{ $store->is_active ? 'چالاک' : 'ناچالاک' }}
                                </span>
                            </td>
                            @if ($canManage)
                                <td class="data-table__actions">
                                    <a href="{{ route('stores.show', $store) }}" class="btn btn--regular btn--sm">
                                        {{ __('ui.store_profile') }}
                                    </a>
                                    <a href="{{ route('stores.edit', $store) }}" class="btn btn--regular btn--sm">
                                        @include('partials.icons.pencil', ['class' => 'btn__icon'])
                                        {{ __('ui.edit') }}
                                    </a>
                                </td>
                            @else
                                <td class="data-table__actions">
                                    <a href="{{ route('stores.show', $store) }}" class="btn btn--regular btn--sm">
                                        {{ __('ui.store_profile') }}
                                    </a>
                                </td>
                            @endif
                        </tr>
                    @empty
                        <tr>
                            <td colspan="7" class="empty">{{ __('ui.stores_empty') }}</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>

    @if ($stores->hasPages())
        <div class="pager">{{ $stores->links() }}</div>
    @endif
</section>
@endsection
