@php
    $user = auth()->user();
    $openVisit = $activeVisitTimer ?? null;
    $visitLocked = $openVisit && method_exists($openVisit, 'isOpen') && $openVisit->isOpen();
    $tabs = [
        [
            'route' => 'home',
            'match' => ['home'],
            'label' => __('ui.home'),
            'icon' => 'home',
            'enabled' => true,
            'visit_ok' => false,
        ],
        [
            'route' => 'visits.entry',
            'match' => ['visits.*', 'invoices.create', 'collections.create'],
            'label' => __('ui.visit'),
            'icon' => 'store',
            'enabled' => $user->canAccess('stores'),
            'visit_ok' => true,
        ],
        [
            'route' => 'collections.index',
            'match' => ['collections.*'],
            'label' => __('ui.collections'),
            'icon' => 'cash',
            'enabled' => $user->canAccess('collections') || $user->canAccess('reports.review'),
            'visit_ok' => false,
        ],
        [
            'route' => 'stores.index',
            'match' => ['stores.*'],
            'label' => __('ui.stores'),
            'icon' => 'store',
            'enabled' => $user->canAccess('stores'),
            'visit_ok' => false,
        ],
        [
            'route' => $user->isCollector() ? 'reports.index' : 'invoices.index',
            'match' => $user->isCollector()
                ? ['reports.*']
                : ['invoices.index', 'invoices.show'],
            'label' => $user->isCollector() ? __('ui.my_report') : __('ui.invoices'),
            'icon' => $user->isCollector() ? 'clipboard' : 'file',
            'enabled' => $user->isCollector()
                ? $user->canAccess('reports')
                : $user->canAccess('invoices'),
            'visit_ok' => false,
        ],
    ];
@endphp

<nav class="field-bottom-nav {{ $visitLocked ? 'is-visit-locked' : '' }}" aria-label="{{ __('ui.home') }}">
    <ul class="field-bottom-nav__list">
        @foreach ($tabs as $tab)
            @if (empty($tab['enabled']))
                @continue
            @endif
            @php
                $isActive = request()->routeIs(...$tab['match']);
                $locked = $visitLocked && empty($tab['visit_ok']);
            @endphp
            <li>
                @if ($locked)
                    <button
                        type="button"
                        class="field-tab is-locked"
                        data-visit-lock
                        data-visit-lock-msg="{{ __('ui.visit_end_first') }}"
                        aria-disabled="true"
                    >
                        @include('partials.icons.'.$tab['icon'], ['class' => 'field-tab__icon'])
                        <span>{{ $tab['label'] }}</span>
                    </button>
                @else
                    <a
                        href="{{ $visitLocked && ! empty($tab['visit_ok']) ? route('visits.show', $openVisit) : route($tab['route']) }}"
                        class="field-tab {{ $isActive ? 'is-active' : '' }}"
                    >
                        @include('partials.icons.'.$tab['icon'], ['class' => 'field-tab__icon'])
                        <span>{{ $tab['label'] }}</span>
                    </a>
                @endif
            </li>
        @endforeach
    </ul>
</nav>
