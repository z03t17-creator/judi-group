@extends('layouts.guest')

@section('title', __('ui.device_pending_title').' — JUDI')
@section('body_class', 'login-body')

@section('content')
<header class="login-topbar">
    <div class="login-topbar__actions">
        @include('partials.theme-toggle')
        @include('partials.locale-switcher', ['tone' => 'surface'])
    </div>
</header>

<section class="login-shell">
    <div class="login-card surface-panel">
        <h1>{{ __('ui.device_pending_title') }}</h1>
        <p>{{ __('ui.device_pending_lead') }}</p>
        <p class="muted">{{ $deviceLabel }} · {{ __('ui.device_ip') }}: <strong dir="ltr">{{ $pending->ip_address }}</strong></p>
        <p class="muted" id="pending-wait">{{ __('ui.device_pending_wait') }}</p>
        <form method="POST" action="{{ route('logout') }}" style="margin-top:1rem">
            @csrf
            <button type="submit" class="btn btn--ghost">{{ __('ui.sign_out') }}</button>
        </form>
    </div>
</section>
<script>
(() => {
  const pollUrl = @json(route('device.pending.poll', absolute: false));
  async function tick() {
    try {
      const res = await fetch(pollUrl, { headers: { 'Accept': 'application/json' }, credentials: 'same-origin' });
      const data = await res.json();
      if (data.approved && data.redirect) {
        window.location.href = data.redirect;
      }
    } catch (e) {}
  }
  setInterval(tick, 4000);
  tick();
})();
</script>
@endsection
