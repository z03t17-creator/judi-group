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

    <div class="settings-sheet">
        <section class="settings-group" aria-labelledby="settings-prefs">
            <h2 id="settings-prefs" class="settings-group__label">{{ __('ui.settings_appearance') }}</h2>
            <div class="settings-group__body" data-prefs-live>
                <div class="settings-row">
                    <span class="settings-row__label">{{ __('ui.settings_theme') }}</span>
                    <div class="settings-seg" role="group" aria-label="{{ __('ui.settings_theme') }}">
                        <label class="settings-seg__opt">
                            <input type="radio" name="theme" value="light" data-pref-theme @checked($theme === 'light')>
                            <span>@include('partials.icons.sun', ['class' => 'settings-seg__ico']) {{ __('ui.theme_light') }}</span>
                        </label>
                        <label class="settings-seg__opt">
                            <input type="radio" name="theme" value="dark" data-pref-theme @checked($theme === 'dark')>
                            <span>@include('partials.icons.moon', ['class' => 'settings-seg__ico']) {{ __('ui.theme_dark') }}</span>
                        </label>
                    </div>
                </div>
                <div class="settings-row">
                    <span class="settings-row__label">{{ __('ui.settings_density') }}</span>
                    <div class="settings-seg" role="group" aria-label="{{ __('ui.settings_density') }}">
                        <label class="settings-seg__opt">
                            <input type="radio" name="density" value="small" data-pref-density @checked($density === 'small')>
                            <span>{{ __('ui.density_small') }}</span>
                        </label>
                        <label class="settings-seg__opt">
                            <input type="radio" name="density" value="big" data-pref-density @checked($density === 'big')>
                            <span>{{ __('ui.density_big') }}</span>
                        </label>
                    </div>
                </div>
                <div class="settings-row settings-row--end">
                    <span class="settings-row__label">{{ __('ui.language') }}</span>
                    @include('partials.locale-switcher', ['tone' => 'settings'])
                </div>
            </div>
        </section>

        <section class="settings-group" aria-labelledby="settings-links">
            <h2 id="settings-links" class="settings-group__label">{{ __('ui.settings') }}</h2>
            <div class="settings-group__body">
                <a class="settings-link" href="{{ route('notifications.index') }}">
                    <span>{{ __('ui.notifications') }}</span>
                    <span class="settings-link__go" aria-hidden="true">‹</span>
                </a>
                @if (auth()->user()->canApproveDevices())
                    <a class="settings-link" href="{{ route('devices.index') }}">
                        <span>{{ __('ui.device_requests') }}</span>
                        @if ($pendingDevices->isNotEmpty())
                            <span class="chip chip--sm">{{ $pendingDevices->count() }}</span>
                        @endif
                        <span class="settings-link__go" aria-hidden="true">‹</span>
                    </a>
                @endif
                @if (auth()->user()->isAdmin())
                    <a class="settings-link" href="{{ route('settings.backup') }}">
                        <span>{{ __('ui.backup_download') }}</span>
                        <span class="settings-link__go" aria-hidden="true">‹</span>
                    </a>
                @endif
            </div>
        </section>

        @if (auth()->user()?->isAdmin())
            <section class="settings-group" id="settings-debt" aria-labelledby="settings-debt-title">
                <h2 id="settings-debt-title" class="settings-group__label">{{ __('ui.debt_limit_settings') }}</h2>
                <div class="settings-group__body">
                    <form method="POST" action="{{ route('settings.debt_limits') }}" class="settings-row settings-row--toggle" data-autosubmit>
                        @csrf
                        <div class="settings-row__copy">
                            <span class="settings-row__label">{{ __('ui.debt_limit_toggle') }}</span>
                            <span class="settings-row__hint">{{ ($enforceDebtLimits ?? false) ? __('ui.debt_limit_on') : __('ui.debt_limit_off') }}</span>
                        </div>
                        <label class="settings-switch">
                            <input type="hidden" name="enforce_debt_limits" value="0">
                            <input
                                type="checkbox"
                                name="enforce_debt_limits"
                                value="1"
                                @checked($enforceDebtLimits ?? false)
                                onchange="this.form.submit()"
                            >
                            <span class="settings-switch__ui" aria-hidden="true"></span>
                        </label>
                    </form>
                </div>
            </section>
        @endif

        @if (auth()->user()->canApproveDevices() && $pendingDevices->isNotEmpty())
            <section class="settings-group" aria-labelledby="settings-devices-pending">
                <h2 id="settings-devices-pending" class="settings-group__label">{{ __('ui.devices_pending') }}</h2>
                <div class="settings-group__body">
                    @foreach ($pendingDevices as $req)
                        <article class="settings-device">
                            <div class="settings-device__info">
                                <strong>{{ $req->user?->name }}</strong>
                                <p class="settings-device__meta" dir="ltr">
                                    {{ \App\Support\DeviceFingerprint::shortLabel($req->user_agent) }}
                                    · {{ \App\Support\DeviceFingerprint::shortCode($req->device_token) }}
                                    · {{ $req->ip_address }}
                                </p>
                            </div>
                            <div class="settings-device__actions">
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

        <section class="settings-group" aria-labelledby="settings-my-devices">
            <div class="settings-group__label-row">
                <h2 id="settings-my-devices" class="settings-group__label">{{ __('ui.my_devices') }}</h2>
                @if (auth()->user()->isAdmin() && $myDevices->count() > 1)
                    <form method="POST" action="{{ route('settings.devices.revoke_others') }}" onsubmit="return confirm(@json(__('ui.device_revoke_others_confirm')))">
                        @csrf
                        <button type="submit" class="settings-text-btn">{{ __('ui.device_revoke_others') }}</button>
                    </form>
                @endif
            </div>
            <div class="settings-group__body">
                @forelse ($myDevices as $device)
                    <article class="settings-device">
                        <div class="settings-device__info">
                            <strong>
                                {{ $device->label ?: __('ui.device_unknown') }}
                                @if ($device->device_token === $currentDevice)
                                    <span class="chip chip--sm">{{ __('ui.device_this') }}</span>
                                @endif
                            </strong>
                            <p class="settings-device__meta" dir="ltr">
                                {{ $device->last_seen_at?->format('Y-m-d H:i') }}
                                · {{ $device->ip_address ?: '—' }}
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
            <section class="settings-group" aria-labelledby="settings-all-devices">
                <h2 id="settings-all-devices" class="settings-group__label">{{ __('ui.all_user_devices') }}</h2>
                <div class="settings-group__body">
                    @php $devicesByUser = $allDevices->groupBy('user_id'); @endphp
                    @forelse ($devicesByUser as $userId => $devices)
                        @php $owner = $devices->first()?->user; @endphp
                        <div class="settings-device-group">
                            <div class="settings-device-group__head">
                                <div>
                                    <strong>{{ $owner?->name ?? __('ui.device_unknown') }}</strong>
                                    <p class="settings-device__meta" dir="ltr">{{ $owner?->email }}</p>
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
                                <article class="settings-device settings-device--nested">
                                    <div class="settings-device__info">
                                        <strong>
                                            {{ $device->label ?: __('ui.device_unknown') }}
                                            @if ($owner && $device->user_id === auth()->id() && $device->device_token === $currentDevice)
                                                <span class="chip chip--sm">{{ __('ui.device_this') }}</span>
                                            @endif
                                        </strong>
                                        <p class="settings-device__meta" dir="ltr">
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
