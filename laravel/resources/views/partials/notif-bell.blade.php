@php
    $unreadCount = 0;
    if (auth()->check()) {
        $unreadCount = \App\Models\AppNotification::query()
            ->visibleTo(auth()->user())
            ->whereDoesntHave('reads', fn ($q) => $q->where('user_id', auth()->id()))
            ->count();
    }
@endphp
<div class="notif-bell" data-notif-bell>
    <a href="{{ route('settings.index') }}#settings-inbox" class="notif-bell__btn" title="{{ __('ui.notifications') }}" aria-label="{{ __('ui.notifications') }}">
        @include('partials.icons.bell', ['class' => 'nav-item__icon'])
        <span class="notif-bell__count {{ $unreadCount > 0 ? 'is-on' : '' }}" data-notif-count>{{ $unreadCount > 99 ? '99+' : $unreadCount }}</span>
    </a>
</div>
