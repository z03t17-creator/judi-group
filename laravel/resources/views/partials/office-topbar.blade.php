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
@endphp

<header class="office-topbar no-print">
    <button type="button" class="office-topbar__menu" data-office-menu-open aria-label="{{ __('ui.menu') }}">
        @include('partials.icons.more', ['class' => 'office-topbar__menu-icon'])
    </button>
    <a href="{{ route('home') }}" class="office-topbar__brand" aria-label="JUDI">
        <img src="{{ $judiLogoUrl }}" alt="" class="office-topbar__logo">
        <span>JUDI</span>
    </a>
    <div class="office-topbar__actions">
        @if ($user->canAccess('releases') || $user->canAccess('reports.review') || $user->canApproveDevices())
            <a href="{{ route('approvals.index') }}" class="office-topbar__approvals" title="{{ __('ui.approvals') }}">
                @include('partials.icons.clipboard', ['class' => 'office-topbar__icon'])
                @if ($pendingApprovals > 0)
                    <em class="office-topbar__badge">{{ $pendingApprovals > 99 ? '99+' : $pendingApprovals }}</em>
                @endif
            </a>
        @endif
        @include('partials.notif-bell')
    </div>
</header>
