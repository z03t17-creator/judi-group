@extends('layouts.app')

@section('title', __('ui.settings').' — '.__('ui.brand_short'))

@section('content')
<section class="page settings-page">
    <header class="page__header page__header--compact">
        <h1 class="page__title">{{ __('ui.settings') }}</h1>
    </header>

    @if (session('status'))
        <p class="flash flash--ok">{{ session('status') }}</p>
    @endif
    @if (session('error'))
        <p class="flash flash--err">{{ session('error') }}</p>
    @endif

    <div class="settings-board">
        <section class="surface-panel settings-panel" aria-labelledby="settings-prefs">
            <h2 id="settings-prefs" class="settings-panel__title">{{ __('ui.settings_appearance') }}</h2>
            <div class="settings-panel__list" data-prefs-live>
                <div class="settings-line">
                    <span class="settings-line__label">{{ __('ui.settings_theme') }}</span>
                    <div class="settings-pills" role="group">
                        <label class="settings-pill">
                            <input type="radio" name="theme" value="light" data-pref-theme @checked($theme === 'light')>
                            <span class="settings-pill__face">
                                @include('partials.icons.sun', ['class' => 'settings-pill__ico'])
                                {{ __('ui.theme_light') }}
                            </span>
                        </label>
                        <label class="settings-pill">
                            <input type="radio" name="theme" value="dark" data-pref-theme @checked($theme === 'dark')>
                            <span class="settings-pill__face">
                                @include('partials.icons.moon', ['class' => 'settings-pill__ico'])
                                {{ __('ui.theme_dark') }}
                            </span>
                        </label>
                    </div>
                </div>

                <div class="settings-line">
                    <span class="settings-line__label">{{ __('ui.settings_density') }}</span>
                    <div class="settings-pills" role="group">
                        <label class="settings-pill">
                            <input type="radio" name="density" value="small" data-pref-density @checked($density === 'small')>
                            <span class="settings-pill__face">{{ __('ui.density_small') }}</span>
                        </label>
                        <label class="settings-pill">
                            <input type="radio" name="density" value="big" data-pref-density @checked($density === 'big')>
                            <span class="settings-pill__face">{{ __('ui.density_big') }}</span>
                        </label>
                    </div>
                </div>

                <div class="settings-line">
                    <span class="settings-line__label">{{ __('ui.language') }}</span>
                    <div class="settings-line__control">
                        @include('partials.locale-switcher', ['tone' => 'settings'])
                    </div>
                </div>
            </div>
        </section>

        <section class="surface-panel settings-panel" aria-labelledby="settings-links">
            <h2 id="settings-links" class="settings-panel__title">{{ __('ui.quick_actions') }}</h2>
            <div class="settings-actions">
                <a class="settings-action" href="{{ route('notifications.index') }}">
                    <span class="settings-action__text">{{ __('ui.notifications') }}</span>
                    <span class="settings-action__chev" aria-hidden="true"></span>
                </a>
                @if (auth()->user()->canApproveDevices())
                    <a class="settings-action" href="{{ route('devices.index') }}">
                        <span class="settings-action__text">
                            {{ __('ui.device_requests') }}
                            @if ($pendingDevices->isNotEmpty())
                                <span class="chip chip--sm">{{ $pendingDevices->count() }}</span>
                            @endif
                        </span>
                        <span class="settings-action__chev" aria-hidden="true"></span>
                    </a>
                @endif
                @if (auth()->user()->isAdmin())
                    <a class="settings-action" href="{{ route('settings.backup') }}">
                        <span class="settings-action__text">{{ __('ui.backup_download') }}</span>
                        <span class="settings-action__chev" aria-hidden="true"></span>
                    </a>
                @endif
            </div>
        </section>

        @if (auth()->user()?->isAdmin())
            <section class="surface-panel settings-panel settings-panel--wide" id="settings-debt" aria-labelledby="settings-debt-title">
                <h2 id="settings-debt-title" class="settings-panel__title">{{ __('ui.debt_limit_settings') }}</h2>
                <form method="POST" action="{{ route('settings.debt_limits') }}" class="settings-line settings-line--toggle">
                    @csrf
                    <div class="settings-line__copy">
                        <span class="settings-line__label">{{ __('ui.debt_limit_toggle') }}</span>
                        <span class="settings-line__hint">{{ ($enforceDebtLimits ?? false) ? __('ui.debt_limit_on') : __('ui.debt_limit_off') }}</span>
                    </div>
                    <label class="settings-switch">
                        <input type="hidden" name="enforce_debt_limits" value="0">
                        <input type="checkbox" name="enforce_debt_limits" value="1" @checked($enforceDebtLimits ?? false) onchange="this.form.submit()">
                        <span class="settings-switch__track" aria-hidden="true"><span class="settings-switch__knob"></span></span>
                    </label>
                </form>
            </section>
        @endif

        @if (auth()->user()->canApproveDevices() && $pendingDevices->isNotEmpty())
            <section class="surface-panel settings-panel settings-panel--wide" aria-labelledby="settings-devices-pending">
                <h2 id="settings-devices-pending" class="settings-panel__title">{{ __('ui.devices_pending') }}</h2>
                <div class="settings-devices">
                    @foreach ($pendingDevices as $req)
                        <article class="settings-device-row">
                            <div>
                                <strong>{{ $req->user?->name }}</strong>
                                <p class="settings-device-row__meta" dir="ltr">
                                    {{ \App\Support\DeviceFingerprint::shortLabel($req->user_agent) }}
                                    · {{ \App\Support\DeviceFingerprint::shortCode($req->device_token) }}
                                    · {{ $req->ip_address }}
                                </p>
                            </div>
                            <div class="settings-device-row__actions">
                                <form method="POST" action="{{ route('settings.devices.approve', $req) }}">
                                    @csrf
                                    <button type="submit" class="btn btn--primary btn--sm">{{ __('ui.device_approve') }}</button>
                                </form>
                                <form method="POST" action="{{ route('settings.devices.reject', $req) }}">
                                    @csrf
                                    <button type="submit" class="btn btn--ghost btn--sm">{{ __('ui.device_reject') }}</button>
                                </form>
                            </div>
                        </article>
                    @endforeach
                </div>
            </section>
        @endif

        <section class="surface-panel settings-panel settings-panel--wide" aria-labelledby="settings-my-devices">
            <div class="settings-panel__head">
                <h2 id="settings-my-devices" class="settings-panel__title">{{ __('ui.my_devices') }}</h2>
                @if (auth()->user()->isAdmin() && $myDevices->count() > 1)
                    <form method="POST" action="{{ route('settings.devices.revoke_others') }}" onsubmit="return confirm(@json(__('ui.device_revoke_others_confirm')))">
                        @csrf
                        <button type="submit" class="settings-text-btn">{{ __('ui.device_revoke_others') }}</button>
                    </form>
                @endif
            </div>
            <div class="settings-devices">
                @forelse ($myDevices as $device)
                    <article class="settings-device-row">
                        <div>
                            <strong>
                                {{ $device->label ?: __('ui.device_unknown') }}
                                @if ($device->device_token === $currentDevice)
                                    <span class="chip chip--sm">{{ __('ui.device_this') }}</span>
                                @endif
                            </strong>
                            <p class="settings-device-row__meta" dir="ltr">
                                {{ $device->last_seen_at?->format('Y-m-d H:i') }}
                                · {{ $device->ip_address ?: '—' }}
                            </p>
                        </div>
                        @if (auth()->user()->isAdmin())
                            <form method="POST" action="{{ route('settings.devices.revoke', $device) }}" onsubmit="return confirm(@json($device->device_token === $currentDevice ? __('ui.device_revoke_current_confirm') : __('ui.device_revoke_confirm')))">
                                @csrf
                                @method('DELETE')
                                <button type="submit" class="btn btn--ghost btn--sm">{{ __('ui.device_revoke') }}</button>
                            </form>
                        @endif
                    </article>
                @empty
                    <p class="settings-empty">{{ __('ui.my_devices_empty') }}</p>
                @endforelse
            </div>
        </section>

        @if (auth()->user()->isAdmin())
            <section class="surface-panel settings-panel settings-panel--wide" aria-labelledby="settings-all-devices">
                <h2 id="settings-all-devices" class="settings-panel__title">{{ __('ui.all_user_devices') }}</h2>
                <div class="settings-devices">
                    @php $devicesByUser = $allDevices->groupBy('user_id'); @endphp
                    @forelse ($devicesByUser as $userId => $devices)
                        @php $owner = $devices->first()?->user; @endphp
                        <div class="settings-user-block">
                            <div class="settings-user-block__head">
                                <div>
                                    <strong>{{ $owner?->name ?? __('ui.device_unknown') }}</strong>
                                    <p class="settings-device-row__meta" dir="ltr">{{ $owner?->email }}</p>
                                </div>
                                @if ($owner)
                                    <form method="POST" action="{{ route('settings.devices.revoke_user_all', $owner) }}" onsubmit="return confirm(@json(__('ui.device_revoke_user_all_confirm')))">
                                        @csrf
                                        @method('DELETE')
                                        <button type="submit" class="settings-text-btn">{{ __('ui.device_revoke_user_all') }}</button>
                                    </form>
                                @endif
                            </div>
                            @foreach ($devices as $device)
                                <article class="settings-device-row settings-device-row--nested">
                                    <div>
                                        <strong>
                                            {{ $device->label ?: __('ui.device_unknown') }}
                                            @if ($owner && $device->user_id === auth()->id() && $device->device_token === $currentDevice)
                                                <span class="chip chip--sm">{{ __('ui.device_this') }}</span>
                                            @endif
                                        </strong>
                                        <p class="settings-device-row__meta" dir="ltr">
                                            {{ $device->last_seen_at?->format('Y-m-d H:i') }}
                                            · {{ $device->ip_address ?: '—' }}
                                        </p>
                                    </div>
                                    <form method="POST" action="{{ route('settings.devices.revoke', $device) }}" onsubmit="return confirm(@json(__('ui.device_revoke_confirm')))">
                                        @csrf
                                        @method('DELETE')
                                        <button type="submit" class="btn btn--ghost btn--sm">{{ __('ui.device_revoke') }}</button>
                                    </form>
                                </article>
                            @endforeach
                        </div>
                    @empty
                        <p class="settings-empty">{{ __('ui.all_user_devices_empty') }}</p>
                    @endforelse
                </div>
            </section>
        @endif
    </div>
</section>
@endsection
