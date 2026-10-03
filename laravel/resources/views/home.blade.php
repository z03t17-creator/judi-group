@extends('layouts.app')

@section('title', __('ui.home'). ' — '.__('ui.brand_short'))

@section('content')
<section class="home-board">
    <header class="home-board__intro page__header--iconed">
        @include('partials.icon-badge', ['icon' => 'dashboard', 'tone' => 'teal', 'size' => 'lg'])
        <div class="page__header-text">
            <h1>{{ __('ui.welcome', ['name' => $user->name]) }}</h1>
        </div>
    </header>

    <div class="kpi-grid">
        @php
            $canApprovals = $user->canAccess('releases')
                || $user->canAccess('reports.review')
                || $user->canApproveDevices();
        @endphp
        @if ($canApprovals)
            <a href="{{ route('approvals.index') }}" class="kpi-card kpi-card--iconed">
                @include('partials.icon-badge', ['icon' => 'clipboard', 'tone' => 'teal', 'size' => 'md'])
                <div>
                    <h2>{{ __('ui.approvals') }}</h2>
                    <p class="kpi-card__value">{{ number_format($pendingApprovalCount) }}</p>
                </div>
            </a>
        @endif

        @if ($user->canApproveDevices())
            <a href="{{ route('devices.index') }}" class="kpi-card kpi-card--iconed">
                @include('partials.icon-badge', ['icon' => 'settings', 'tone' => 'slate', 'size' => 'md'])
                <div>
                    <h2>{{ __('ui.device_requests') }}</h2>
                    <p class="kpi-card__value">{{ number_format($pendingDeviceCount) }}</p>
                    <p class="kpi-card__hint">{{ __('ui.device_requests_home_hint') }}</p>
                </div>
            </a>
        @endif

        @if ($user->canAccess('stock'))
            <a href="{{ route('stock.index') }}" class="kpi-card kpi-card--iconed">
                @include('partials.icon-badge', ['icon' => 'warehouse', 'tone' => 'slate', 'size' => 'md'])
                <div>
                    <h2>{{ __('ui.stock') }}</h2>
                    @if ($warehouse)
                        <p class="kpi-card__value">{{ number_format($stockSkuCount) }}</p>
                    @else
                        <p class="kpi-card__value">{{ __('ui.warehouse_missing') }}</p>
                    @endif
                </div>
            </a>
        @endif

        @if ($user->canAccess('purchases'))
            <a href="{{ route('purchases.create') }}" class="kpi-card kpi-card--iconed">
                @include('partials.icon-badge', ['icon' => 'plus', 'tone' => 'emerald', 'size' => 'md'])
                <div>
                    <h2>{{ __('ui.purchases') }}</h2>
                    <p class="kpi-card__value">{{ __('ui.purchase_new') }}</p>
                </div>
            </a>
        @endif

        @if ($user->canAccess('releases'))
            <a href="{{ route('releases.index') }}" class="kpi-card kpi-card--iconed">
                @include('partials.icon-badge', ['icon' => 'warehouse', 'tone' => 'teal', 'size' => 'md'])
                <div>
                    <h2>{{ __('ui.releases') }}</h2>
                    <p class="kpi-card__value">{{ number_format($pendingReleaseCount) }}</p>
                </div>
            </a>
        @endif

        @if ($user->canAccess('products') || $user->canAccess('categories'))
            <a href="{{ route($user->canAccess('products') ? 'products.index' : 'categories.index') }}" class="kpi-card kpi-card--iconed">
                @include('partials.icon-badge', ['icon' => 'package', 'tone' => 'emerald', 'size' => 'md'])
                <div>
                    <h2>{{ __('ui.catalog') }}</h2>
                    <p class="kpi-card__value">{{ $productCount }}</p>
                    <p class="kpi-card__hint">{{ __('ui.catalog_home_hint') }}</p>
                </div>
            </a>
        @endif

        @if ($user->canAccess('stores'))
            <a href="{{ route('stores.index') }}" class="kpi-card kpi-card--iconed">
                @include('partials.icon-badge', ['icon' => 'store', 'tone' => 'orange', 'size' => 'md'])
                <div>
                    <h2>{{ __('ui.stores') }}</h2>
                    <p class="kpi-card__value">{{ $storeCount }}</p>
                </div>
            </a>
        @endif

        @if ($user->canAccess('users') || $user->canAccess('collectors'))
            <a href="{{ route('users.index') }}" class="kpi-card kpi-card--iconed">
                @include('partials.icon-badge', ['icon' => 'users', 'tone' => 'violet', 'size' => 'md'])
                <div>
                    <h2>{{ __('ui.users_collectors') }}</h2>
                    <p class="kpi-card__value">{{ $collectorCount }}</p>
                </div>
            </a>
        @endif

        @if ($user->canAccess('invoices.sell') && ! $user->isCollector())
            <a href="{{ route('invoices.create') }}" class="kpi-card kpi-card--iconed">
                @include('partials.icon-badge', ['icon' => 'plus', 'tone' => 'teal', 'size' => 'md'])
                <div>
                    <h2>{{ __('ui.sell') }}</h2>
                    <p class="kpi-card__value">{{ __('ui.invoice_new') }}</p>
                </div>
            </a>
        @endif

        @if ($user->isCollector() && $user->canAccess('stores'))
            <a href="{{ route('visits.entry') }}" class="kpi-card kpi-card--iconed">
                @include('partials.icon-badge', ['icon' => 'store', 'tone' => 'teal', 'size' => 'md'])
                <div>
                    <h2>{{ __('ui.visit') }}</h2>
                    <p class="kpi-card__value">{{ __('ui.visit_start') }}</p>
                </div>
            </a>
        @endif

        @if ($user->isCollector() && $user->canAccess('reports'))
            <a href="{{ route('reports.index') }}" class="kpi-card kpi-card--iconed">
                @include('partials.icon-badge', ['icon' => 'clipboard', 'tone' => 'amber', 'size' => 'md'])
                <div>
                    <h2>{{ __('ui.my_report') }}</h2>
                    <p class="kpi-card__value">{{ number_format($invoiceCount) }}</p>
                </div>
            </a>
        @elseif ($user->canAccess('invoices'))
            <a href="{{ route('invoices.index') }}" class="kpi-card kpi-card--iconed">
                @include('partials.icon-badge', ['icon' => 'file', 'tone' => 'amber', 'size' => 'md'])
                <div>
                    <h2>{{ __('ui.invoices') }}</h2>
                    <p class="kpi-card__value">{{ $invoiceCount }}</p>
                </div>
            </a>
        @endif
    </div>
</section>
@endsection
