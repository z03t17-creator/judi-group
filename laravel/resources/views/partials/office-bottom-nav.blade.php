@php
    $user = auth()->user();
    $pendingApprovals = 0;
    if ($user->canAccess('releases')) {
        $pendingApprovals += \App\Models\Invoice::query()
            ->where('status', \App\Enums\InvoiceStatus::PendingSend)
            ->count();
    }
    if ($user->canAccess('reports.review')) {
        $pendingApprovals += \App\Models\Collection::query()
            ->where('status', \App\Enums\CollectionStatus::Pending)
            ->count();
    }
    if ($user->canApproveDevices()) {
        $pendingApprovals += \App\Models\DeviceLoginRequest::query()
            ->where('status', 'pending')
            ->where('expires_at', '>', now())
            ->count();
    }

    $tabs = [
        [
            'route' => 'home',
            'match' => ['home'],
            'label' => __('ui.home'),
            'icon' => 'home',
            'enabled' => true,
            'badge' => 0,
        ],
        [
            'route' => 'approvals.index',
            'match' => ['approvals.*'],
            'label' => __('ui.approvals'),
            'icon' => 'clipboard',
            'enabled' => $user->canAccess('releases')
                || $user->canAccess('reports.review')
                || $user->canApproveDevices(),
            'badge' => $pendingApprovals,
        ],
        [
            'route' => 'invoices.create',
            'match' => ['invoices.create'],
            'label' => __('ui.sell'),
            'icon' => 'file',
            'enabled' => $user->canAccess('invoices.sell'),
            'badge' => 0,
        ],
        [
            'route' => 'collections.index',
            'match' => ['collections.*'],
            'label' => __('ui.collections'),
            'icon' => 'cash',
            'enabled' => $user->canAccess('collections') || $user->canAccess('reports.review'),
            'badge' => 0,
        ],
        [
            'route' => null,
            'match' => [],
            'label' => __('ui.menu'),
            'icon' => 'more',
            'enabled' => true,
            'badge' => 0,
            'menu' => true,
        ],
    ];
@endphp

<nav class="office-bottom-nav" aria-label="{{ __('ui.home') }}">
    <ul class="office-bottom-nav__list">
        @foreach ($tabs as $tab)
            @if (empty($tab['enabled']))
                @continue
            @endif
            <li>
                @if (!empty($tab['menu']))
                    <button type="button" class="office-tab" data-office-menu-open>
                        @include('partials.icons.'.$tab['icon'], ['class' => 'office-tab__icon'])
                        <span>{{ $tab['label'] }}</span>
                    </button>
                @else
                    <a
                        href="{{ route($tab['route']) }}"
                        class="office-tab {{ request()->routeIs(...$tab['match']) ? 'is-active' : '' }}"
                    >
                        <span class="office-tab__icon-wrap">
                            @include('partials.icons.'.$tab['icon'], ['class' => 'office-tab__icon'])
                            @if (($tab['badge'] ?? 0) > 0)
                                <em class="office-tab__badge">{{ $tab['badge'] > 99 ? '99+' : $tab['badge'] }}</em>
                            @endif
                        </span>
                        <span>{{ $tab['label'] }}</span>
                    </a>
                @endif
            </li>
        @endforeach
    </ul>
</nav>
