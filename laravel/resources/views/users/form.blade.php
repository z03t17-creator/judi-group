@extends('layouts.app')

@section('title', __('ui.user_edit').' — JUDI')

@section('content')
@php
    $checked = collect($checkedPermissions ?? [])->all();
@endphp
<section class="page">
    <header class="page__header page__header--iconed">
        @include('partials.icon-badge', ['icon' => 'pencil', 'tone' => 'violet', 'size' => 'lg'])
        <div class="page__header-text">
            <h1 class="page__title">{{ __('ui.user_edit') }}</h1>
            <p class="page__lead">{{ $editUser->email }}</p>
        </div>
        <a href="{{ route('users.index') }}" class="btn btn--regular">
            @include('partials.icons.arrow-back', ['class' => 'btn__icon'])
            {{ __('ui.back') }}
        </a>
    </header>

    @if ($errors->any())
        <div class="alert alert--danger" role="alert">{{ $errors->first() }}</div>
    @endif

    <form
        method="POST"
        action="{{ route('users.update', $editUser) }}"
        class="surface-panel form-panel"
        enctype="multipart/form-data"
        id="user-form"
    >
        @csrf
        @method('PUT')

        @include('partials.image-upload', [
            'name' => 'image',
            'label' => __('ui.image'),
            'previewUrl' => $editUser->imageUrl(),
            'round' => true,
            'capture' => 'user',
        ])

        <div class="form-grid">
            <label class="field">
                <span class="field__label">{{ __('ui.name') }}</span>
                <input class="field__input" type="text" name="name" value="{{ old('name', $editUser->name) }}" required>
            </label>
            <label class="field">
                <span class="field__label">{{ __('ui.email') }}</span>
                <input class="field__input" type="email" name="email" value="{{ old('email', $editUser->email) }}" required dir="ltr" inputmode="email">
            </label>
            <label class="field">
                <span class="field__label">{{ __('ui.role') }}</span>
                <select class="field__input" name="role" id="user-role" required>
                    @foreach ($roles as $role)
                        <option value="{{ $role->value }}" @selected(old('role', $editUser->role?->value) === $role->value)>
                            {{ $role->label() }}
                        </option>
                    @endforeach
                </select>
            </label>
            <label class="field" data-collector-only>
                <span class="field__label">{{ __('ui.collector_channel') }}</span>
                <select class="field__input" name="collector_channel">
                    @foreach ($channels as $channel)
                        <option value="{{ $channel->value }}" @selected(old('collector_channel', $editUser->collector_channel?->value) === $channel->value)>
                            {{ $channel->mandubLabel() }}
                        </option>
                    @endforeach
                </select>
            </label>
            <label class="field" data-collector-only>
                <span class="field__label">{{ __('ui.max_discount') }} %</span>
                <input
                    class="field__input"
                    type="number"
                    name="max_discount_percent"
                    min="0"
                    max="100"
                    step="0.01"
                    inputmode="decimal"
                    value="{{ old('max_discount_percent', $editUser->max_discount_percent ?? 0) }}"
                >
            </label>
            <label class="field" data-collector-only>
                <span class="field__label">{{ __('ui.max_gift') }} %</span>
                <input
                    class="field__input"
                    type="number"
                    name="max_gift_percent"
                    min="0"
                    max="100"
                    step="0.01"
                    inputmode="decimal"
                    value="{{ old('max_gift_percent', $editUser->max_gift_percent ?? 0) }}"
                >
            </label>
            <label class="field">
                <span class="field__label">{{ __('ui.new_password') }}</span>
                <input class="field__input" type="password" name="password" autocomplete="new-password" placeholder="{{ __('ui.optional') }}">
            </label>
            <label class="field">
                <span class="field__label">{{ __('ui.confirm_password') }}</span>
                <input class="field__input" type="password" name="password_confirmation" autocomplete="new-password">
            </label>
        </div>

        <label class="check check--spaced">
            <input type="checkbox" name="is_active" value="1" @checked(old('is_active', $editUser->is_active ?? true))>
            <span>{{ __('ui.active') }}</span>
        </label>

        <fieldset class="perm-box" id="perm-box" data-admin-full="{{ __('ui.perm_admin_always') }}">
            <legend>{{ __('ui.permissions') }}</legend>
            <p class="password-hint">{{ __('ui.permissions_lead') }}</p>

            <label class="check check--spaced" id="custom-perm-toggle-wrap">
                <input
                    type="checkbox"
                    name="use_custom_permissions"
                    value="1"
                    id="use-custom-permissions"
                    @checked((string) $useCustomPermissions === '1')
                >
                <span>{{ __('ui.permissions_custom') }}</span>
            </label>

            <div class="perm-grid" id="perm-grid">
                @foreach ($allPermissions as $perm)
                    <label class="perm-item check">
                        <input
                            type="checkbox"
                            name="permissions[]"
                            value="{{ $perm->value }}"
                            class="perm-check"
                            @checked(in_array($perm->value, $checked, true))
                        >
                        <span>{{ $perm->label() }}</span>
                    </label>
                @endforeach
            </div>

            <div class="release-steps__actions" style="margin-top:0.75rem">
                <button type="button" class="btn btn--regular btn--sm" id="perm-apply-defaults">
                    {{ __('ui.permissions_apply_role') }}
                </button>
                <button type="button" class="btn btn--regular btn--sm" id="perm-check-all">
                    {{ __('ui.permissions_all') }}
                </button>
                <button type="button" class="btn btn--regular btn--sm" id="perm-check-none">
                    {{ __('ui.permissions_none') }}
                </button>
            </div>
        </fieldset>

        <div class="sticky-cta">
            <button type="submit" class="btn btn--primary">{{ __('ui.save') }}</button>
        </div>
    </form>
