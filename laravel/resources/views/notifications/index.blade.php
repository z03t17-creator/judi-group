@extends('layouts.app')

@section('title', __('ui.notifications').' — '.__('ui.brand_short'))

@section('content')
<section class="page">
    <header class="page__header page__header--iconed">
        @include('partials.icon-badge', ['icon' => 'bell', 'tone' => 'teal', 'size' => 'lg'])
        <div class="page__header-text">
            <h1>{{ __('ui.notifications') }}</h1>
            <p>{{ __('ui.notifications_lead') }}</p>
        </div>
    </header>

    @if (session('status'))
        <p class="flash flash--ok">{{ session('status') }}</p>
    @endif
    @if (session('error'))
        <p class="flash flash--err">{{ session('error') }}</p>
    @endif

    <div class="settings-grid">
        <section class="surface-panel settings-card settings-card--wide" aria-labelledby="notif-inbox">
            <div class="settings-card__head">
                <h2 id="notif-inbox">{{ __('ui.notif_inbox') }}</h2>
                <div class="settings-card__actions">
                    <form method="POST" action="{{ route('settings.notifications.read') }}">
                        @csrf
                        <button type="submit" class="btn btn--ghost">{{ __('ui.notif_mark_read') }}</button>
                    </form>
                    <form method="POST" action="{{ route('settings.notifications.clear') }}" onsubmit="return confirm(@json(__('ui.notif_clear_confirm')))">
                        @csrf
                        <button type="submit" class="btn btn--ghost">{{ __('ui.notif_clear') }}</button>
                    </form>
                </div>
            </div>

            <div class="push-enable" data-push-panel>
                <p class="muted">{{ __('ui.notif_push_hint') }}</p>
                <div class="push-enable__actions" style="display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center">
                    <button type="button" class="btn btn--primary btn--sm" data-push-enable>
                        {{ __('ui.notif_push_enable') }}
                    </button>
                    <button type="button" class="btn btn--ghost btn--sm" data-push-test hidden>
                        {{ __('ui.notif_push_test') }}
                    </button>
                </div>
                <p class="push-enable__status muted" data-push-status></p>
            </div>

            <ul class="notif-list">
                @forelse ($notifications as $n)
                    <li class="notif-list__item {{ in_array($n->id, $readIds, true) ? '' : 'is-unread' }}">
                        <div class="notif-list__main">
                            <strong>{{ $n->title }}</strong>
                            <p>{{ $n->body }}</p>
                            <time dir="ltr">{{ $n->created_at?->format('Y-m-d H:i') }}</time>
                        </div>
                        <form method="POST" action="{{ route('settings.notifications.delete', $n) }}">
                            @csrf
                            @method('DELETE')
                            <button type="submit" class="btn btn--ghost">{{ __('ui.notif_delete') }}</button>
                        </form>
                    </li>
                @empty
                    <li class="muted">{{ __('ui.notif_empty') }}</li>
                @endforelse
            </ul>
        </section>

        @if (auth()->user()->isAdmin())
            <section class="surface-panel settings-card" aria-labelledby="notif-broadcast">
                <h2 id="notif-broadcast">{{ __('ui.notif_send_title') }}</h2>
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
    </div>
</section>
@endsection
