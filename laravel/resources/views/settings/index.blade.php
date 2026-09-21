@extends('layouts.app')

@section('title', __('ui.settings').' — JUDI')

@section('content')
<section class="page">
    <header class="page__header page__header--iconed">
        @include('partials.icon-badge', ['icon' => 'settings', 'tone' => 'slate', 'size' => 'lg'])
        <div class="page__header-text">
            <h1>{{ __('ui.settings') }}</h1>
            <p>{{ __('ui.settings_lead') }}</p>
        </div>
    </header>

    @if (session('status'))
        <p class="flash flash--ok">{{ session('status') }}</p>
    @endif
    @if (session('error'))
        <p class="flash flash--err">{{ session('error') }}</p>
    @endif

    <div class="settings-grid">
        {{-- Appearance --}}
        <section class="surface-panel settings-card" aria-labelledby="settings-appear">
            <h2 id="settings-appear">{{ __('ui.settings_appearance') }}</h2>
            <p class="muted">{{ __('ui.settings_appearance_live') }}</p>
            <div class="stack-form" data-prefs-live>
                <fieldset class="choice-row">
                    <legend>{{ __('ui.settings_theme') }}</legend>
                    <label class="choice-pill choice-pill--theme">
                        <input type="radio" name="theme" value="light" data-pref-theme @checked($theme === 'light')>
                        <span class="choice-pill__ico" aria-hidden="true">@include('partials.icons.sun', ['class' => 'choice-pill__svg'])</span>
                        <span>{{ __('ui.theme_light') }}</span>
                    </label>
                    <label class="choice-pill choice-pill--theme">
                        <input type="radio" name="theme" value="dark" data-pref-theme @checked($theme === 'dark')>
                        <span class="choice-pill__ico" aria-hidden="true">@include('partials.icons.moon', ['class' => 'choice-pill__svg'])</span>
                        <span>{{ __('ui.theme_dark') }}</span>
                    </label>
                </fieldset>

                <fieldset class="choice-row">
                    <legend>{{ __('ui.settings_density') }}</legend>
                    <label class="choice-pill">
                        <input type="radio" name="density" value="small" data-pref-density @checked($density === 'small')>
                        <span>{{ __('ui.density_small') }}</span>
                    </label>
                    <label class="choice-pill">
                        <input type="radio" name="density" value="big" data-pref-density @checked($density === 'big')>
                        <span>{{ __('ui.density_big') }}</span>
                    </label>
                </fieldset>
            </div>
        </section>

        {{-- Language --}}
        <section class="surface-panel settings-card" aria-labelledby="settings-lang">
            <h2 id="settings-lang">{{ __('ui.language') }}</h2>
            <p class="muted">{{ __('ui.settings_lang_hint') }}</p>
            @include('partials.locale-switcher', ['tone' => 'surface'])
        </section>

        {{-- Notifications inbox --}}
        <section class="surface-panel settings-card settings-card--wide" aria-labelledby="settings-inbox">
            <div class="settings-card__head">
                <h2 id="settings-inbox">{{ __('ui.notifications') }}</h2>
                <form method="POST" action="{{ route('settings.notifications.read') }}">
                    @csrf
                    <button type="submit" class="btn btn--ghost">{{ __('ui.notif_mark_read') }}</button>
                </form>
            </div>
            <p class="muted">{{ __('ui.notif_device_hint') }}</p>
            <p class="muted">{{ __('ui.notif_toast_hint') }}</p>
            <ul class="notif-list">
                @forelse ($notifications as $n)
                    <li class="notif-list__item {{ in_array($n->id, $readIds, true) ? '' : 'is-unread' }}">
                        <strong>{{ $n->title }}</strong>
                        <p>{{ $n->body }}</p>
                        <time dir="ltr">{{ $n->created_at?->format('Y-m-d H:i') }}</time>
                    </li>
                @empty
                    <li class="muted">{{ __('ui.notif_empty') }}</li>
                @endforelse
            </ul>
        </section>

        @if (auth()->user()->isAdmin())
            {{-- Admin broadcast --}}
            <section class="surface-panel settings-card" aria-labelledby="settings-broadcast">
                <h2 id="settings-broadcast">{{ __('ui.notif_send_title') }}</h2>
                <p class="muted">{{ __('ui.notif_send_hint') }}</p>
                <form method="POST" action="{{ route('settings.notifications.send') }}" class="stack-form">
                    @csrf
                    <label class="field">
                        <span class="field__label">{{ __('ui.notif_title') }}</span>
                        <input class="field__input" type="text" name="title" required maxlength="120" value="{{ old('title') }}">
                    </label>
                    <label class="field">
                        <span class="field__label">{{ __('ui.notif_body') }}</span>
                        <textarea class="field__input" name="body" rows="4" required maxlength="2000">{{ old('body') }}</textarea>
                    </label>
                    <label class="field">
                        <span class="field__label">{{ __('ui.notif_audience') }}</span>
                        <select class="field__input" name="audience">
                            <option value="all">{{ __('ui.notif_audience_all') }}</option>
                            <option value="admin">{{ __('ui.notif_audience_admin') }}</option>
                            <option value="accountant">{{ __('ui.notif_audience_accountant') }}</option>
                            <option value="collector">{{ __('ui.notif_audience_collector') }}</option>
                        </select>
                    </label>
                    <button type="submit" class="btn btn--primary">{{ __('ui.notif_send') }}</button>
                </form>
            </section>
        @endif

        @if (auth()->user()->canApproveDevices())
            {{-- Pending devices --}}
            <section class="surface-panel settings-card settings-card--wide" aria-labelledby="settings-devices-pending">
                <h2 id="settings-devices-pending">{{ __('ui.devices_pending') }}</h2>
                <p class="muted">{{ __('ui.devices_pending_hint') }}</p>
                @forelse ($pendingDevices as $req)
                    <article class="device-card">
                        <div>
                            <strong>{{ $req->user?->name }}</strong>
                            <p class="muted" dir="ltr">{{ $req->user?->email }}</p>
                            <p class="muted">
                                {{ \App\Support\DeviceFingerprint::shortLabel($req->user_agent) }}
                                · {{ __('ui.device_ip') }}: <strong dir="ltr">{{ $req->ip_address }}</strong>
                            </p>
                        </div>
                        <div class="device-card__actions">
                            <form method="POST" action="{{ route('settings.devices.approve', $req) }}">
                                @csrf
                                <button type="submit" class="btn btn--primary">{{ __('ui.device_approve') }}</button>
                            </form>
                            <form method="POST" action="{{ route('settings.devices.reject', $req) }}">
                                @csrf
                                <button type="submit" class="btn btn--ghost">{{ __('ui.device_reject') }}</button>
                            </form>
                        </div>
                    </article>
                @empty
                    <p class="muted">{{ __('ui.devices_pending_empty') }}</p>
                @endforelse
            </section>
        @endif

        @if (auth()->user()->isAdmin())
            {{-- Backup --}}
            <section class="surface-panel settings-card" aria-labelledby="settings-backup">
                <h2 id="settings-backup">{{ __('ui.backup') }}</h2>
                <p class="muted">{{ __('ui.backup_hint') }}</p>
                <a class="btn btn--primary" href="{{ route('settings.backup') }}">{{ __('ui.backup_download') }}</a>
            </section>
        @endif

        {{-- My devices --}}
        <section class="surface-panel settings-card settings-card--wide" aria-labelledby="settings-my-devices">
            <h2 id="settings-my-devices">{{ __('ui.my_devices') }}</h2>
            <p class="muted">{{ __('ui.my_devices_hint') }}</p>
            @if (auth()->user()->isAdmin() && $myDevices->count() > 1)
                <form method="POST" action="{{ route('settings.devices.revoke_others') }}" class="mb-3" onsubmit="return confirm(@json(__('ui.device_revoke_others_confirm')))">
                    @csrf
                    <button type="submit" class="btn btn--ghost">{{ __('ui.device_revoke_others') }}</button>
                </form>
            @endif
            @forelse ($myDevices as $device)
                <article class="device-card">
                    <div>
                        <strong>{{ $device->label ?: __('ui.device_unknown') }}</strong>
                        @if ($device->device_token === $currentDevice)
                            <span class="chip">{{ __('ui.device_this') }}</span>
                        @endif
                        <p class="muted" dir="ltr">
                            {{ __('ui.device_last_seen') }}: {{ $device->last_seen_at?->format('Y-m-d H:i') }}
                            · {{ __('ui.device_ip') }}: <strong>{{ $device->ip_address ?: '—' }}</strong>
                        </p>
                    </div>
                    @if (auth()->user()->isAdmin())
                        <form
                            method="POST"
                            action="{{ route('settings.devices.revoke', $device) }}"
                            onsubmit="return confirm(@json($device->device_token === $currentDevice ? __('ui.device_revoke_current_confirm') : __('ui.device_revoke_confirm')))"
                        >
                            @csrf
                            @method('DELETE')
                            <button type="submit" class="btn btn--ghost">{{ __('ui.device_revoke') }}</button>
                        </form>
                    @endif
                </article>
            @empty
                <p class="muted">{{ __('ui.my_devices_empty') }}</p>
            @endforelse
        </section>

        @if (auth()->user()->isAdmin())
            <section class="surface-panel settings-card settings-card--wide" aria-labelledby="settings-all-devices">
                <h2 id="settings-all-devices">{{ __('ui.all_user_devices') }}</h2>
                <p class="muted">{{ __('ui.all_user_devices_hint') }}</p>
                @php
                    $devicesByUser = $allDevices->groupBy('user_id');
                @endphp
                @forelse ($devicesByUser as $userId => $devices)
                    @php $owner = $devices->first()?->user; @endphp
                    <div class="device-card device-card--group">
                        <div class="device-card__head">
                            <strong>{{ $owner?->name ?? __('ui.device_unknown') }}</strong>
                            <span class="muted" dir="ltr">{{ $owner?->email }}</span>
                            @if ($owner)
                                <form method="POST" action="{{ route('settings.devices.revoke_user_all', $owner) }}" onsubmit="return confirm(@json(__('ui.device_revoke_user_all_confirm')))">
                                    @csrf
                                    @method('DELETE')
                                    <button type="submit" class="btn btn--ghost">{{ __('ui.device_revoke_user_all') }}</button>
                                </form>
                            @endif
                        </div>
                        @foreach ($devices as $device)
                            <article class="device-card device-card--nested">
                                <div>
                                    <strong>{{ $device->label ?: __('ui.device_unknown') }}</strong>
                                    @if ($owner && $device->user_id === auth()->id() && $device->device_token === $currentDevice)
                                        <span class="chip">{{ __('ui.device_this') }}</span>
                                    @endif
                                    <p class="muted" dir="ltr">
                                        {{ __('ui.device_last_seen') }}: {{ $device->last_seen_at?->format('Y-m-d H:i') }}
                                        · {{ __('ui.device_ip') }}: <strong>{{ $device->ip_address ?: '—' }}</strong>
                                    </p>
                                </div>
                                <form method="POST" action="{{ route('settings.devices.revoke', $device) }}" onsubmit="return confirm(@json(__('ui.device_revoke_confirm')))">
                                    @csrf
                                    @method('DELETE')
                                    <button type="submit" class="btn btn--ghost">{{ __('ui.device_revoke') }}</button>
                                </form>
                            </article>
                        @endforeach
                    </div>
                @empty
                    <p class="muted">{{ __('ui.all_user_devices_empty') }}</p>
                @endforelse
            </section>
        @endif
    </div>
</section>
@endsection
