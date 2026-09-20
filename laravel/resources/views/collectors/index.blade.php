@extends('layouts.app')

@section('title', __('ui.collectors').' — JUDI')

@section('content')
<section class="page list-page">
    <header class="page__header page__header--iconed">
        @include('partials.icon-badge', ['icon' => 'users', 'tone' => 'violet', 'size' => 'lg'])
        <div class="page__header-text">
            <h1 class="page__title">{{ __('ui.collectors') }}</h1>
            <p class="page__lead">{{ __('ui.collectors_lead') }}</p>
        </div>
        <div class="page__actions">
            @include('partials.print-button', ['label' => __('ui.print_list')])
            @if ($canManage)
                <a href="{{ route('collectors.create') }}" class="btn btn--primary">
                    @include('partials.icons.plus', ['class' => 'btn__icon'])
                    {{ __('ui.collector_new') }}
                </a>
            @endif
        </div>
    </header>

    @include('partials.print-doc-head', [
        'printTitle' => __('ui.collectors'),
        'printFilters' => array_values(array_filter([
            request('q') ? ['label' => __('ui.search'), 'value' => request('q')] : null,
        ])),
    ])

    @include('partials.flash')

    <form method="GET" action="{{ route('collectors.index') }}" class="toolbar toolbar--iconed">
        <label class="field field--grow field--search">
            <span class="field__label visually-hidden">{{ __('ui.search') }}</span>
            <span class="field__search-icon" aria-hidden="true">
                @include('partials.icons.search', ['class' => 'field__search-svg'])
            </span>
            <input class="field__input field__input--search" type="search" name="q" value="{{ request('q') }}" placeholder="{{ __('ui.search_name_email') }}" enterkeyhint="search">
        </label>
        <button type="submit" class="btn btn--regular">
            @include('partials.icons.search', ['class' => 'btn__icon'])
            {{ __('ui.search') }}
        </button>
    </form>

    <div class="directory-cards">
        @forelse ($collectors as $collector)
            <a
                href="{{ $canManage ? route('collectors.edit', $collector) : '#' }}"
                class="dir-card"
                @if(! $canManage) onclick="return false" @endif
            >
                <div class="dir-card__body">
                    <div class="dir-card__row">
                        <img class="dir-card__img dir-card__img--round" src="{{ $collector->imageUrl() }}" alt="">
                        <div>
                            <p class="dir-card__title">{{ $collector->name }}</p>
                            <p class="dir-card__meta">
                                {{ $collector->collector_channel?->label() ?? '—' }}
                                · {{ __('ui.max_discount') }} {{ rtrim(rtrim(number_format((float) $collector->max_discount_percent, 2, '.', ''), '0'), '.') }}%
                                · {{ __('ui.max_gift') }} {{ rtrim(rtrim(number_format((float) $collector->max_gift_percent, 2, '.', ''), '0'), '.') }}%
                                · <span dir="ltr">{{ $collector->email }}</span>
                            </p>
                        </div>
                    </div>
                </div>
                @if ($canManage)
                    @include('partials.icons.chevron', ['class' => 'dir-card__chevron'])
                @endif
            </a>
        @empty
            <div class="surface-panel"><p class="empty">{{ __('ui.collectors_empty') }}</p></div>
        @endforelse
    </div>

    <div class="directory-table report-section" style="--report-accent: #7c3aed">
        <div class="report-section__head">
            <h2 class="report-section__title">{{ __('ui.collectors') }}</h2>
        </div>
        <div class="table-wrap report-table-wrap">
            <table class="data-table report-table">
                <thead>
                    <tr>
                        <th>{{ __('ui.name') }}</th>
                        <th>{{ __('ui.email') }}</th>
                        <th>{{ __('ui.collector_channel') }}</th>
                        <th>{{ __('ui.invoice_status') }}</th>
                        @if ($canManage)
                            <th class="no-print"></th>
                        @endif
                    </tr>
                </thead>
                <tbody>
                    @forelse ($collectors as $collector)
                        <tr>
                            <td>
                                <div class="table-entity">
                                    <img class="table-entity__img table-entity__img--round" src="{{ $collector->imageUrl() }}" alt="">
                                    <strong>{{ $collector->name }}</strong>
                                </div>
                            </td>
                            <td><span class="ltr-inline">{{ $collector->email }}</span></td>
                            <td>{{ $collector->collector_channel?->label() ?? '—' }}</td>
                            <td>
                                <span class="badge {{ $collector->is_active ? 'badge--ok' : 'badge--off' }}">
                                    {{ $collector->is_active ? __('ui.active') : __('ui.inactive') }}
                                </span>
                            </td>
                            @if ($canManage)
                                <td class="data-table__actions">
                                    <a href="{{ route('collectors.edit', $collector) }}" class="btn btn--regular btn--sm">
                                        @include('partials.icons.pencil', ['class' => 'btn__icon'])
                                        {{ __('ui.edit') }}
                                    </a>
                                </td>
                            @endif
                        </tr>
                    @empty
                        <tr>
                            <td colspan="{{ $canManage ? 5 : 4 }}" class="empty">{{ __('ui.collectors_empty') }}</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>

    @if ($collectors->hasPages())
        <div class="pager">{{ $collectors->links() }}</div>
    @endif
</section>
@endsection
