@extends('layouts.app')

@section('title', __('ui.users_collectors').' — JUDI')

@section('content')
<section class="page list-page">
    <header class="page__header page__header--iconed">
        @include('partials.icon-badge', ['icon' => 'users', 'tone' => 'violet', 'size' => 'lg'])
        <div class="page__header-text">
            <h1 class="page__title">{{ __('ui.users_collectors') }}</h1>
            <p class="page__lead">{{ __('ui.users_collectors_lead') }}</p>
        </div>
        <div class="page__actions">
            @include('partials.print-button', ['label' => __('ui.print_list')])
            @if ($canManageCollectors)
                <a href="{{ route('collectors.create') }}" class="btn btn--primary">
                    @include('partials.icons.plus', ['class' => 'btn__icon'])
                    {{ __('ui.collector_new') }}
                </a>
            @endif
        </div>
    </header>

    @include('partials.print-doc-head', [
        'printTitle' => __('ui.users_collectors'),
        'printFilters' => array_values(array_filter([
            request('q') ? ['label' => __('ui.search'), 'value' => request('q')] : null,
        ])),
    ])

    @include('partials.flash')

    <form method="GET" action="{{ route('users.index') }}" class="toolbar toolbar--iconed">
        <label class="field field--grow field--search">
            <span class="field__label visually-hidden">{{ __('ui.search') }}</span>
            <span class="field__search-icon" aria-hidden="true">
                @include('partials.icons.search', ['class' => 'field__search-svg'])
            </span>
            <input class="field__input field__input--search" type="search" name="q" value="{{ request('q') }}" placeholder="{{ __('ui.search_name_email') }}" enterkeyhint="search">
        </label>
        @unless ($forceCollectorsOnly)
            <label class="field">
                <span class="field__label visually-hidden">{{ __('ui.role') }}</span>
                <select class="field__input" name="role" onchange="this.form.submit()">
                    <option value="">{{ __('ui.all') }}</option>
                    @foreach ($roles as $role)
                        <option value="{{ $role->value }}" @selected(($roleFilter ?? request('role')) === $role->value)>{{ $role->label() }}</option>
                    @endforeach
                </select>
            </label>
        @endunless
        <button type="submit" class="btn btn--regular">
            @include('partials.icons.search', ['class' => 'btn__icon'])
            {{ __('ui.search') }}
        </button>
    </form>

    <div class="directory-cards">
        @forelse ($users as $row)
            @php
                $editUrl = $canManageUsers
                    ? route('users.edit', $row)
                    : ($row->isCollector() && $canManageCollectors ? route('collectors.edit', $row) : null);
            @endphp
            <a
                href="{{ $editUrl ?: '#' }}"
                class="dir-card"
                @if (! $editUrl) onclick="return false" @endif
            >
                <div class="dir-card__body">
                    <div class="dir-card__row">
                        <img class="dir-card__img dir-card__img--round" src="{{ $row->imageUrl() }}" alt="">
                        <div>
                            <p class="dir-card__title">{{ $row->name }}</p>
                            <p class="dir-card__meta">
                                {{ $row->role->label() }}
                                @if ($row->isCollector())
                                    · {{ $row->collector_channel?->label() ?? '—' }}
                                @endif
                                · <span class="ltr-inline">{{ $row->email }}</span>
                            </p>
                        </div>
                    </div>
                </div>
                @if ($editUrl)
                    @include('partials.icons.chevron', ['class' => 'dir-card__chevron'])
                @endif
            </a>
        @empty
            <div class="surface-panel"><p class="empty">{{ __('ui.users_empty') }}</p></div>
        @endforelse
    </div>

    <div class="directory-table report-section" style="--report-accent: #7c3aed">
        <div class="report-section__head">
            <h2 class="report-section__title">{{ __('ui.users_collectors') }}</h2>
        </div>
        <div class="table-wrap report-table-wrap">
            <table class="data-table report-table">
                <thead>
                    <tr>
                        <th>{{ __('ui.name') }}</th>
                        <th>{{ __('ui.email') }}</th>
                        <th>{{ __('ui.role') }}</th>
                        <th>{{ __('ui.collector_channel') }} / {{ __('ui.max_discount') }} / {{ __('ui.max_gift') }}</th>
                        <th>{{ __('ui.active') }}</th>
                        <th class="no-print"></th>
                    </tr>
                </thead>
                <tbody>
                    @forelse ($users as $row)
                        @php
                            $editUrl = $canManageUsers
                                ? route('users.edit', $row)
                                : ($row->isCollector() && $canManageCollectors ? route('collectors.edit', $row) : null);
                        @endphp
                        <tr>
                            <td>
                                <div class="table-entity">
                                    <img class="table-entity__img table-entity__img--round" src="{{ $row->imageUrl() }}" alt="">
                                    <strong>{{ $row->name }}</strong>
                                </div>
                            </td>
                            <td><span class="ltr-inline">{{ $row->email }}</span></td>
                            <td>{{ $row->role->label() }}</td>
                            <td>
                                @if ($row->isCollector())
                                    {{ $row->collector_channel?->label() ?? '—' }}
                                    · {{ rtrim(rtrim(number_format((float) $row->max_discount_percent, 2, '.', ''), '0'), '.') }}%
                                    · {{ __('ui.invoice_gift') }} {{ rtrim(rtrim(number_format((float) $row->max_gift_percent, 2, '.', ''), '0'), '.') }}%
                                @else
                                    —
                                @endif
                            </td>
                            <td>
                                <span class="badge {{ $row->is_active ? 'badge--ok' : 'badge--off' }}">
                                    {{ $row->is_active ? __('ui.active') : __('ui.inactive') }}
                                </span>
                            </td>
                            <td class="data-table__actions">
                                @if ($editUrl)
                                    <a href="{{ $editUrl }}" class="btn btn--regular btn--sm">
                                        @include('partials.icons.pencil', ['class' => 'btn__icon'])
                                        {{ __('ui.edit') }}
                                    </a>
                                @endif
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="6" class="empty">{{ __('ui.users_empty') }}</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>

    @if ($users->hasPages())
        <div class="pager">{{ $users->links() }}</div>
    @endif
</section>
@endsection