</section>

<script>
(function () {
  var role = document.getElementById('user-role');
  var blocks = document.querySelectorAll('[data-collector-only]');
  var custom = document.getElementById('use-custom-permissions');
  var grid = document.getElementById('perm-grid');
  var toggleWrap = document.getElementById('custom-perm-toggle-wrap');
  var defaultsByRole = @json($defaultsByRole);
  var checks = function () { return Array.prototype.slice.call(document.querySelectorAll('.perm-check')); };

  function syncCollector() {
    var show = role && role.value === 'collector';
    blocks.forEach(function (el) { el.style.display = show ? '' : 'none'; });
  }

  function syncAdmin() {
    var isAdmin = role && role.value === 'admin';
    if (toggleWrap) toggleWrap.style.display = isAdmin ? 'none' : '';
    if (isAdmin) {
      if (custom) custom.checked = false;
      checks().forEach(function (c) { c.checked = true; c.disabled = true; });
      if (grid) grid.style.opacity = '0.55';
    } else {
      checks().forEach(function (c) { c.disabled = !(custom && custom.checked); });
      if (grid) grid.style.opacity = (custom && custom.checked) ? '1' : '0.55';
    }
  }

  function applyDefaults() {
    var list = (defaultsByRole[(role && role.value) || ''] || []);
    checks().forEach(function (c) {
      c.checked = list.indexOf(c.value) !== -1;
    });
  }

  if (role) {
    role.addEventListener('change', function () {
      syncCollector();
      syncAdmin();
      if (custom && custom.checked && role.value !== 'admin') applyDefaults();
    });
  }
  if (custom) {
    custom.addEventListener('change', syncAdmin);
  }

  var applyBtn = document.getElementById('perm-apply-defaults');
  if (applyBtn) applyBtn.addEventListener('click', function () {
    if (custom && !custom.checked) custom.checked = true;
    syncAdmin();
    applyDefaults();
  });
  var allBtn = document.getElementById('perm-check-all');
  if (allBtn) allBtn.addEventListener('click', function () {
    if (custom && !custom.checked) custom.checked = true;
    syncAdmin();
    checks().forEach(function (c) { if (!c.disabled) c.checked = true; });
  });
  var noneBtn = document.getElementById('perm-check-none');
  if (noneBtn) noneBtn.addEventListener('click', function () {
    if (custom && !custom.checked) custom.checked = true;
    syncAdmin();
    checks().forEach(function (c) { if (!c.disabled) c.checked = false; });
  });

  syncCollector();
  syncAdmin();
})();
</script>
@endsection
