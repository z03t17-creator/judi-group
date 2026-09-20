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
            'route' => 'invoices.create',
            'match' => ['invoices.create'],
            'label' => __('ui.sell'),
            'icon' => 'file',
            'enabled' => $user->canAccess('invoices.sell'),
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
            'route' => 'invoices.index',
            'match' => ['invoices.index', 'invoices.show'],
            'label' => __('ui.invoices'),
            'icon' => 'file',
            'enabled' => $user->canAccess('invoices'),
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
