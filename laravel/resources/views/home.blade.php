@extends('layouts.app')

@section('title', __('ui.home').' — JUDI')

@section('content')
<section class="home-board">
    <header class="home-board__intro page__header--iconed">
        @include('partials.icon-badge', ['icon' => 'dashboard', 'tone' => 'teal', 'size' => 'lg'])
        <div class="page__header-text">
            <h1>{{ __('ui.welcome', ['name' => $user->name]) }}</h1>
            <p>
                {{ __('ui.role_with_label', [
                    'role' => $user->role->label()
                        .($user->collector_channel ? ' — '.$user->collector_channel->label() : ''),
                ]) }}
            </p>
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
                    <p class="kpi-card__hint">{{ __('ui.approvals_lead') }}</p>
                </div>
            </a>
        @endif

        @if ($user->canAccess('stock'))
            <a href="{{ route('stock.index') }}" class="kpi-card kpi-card--iconed">
                @include('partials.icon-badge', ['icon' => 'warehouse', 'tone' => 'slate', 'size' => 'md'])
                <div>
                    <h2>{{ __('ui.stock') }}</h2>
                    @if ($warehouse)
                        <p class="kpi-card__value">{{ $warehouse->displayName() }}</p>
                        <p class="kpi-card__hint">{{ __('ui.stock_on_hand_summary', [
                            'skus' => number_format($stockSkuCount),
                            'pieces' => number_format($stockPieceTotal),
                        ]) }}</p>
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
                    <p class="kpi-card__hint">{{ __('ui.purchase_lead') }}</p>
                </div>
            </a>
        @endif

        @if ($user->canAccess('releases'))
            <a href="{{ route('releases.index') }}" class="kpi-card kpi-card--iconed">
                @include('partials.icon-badge', ['icon' => 'warehouse', 'tone' => 'teal', 'size' => 'md'])
                <div>
                    <h2>{{ __('ui.releases') }}</h2>
                    <p class="kpi-card__value">{{ number_format($pendingReleaseCount) }}</p>
                    <p class="kpi-card__hint">{{ __('ui.releases_lead') }}</p>
                </div>
            </a>
        @endif

        @if ($user->canAccess('products'))
            <a href="{{ route('products.index') }}" class="kpi-card kpi-card--iconed">
                @include('partials.icon-badge', ['icon' => 'package', 'tone' => 'emerald', 'size' => 'md'])
                <div>
                    <h2>{{ __('ui.products') }}</h2>
                    <p class="kpi-card__value">{{ $productCount }}</p>
                    <p class="kpi-card__hint">{{ __('ui.units_hint') }}</p>
                </div>
            </a>
        @endif

        @if ($user->canAccess('stores'))
            <a href="{{ route('stores.index') }}" class="kpi-card kpi-card--iconed">
                @include('partials.icon-badge', ['icon' => 'store', 'tone' => 'orange', 'size' => 'md'])
                <div>
                    <h2>{{ __('ui.stores') }}</h2>
                    <p class="kpi-card__value">{{ $storeCount }}</p>
                    <p class="kpi-card__hint">{{ __('ui.stores_lead') }}</p>
                </div>
            </a>
        @endif

        @if ($user->canAccess('categories'))
            <a href="{{ route('categories.index') }}" class="kpi-card kpi-card--iconed">
                @include('partials.icon-badge', ['icon' => 'tags', 'tone' => 'sky', 'size' => 'md'])
                <div>
                    <h2>{{ __('ui.categories') }}</h2>
                    <p class="kpi-card__value">{{ __('ui.category') }}</p>
                    <p class="kpi-card__hint">{{ __('ui.categories_lead') }}</p>
                </div>
            </a>
        @endif

        @if ($user->canAccess('users') || $user->canAccess('collectors'))
            <a href="{{ route('users.index') }}" class="kpi-card kpi-card--iconed">
                @include('partials.icon-badge', ['icon' => 'users', 'tone' => 'violet', 'size' => 'md'])
                <div>
                    <h2>{{ __('ui.users_collectors') }}</h2>
                    <p class="kpi-card__value">{{ $collectorCount }}</p>
                    <p class="kpi-card__hint">{{ __('ui.users_collectors_lead') }}</p>
                </div>
            </a>
        @endif

        @if ($user->canAccess('invoices.sell'))
            <a href="{{ route('invoices.create') }}" class="kpi-card kpi-card--iconed">
                @include('partials.icon-badge', ['icon' => 'plus', 'tone' => 'teal', 'size' => 'md'])
                <div>
                    <h2>{{ __('ui.sell') }}</h2>
                    <p class="kpi-card__value">{{ __('ui.invoice_new') }}</p>
                    <p class="kpi-card__hint">{{ __('ui.invoice_sell_lead') }}</p>
                </div>
            </a>
        @endif

        @if ($user->canAccess('invoices'))
            <a href="{{ route('invoices.index') }}" class="kpi-card kpi-card--iconed">
                @include('partials.icon-badge', ['icon' => 'file', 'tone' => 'amber', 'size' => 'md'])
                <div>
                    <h2>{{ __('ui.invoices') }}</h2>
                    <p class="kpi-card__value">{{ $invoiceCount }}</p>
                    <p class="kpi-card__hint">{{ __('ui.invoice_list_lead') }}</p>
                </div>
            </a>
        @endif
    </div>
</section>
@endsection
