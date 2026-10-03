@extends('layouts.app')

@section('title', __('ui.device_requests').' — '.__('ui.brand_short'))

@section('content')
<section class="page device-desk">
    <header class="page__header page__header--compact device-desk__top">
        <h1 class="page__title">{{ __('ui.device_requests') }}</h1>
        <a href="{{ route('settings.index') }}" class="settings-text-btn">{{ __('ui.settings') }}</a>
    </header>

    @if (session('status'))
        <p class="flash flash--ok">{{ session('status') }}</p>
    @endif
    @if (session('error'))
        <p class="flash flash--err">{{ session('error') }}</p>
    @endif

    <p class="device-desk__lead">{{ __('ui.device_requests_lead') }}</p>

    <div class="settings-board">
        <section class="surface-panel settings-panel settings-panel--wide">
            <div class="settings-panel__head">
                <h2 class="settings-panel__title">{{ __('ui.devices_pending') }}</h2>
                <span class="chip chip--sm">{{ $pendingDevices->count() }}</span>
            </div>
            <p class="settings-line__hint">{{ __('ui.devices_pending_hint') }}</p>

            <div class="settings-devices">
                @forelse ($pendingDevices as $req)
                    <article class="settings-device-row">
                        <div class="settings-device-row__info">
                            <strong>{{ $req->user?->name }}</strong>
                            <p class="settings-device-row__meta" dir="ltr">{{ $req->user?->email }}</p>
                            <p class="settings-device-row__meta">
                                {{ \App\Support\DeviceFingerprint::shortLabel($req->user_agent) }}
                                · {{ __('ui.device_code') }}:
                                <strong class="device-code" dir="ltr">{{ \App\Support\DeviceFingerprint::shortCode($req->device_token) }}</strong>
                                · <span dir="ltr">{{ $req->ip_address }}</span>
                            </p>
                        </div>
                        <div class="settings-device-row__actions">
                            <form method="POST" action="{{ route('settings.devices.approve', $req) }}">
                                @csrf
                                <input type="hidden" name="return_to" value="devices">
                                <button type="submit" class="btn btn--primary btn--sm">{{ __('ui.device_approve') }}</button>
                            </form>
                            <form method="POST" action="{{ route('settings.devices.reject', $req) }}">
                                @csrf
                                <input type="hidden" name="return_to" value="devices">
                                <button type="submit" class="btn btn--ghost btn--sm">{{ __('ui.device_reject') }}</button>
                            </form>
                        </div>
                    </article>
                @empty
                    <p class="settings-empty">{{ __('ui.devices_pending_empty') }}</p>
                @endforelse
            </div>
        </section>

        <section class="surface-panel settings-panel settings-panel--wide">
            <div class="settings-panel__head">
                <h2 class="settings-panel__title">{{ __('ui.devices_approved') }}</h2>
                <span class="chip chip--sm">{{ $approvedDevices->count() }}</span>
            </div>
            <p class="settings-line__hint">{{ __('ui.devices_approved_hint') }}</p>

            <div class="settings-devices">
                @forelse ($approvedDevices as $device)
                    <article class="settings-device-row">
                        <div class="settings-device-row__info">
                            <strong>
                                {{ $device->user?->name ?? __('ui.device_unknown') }}
                                @if ($device->user?->isAdmin())
                                    <span class="chip chip--sm">{{ __('ui.role_admin') }}</span>
                                @endif
                                @if ($device->device_token === $currentDevice)
                                    <span class="chip chip--sm">{{ __('ui.device_this') }}</span>
                                @endif
                            </strong>
                            <p class="settings-device-row__meta" dir="ltr">{{ $device->user?->email }}</p>
                            <p class="settings-device-row__meta">
                                {{ $device->label ?: __('ui.device_unknown') }}
                                · {{ __('ui.device_code') }}:
                                <strong class="device-code" dir="ltr">{{ \App\Support\DeviceFingerprint::shortCode($device->device_token) }}</strong>
                            </p>
                            <p class="settings-device-row__meta" dir="ltr">
                                {{ __('ui.device_last_seen') }}:
                                {{ $device->last_seen_at?->format('Y-m-d H:i') ?: '—' }}
                                · {{ $device->ip_address ?: '—' }}
                            </p>
                        </div>
                        @if ($canManageAll)
                            <form
                                method="POST"
                                action="{{ route('settings.devices.revoke', $device) }}"
                                class="settings-device-row__actions"
                                onsubmit="return confirm(@json($device->device_token === $currentDevice ? __('ui.device_revoke_current_confirm') : __('ui.device_revoke_confirm')))"
                            >
                                @csrf
                                @method('DELETE')
                                <input type="hidden" name="return_to" value="devices">
                                <button type="submit" class="btn btn--ghost btn--sm">{{ __('ui.device_revoke') }}</button>
                            </form>
                        @endif
                    </article>
                @empty
                    <p class="settings-empty">{{ __('ui.devices_approved_empty') }}</p>
                @endforelse
            </div>
        </section>
    </div>
</section>
@endsection
