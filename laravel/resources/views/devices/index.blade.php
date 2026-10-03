@extends('layouts.app')

@section('title', __('ui.device_requests').' — '.__('ui.brand_short'))

@section('content')
<section class="page device-desk">
    <header class="page__header page__header--iconed">
        @include('partials.icon-badge', ['icon' => 'settings', 'tone' => 'slate', 'size' => 'lg'])
        <div class="page__header-text">
            <h1 class="page__title">{{ __('ui.device_requests') }}</h1>
            <p class="page__lead">{{ __('ui.device_requests_lead') }}</p>
        </div>
        <div class="page__actions">
            <a href="{{ route('settings.index') }}" class="btn btn--ghost btn--sm">{{ __('ui.settings') }}</a>
        </div>
    </header>

    @if (session('status'))
        <p class="flash flash--ok">{{ session('status') }}</p>
    @endif
    @if (session('error'))
        <p class="flash flash--err">{{ session('error') }}</p>
    @endif

    <section class="surface-panel device-desk__section">
        <header class="device-desk__head">
            <h2>{{ __('ui.devices_pending') }}</h2>
            <span class="chip">{{ $pendingDevices->count() }}</span>
        </header>
        <p class="muted device-desk__hint">{{ __('ui.devices_pending_hint') }}</p>

        @forelse ($pendingDevices as $req)
            <article class="device-card">
                <div>
                    <strong>{{ $req->user?->name }}</strong>
                    <p class="muted" dir="ltr">{{ $req->user?->email }}</p>
                    <p class="muted">
                        {{ \App\Support\DeviceFingerprint::shortLabel($req->user_agent) }}
                        · {{ __('ui.device_code') }}:
                        <strong class="device-code" dir="ltr">{{ \App\Support\DeviceFingerprint::shortCode($req->device_token) }}</strong>
                        · <span dir="ltr">{{ $req->ip_address }}</span>
                    </p>
                </div>
                <div class="device-card__actions">
                    <form method="POST" action="{{ route('settings.devices.approve', $req) }}">
                        @csrf
                        <input type="hidden" name="return_to" value="devices">
                        <button type="submit" class="btn btn--primary">{{ __('ui.device_approve') }}</button>
                    </form>
                    <form method="POST" action="{{ route('settings.devices.reject', $req) }}">
                        @csrf
                        <input type="hidden" name="return_to" value="devices">
                        <button type="submit" class="btn btn--ghost">{{ __('ui.device_reject') }}</button>
                    </form>
                </div>
            </article>
        @empty
            <p class="muted">{{ __('ui.devices_pending_empty') }}</p>
        @endforelse
    </section>

    <section class="surface-panel device-desk__section">
        <header class="device-desk__head">
            <h2>{{ __('ui.devices_approved') }}</h2>
            <span class="chip">{{ $approvedDevices->count() }}</span>
        </header>
        <p class="muted device-desk__hint">{{ __('ui.devices_approved_hint') }}</p>

        @forelse ($approvedDevices as $device)
            <article class="device-card">
                <div>
                    <strong>{{ $device->user?->name ?? __('ui.device_unknown') }}</strong>
                    @if ($device->device_token === $currentDevice)
                        <span class="chip">{{ __('ui.device_this') }}</span>
                    @endif
                    <p class="muted" dir="ltr">{{ $device->user?->email }}</p>
                    <p class="muted">
                        {{ $device->label ?: __('ui.device_unknown') }}
                        · {{ __('ui.device_code') }}:
                        <strong class="device-code" dir="ltr">{{ \App\Support\DeviceFingerprint::shortCode($device->device_token) }}</strong>
                    </p>
                    <p class="muted" dir="ltr">
                        {{ __('ui.device_last_seen') }}:
                        {{ $device->last_seen_at?->format('Y-m-d H:i') ?: '—' }}
                        · {{ $device->ip_address ?: '—' }}
                    </p>
                </div>
                @if ($canManageAll)
                    <form
                        method="POST"
                        action="{{ route('settings.devices.revoke', $device) }}"
                        onsubmit="return confirm(@json($device->device_token === $currentDevice ? __('ui.device_revoke_current_confirm') : __('ui.device_revoke_confirm')))"
                    >
                        @csrf
                        @method('DELETE')
                        <input type="hidden" name="return_to" value="devices">
                        <button type="submit" class="btn btn--ghost">{{ __('ui.device_revoke') }}</button>
                    </form>
                @endif
            </article>
        @empty
            <p class="muted">{{ __('ui.devices_approved_empty') }}</p>
        @endforelse
    </section>
</section>
@endsection
