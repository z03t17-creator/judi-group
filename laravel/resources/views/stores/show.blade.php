@extends('layouts.app')

@section('title', $store->name.' — JUDI')

@section('content')
<section class="page list-page store-profile">
    <header class="page__header page__header--iconed">
        @include('partials.icon-badge', ['icon' => 'store', 'tone' => 'orange', 'size' => 'lg'])
        <div class="page__header-text">
            <h1 class="page__title">{{ __('ui.store_profile') }}</h1>
            <p class="page__lead">{{ $store->name }}</p>
        </div>
        <div class="page__actions">
            <a href="{{ route('stores.index') }}" class="btn btn--regular">
                @include('partials.icons.arrow-back', ['class' => 'btn__icon'])
                {{ __('ui.back') }}
            </a>
            @if ($canManage)
                <a href="{{ route('stores.edit', $store) }}" class="btn btn--primary">
                    @include('partials.icons.pencil', ['class' => 'btn__icon'])
                    {{ __('ui.edit') }}
                </a>
            @endif
        </div>
    </header>

    @include('partials.flash')

    <div class="store-profile__hero report-section" style="--report-accent: #ea580c">
        <div class="report-section__head">
            <h2 class="report-section__title">{{ $store->name }}</h2>
            <span class="badge {{ $store->is_active ? 'badge--ok' : 'badge--off' }}">
                {{ $store->is_active ? __('ui.active_store') : __('ui.inactive') }}
            </span>
        </div>
        <div class="store-profile__hero-body">
            <img class="store-profile__img" src="{{ $store->imageUrl() }}" alt="">
            <div class="store-profile__identity">
                @if ($store->owner_name)
                    <p class="store-profile__owner">{{ __('ui.store_owner') }}: <strong>{{ $store->owner_name }}</strong></p>
                @endif
                <p class="store-profile__meta" dir="ltr">{{ $store->phone }} · {{ $store->address ?: '—' }}</p>
            </div>
        </div>
    </div>

    <div class="kpi-grid store-profile__kpis">
        <div class="kpi-card kpi-card--accent report-kpi--amber" style="--kpi-accent: #d97706">
            <h2>{{ __('ui.credit_limit') }}</h2>
            <p class="kpi-card__value ltr-inline report-num">{{ number_format((float) $store->credit_limit, 0) }}</p>
        </div>
        <div class="kpi-card kpi-card--accent report-kpi--amber" style="--kpi-accent: #b45309">
            <h2>{{ __('ui.current_debt') }}</h2>
            <p class="kpi-card__value ltr-inline report-num report-num--debt">{{ number_format((float) $store->current_debt, 0) }}</p>
        </div>
        <div class="kpi-card kpi-card--accent report-kpi--teal" style="--kpi-accent: var(--judi-500)">
            <h2>{{ __('ui.phone') }}</h2>
            <p class="kpi-card__value">
                <a class="store-profile__tel" href="tel:{{ preg_replace('/\s+/', '', $store->phone) }}" dir="ltr">{{ $store->phone }}</a>
            </p>
        </div>
        <div class="kpi-card kpi-card--accent report-kpi--orange" style="--kpi-accent: #ea580c">
            <h2>{{ __('ui.address') }}</h2>
            <p class="kpi-card__value kpi-card__value--sm">{{ $store->address ?: '—' }}</p>
        </div>
    </div>

    <section class="report-section" style="--report-accent: #0f766e">
        <div class="report-section__head">
            <h2 class="report-section__title">{{ __('ui.store_map') }}</h2>
        </div>
        <div class="store-profile__location-body">
            @if ($store->hasCoordinates())
                <div
                    class="store-map__canvas store-map__canvas--profile"
                    id="store-profile-map"
                    data-lat="{{ $store->latitude }}"
                    data-lng="{{ $store->longitude }}"
                    data-name="{{ $store->name }}"
                ></div>
                <div class="store-profile__map-actions">
                    @if ($googleMapsUrl)
                        <a class="btn btn--primary btn--sm" href="{{ $googleMapsUrl }}" target="_blank" rel="noopener">
                            {{ __('ui.store_open_google_maps') }}
                        </a>
                    @endif
                </div>
                <p class="muted store-profile__coords" dir="ltr">
                    {{ number_format((float) $store->latitude, 5) }}, {{ number_format((float) $store->longitude, 5) }}
                </p>
            @else
                <p class="muted">{{ __('ui.store_no_location') }}</p>
                @if ($canManage)
                    <a href="{{ route('stores.edit', $store) }}" class="btn btn--regular btn--sm">{{ __('ui.store_set_location') }}</a>
                @endif
            @endif
        </div>
    </section>

    <section class="report-section" style="--report-accent: #b45309">
        <div class="report-section__head">
            <h2 class="report-section__title">{{ __('ui.store_recent_invoices') }}</h2>
        </div>

        @include('partials.list-filters', [
            'action' => route('stores.show', $store),
            'routeParams' => ['store' => $store],
            'period' => $period,
            'from' => $from,
            'to' => $to,
            'showAllPeriod' => true,
        ])

        <div class="table-wrap report-table-wrap">
            <table class="data-table report-table">
                <thead>
                    <tr>
                        <th>{{ __('ui.invoice_no') }}</th>
                        <th>{{ __('ui.invoice_type') }}</th>
                        <th>{{ __('ui.invoice_grand_total') }}</th>
                        <th>{{ __('ui.invoice_date') }}</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse ($recentInvoices as $invoice)
                        @php
                            $type = $invoice->invoice_type?->value ?? 'cash';
                        @endphp
                        <tr>
                            <td>
                                <a href="{{ route('invoices.show', $invoice) }}" class="report-link ltr-inline">{{ $invoice->invoice_number }}</a>
                            </td>
                            <td>
                                <span class="report-chip report-chip--{{ $type === 'debt' ? 'debt' : 'cash' }}">
                                    {{ $invoice->invoice_type?->label() ?? '—' }}
                                </span>
                            </td>
                            <td dir="ltr">
                                <span class="report-num report-num--{{ $type === 'debt' ? 'debt' : 'cash' }}">
                                    {{ number_format((float) $invoice->total_amount, 0) }}
                                </span>
                            </td>
                            <td dir="ltr">{{ optional($invoice->created_at)->format('Y-m-d H:i') }}</td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="4" class="empty">{{ __('ui.invoice_empty') }}</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        @if ($recentInvoices->hasPages())
            <div class="pager no-print">{{ $recentInvoices->links() }}</div>
        @endif
    </section>
</section>

@if ($store->hasCoordinates())
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
<script>
(function () {
  var el = document.getElementById("store-profile-map");
  if (!el || !window.L) return;
  var lat = parseFloat(el.getAttribute("data-lat"));
  var lng = parseFloat(el.getAttribute("data-lng"));
  var name = el.getAttribute("data-name") || "";
  var map = L.map(el).setView([lat, lng], 16);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);
  L.marker([lat, lng]).addTo(map).bindPopup(name);
  setTimeout(function () { map.invalidateSize(); }, 80);
})();
</script>
@endif
@endsection
