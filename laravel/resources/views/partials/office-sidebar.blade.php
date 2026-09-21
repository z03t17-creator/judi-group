@php
    $user = auth()->user();

    $items = [
        [
            'route' => 'home',
            'match' => 'home',
            'label' => __('ui.home'),
            'enabled' => true,
            'icon' => 'dashboard',
        ],
        [
            'route' => 'approvals.index',
            'match' => 'approvals.*',
            'label' => __('ui.approvals'),
            'enabled' => $user->canAccess('releases')
                || $user->canAccess('reports.review')
                || $user->canApproveDevices(),
            'icon' => 'clipboard',
        ],
        [
            'route' => 'users.index',
            'match' => ['users.*', 'collectors.*'],
            'label' => __('ui.users_collectors'),
            'enabled' => $user->canAccess('users') || $user->canAccess('collectors'),
            'icon' => 'users',
        ],
        [
            'route' => 'invoices.create',
            'match' => 'invoices.create',
            'label' => __('ui.sell'),
            'enabled' => $user->canAccess('invoices.sell'),
            'icon' => 'file',
        ],
        [
            'route' => 'products.index',
            'match' => 'products.*',
            'label' => __('ui.products'),
            'enabled' => $user->canAccess('products'),
            'icon' => 'package',
        ],
        [
            'route' => 'categories.index',
            'match' => ['categories.*', 'subcategories.*'],
            'label' => __('ui.categories'),
            'enabled' => $user->canAccess('categories'),
            'icon' => 'tags',
        ],
        [
            'route' => 'stores.index',
            'match' => 'stores.*',
            'label' => __('ui.stores'),
            'enabled' => $user->canAccess('stores'),
            'icon' => 'store',
        ],
        [
            'route' => 'stock.index',
            'match' => 'stock.*',
            'label' => __('ui.stock'),
            'enabled' => $user->canAccess('stock'),
            'icon' => 'warehouse',
        ],
        [
            'route' => 'purchases.index',
            'match' => 'purchases.*',
            'label' => __('ui.purchases'),
            'enabled' => $user->canAccess('purchases'),
            'icon' => 'package',
        ],
        [
            'route' => 'releases.index',
            'match' => 'releases.*',
            'label' => __('ui.releases'),
            'enabled' => $user->canAccess('releases'),
            'icon' => 'warehouse',
        ],
        [
            'route' => 'suppliers.index',
            'match' => 'suppliers.*',
            'label' => __('ui.suppliers'),
            'enabled' => $user->canAccess('suppliers'),
            'icon' => 'users',
        ],
        [
            'route' => 'invoices.index',
            'match' => 'invoices.*',
            'label' => __('ui.invoices'),
            'enabled' => $user->canAccess('invoices'),
            'icon' => 'file',
        ],
        [
            'route' => 'reports.index',
            'match' => 'reports.*',
            'label' => __('ui.reports'),
            'enabled' => $user->canAccess('reports') || $user->canAccess('reports.review'),
            'icon' => 'clipboard',
        ],
        [
            'route' => 'expenses.index',
            'match' => 'expenses.*',
            'label' => __('ui.expenses'),
            'enabled' => $user->canAccess('expenses') || $user->canAccess('reports.review'),
            'icon' => 'wallet',
        ],
        [
            'route' => 'collections.index',
            'match' => 'collections.*',
            'label' => __('ui.collections'),
            'enabled' => $user->canAccess('collections') || $user->canAccess('reports.review'),
            'icon' => 'cash',
        ],
        [
            'route' => 'settings.index',
            'match' => 'settings.*',
            'label' => __('ui.settings'),
            'enabled' => true,
            'icon' => 'settings',
        ],
    ];
@endphp

<aside class="office-sidebar" aria-label="{{ __('ui.home') }}" data-office-sidebar>
    <div class="office-sidebar__brand">
        <a href="{{ route('home') }}" class="brand-mark brand-mark--center" aria-label="JUDI">
            <img
                src="{{ $judiLogoUrl }}"
                alt=""
                class="brand-mark__img"
            >
            <span class="brand-mark__text">
                <span class="brand-mark__name">Judi</span>
                <span class="brand-mark__sub">Group</span>
            </span>
        </a>
        <button type="button" class="office-sidebar__close" data-office-menu-close aria-label="{{ __('ui.close') }}">
            ×
        </button>
    </div>

    <nav class="office-sidebar__nav">
        @foreach ($items as $item)
            @php
                $match = $item['match'] ?? null;
                $active = is_array($match)
                    ? request()->routeIs(...$match)
                    : (!empty($match) && request()->routeIs($match));
            @endphp

            @if (!empty($item['enabled']) && !empty($item['route']))
                <a
                    href="{{ route($item['route']) }}"
                    class="nav-item {{ $active ? 'is-active' : '' }}"
                    title="{{ $item['label'] }}"
                >
                    @include('partials.icons.'.$item['icon'], ['class' => 'nav-item__icon'])
                    <span class="nav-item__label">{{ $item['label'] }}</span>
                </a>
            @elseif (empty($item['enabled']) && empty($item['route']))
                <span class="nav-item is-disabled" title="{{ __('ui.coming_soon') }} — {{ $item['label'] }}">
                    @include('partials.icons.'.$item['icon'], ['class' => 'nav-item__icon'])
                    <span class="nav-item__label">{{ $item['label'] }}</span>
                </span>
            @endif
        @endforeach
    </nav>

    <div class="office-sidebar__foot">
        <p class="office-sidebar__user" title="{{ $user->name }}">
            {{ $user->name }} · {{ $user->role->label() }}
        </p>
        <div class="office-sidebar__tools">
            @include('partials.theme-toggle')
            @include('partials.notif-bell')
            @include('partials.locale-switcher', ['tone' => 'chrome'])
            <form method="POST" action="{{ route('logout') }}" class="chrome-btn-form office-sidebar__logout">
                @csrf
                <button type="submit" class="chrome-btn chrome-btn--danger" title="{{ __('ui.sign_out') }}" aria-label="{{ __('ui.sign_out') }}">
                    @include('partials.icons.logout', ['class' => 'chrome-btn__icon'])
                    <span class="chrome-btn__label">{{ __('ui.sign_out') }}</span>
                </button>
            </form>
        </div>
    </div>
</aside>
