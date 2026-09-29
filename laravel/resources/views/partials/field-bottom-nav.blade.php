@php
    $user = auth()->user();
    $tabs = [
        [
            'route' => 'home',
            'match' => ['home'],
            'label' => __('ui.home'),
            'icon' => 'home',
            'enabled' => true,
        ],
        [
            'route' => 'visits.entry',
            'match' => ['visits.*', 'invoices.create'],
            'label' => __('ui.visit'),
            'icon' => 'store',
            'enabled' => $user->canAccess('stores'),
        ],
        [
            'route' => 'collections.index',
            'match' => ['collections.*'],
            'label' => __('ui.collections'),
            'icon' => 'cash',
            'enabled' => $user->canAccess('collections') || $user->canAccess('reports.review'),
        ],
        [
            'route' => 'stores.index',
            'match' => ['stores.*'],
            'label' => __('ui.stores'),
            'icon' => 'store',
            'enabled' => $user->canAccess('stores'),
        ],
        [
            // Collectors: personal report (invoices / collections / rejects). Office: invoice list.
            'route' => $user->isCollector() ? 'reports.index' : 'invoices.index',
            'match' => $user->isCollector()
                ? ['reports.*']
                : ['invoices.index', 'invoices.show'],
            'label' => $user->isCollector() ? __('ui.my_report') : __('ui.invoices'),
            'icon' => $user->isCollector() ? 'clipboard' : 'file',
            'enabled' => $user->isCollector()
                ? $user->canAccess('reports')
                : $user->canAccess('invoices'),
        ],
    ];
@endphp

<nav class="field-bottom-nav" aria-label="{{ __('ui.home') }}">
    <ul class="field-bottom-nav__list">
        @foreach ($tabs as $tab)
            @if (empty($tab['enabled']))
                @continue
            @endif
            <li>
                <a
                    href="{{ route($tab['route']) }}"
                    class="field-tab {{ request()->routeIs(...$tab['match']) ? 'is-active' : '' }}"
                >
                    @include('partials.icons.'.$tab['icon'], ['class' => 'field-tab__icon'])
                    <span>{{ $tab['label'] }}</span>
                </a>
            </li>
        @endforeach
    </ul>
</nav>
