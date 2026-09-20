@extends('layouts.guest')

@section('title', __('auth.login_title') . ' — JUDI')
@section('body_class', 'login-body')

@section('content')
<header class="login-topbar">
    <div class="login-topbar__actions">
        @include('partials.theme-toggle')
        @include('partials.locale-switcher', ['tone' => 'surface'])
    </div>
</header>

<div class="login-shell">
    <div class="login-stage">
        <div class="login-brand">
            <img
                src="{{ $judiLogoUrl }}"
                alt="JUDI — Nature • Quality • Trust"
                class="login-logo"
            >
            <h1 class="login-title">{{ __('auth.login_title') }}</h1>
            <p class="login-lead">{{ __('auth.login_lead') }}</p>
        </div>

        <section class="login-panel" aria-labelledby="login-heading">
            <h2 id="login-heading" class="visually-hidden">{{ __('auth.login_title') }}</h2>

            @if ($errors->any())
                <div class="alert alert--danger" role="alert">{{ $errors->first() }}</div>
            @endif

            <form method="POST" action="{{ route('login.store') }}" class="login-form">
                @csrf

                <label class="field">
                    <span class="field__label">{{ __('auth.email') }}</span>
                    <input
                        class="field__input field__input--surface"
                        type="email"
                        name="email"
                        value="{{ old('email') }}"
                        autocomplete="username"
                        inputmode="email"
                        required
                        autofocus
                    >
                </label>

                <label class="field">
                    <span class="field__label">{{ __('auth.password') }}</span>
                    <input
                        class="field__input field__input--surface"
                        type="password"
                        name="password"
                        autocomplete="current-password"
                        required
                    >
                </label>

                <label class="check">
                    <input type="checkbox" name="remember" value="1" @checked(old('remember'))>
                    <span>{{ __('auth.remember') }}</span>
                </label>

                <button type="submit" class="btn btn--primary btn--block btn--login">
                    {{ __('auth.login_title') }}
                </button>
            </form>
        </section>
    </div>
</div>
@endsection
