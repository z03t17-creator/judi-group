@extends('layouts.app')

@section('title', __('ui.notifications').' — '.__('ui.brand_short'))

@section('content')
<section class="page notif-page">
    <header class="page__header page__header--compact">
        <h1 class="page__title">{{ __('ui.notifications') }}</h1>
        @if ($notifications->isNotEmpty())
            <form method="POST" action="{{ route('settings.notifications.read') }}">
                @csrf
                <button type="submit" class="settings-text-btn">{{ __('ui.notif_mark_read') }}</button>
            </form>
        @endif
    </header>

    @if (session('status'))
        <p class="flash flash--ok">{{ session('status') }}</p>
    @endif
    @if (session('error'))
        <p class="flash flash--err">{{ session('error') }}</p>
    @endif

    <div class="settings-board">
        <section class="surface-panel settings-panel" aria-labelledby="notif-push">
            <h2 id="notif-push" class="settings-panel__title">{{ __('ui.notif_push_enable') }}</h2>
            <div class="push-enable settings-push" data-push-panel>
                <p class="settings-line__hint">{{ __('ui.notif_push_hint') }}</p>
                <div class="settings-line__actions">
                    <button type="button" class="btn btn--primary btn--sm" data-push-enable>
                        {{ __('ui.notif_push_enable') }}
                    </button>
                    <button type="button" class="btn btn--ghost btn--sm" data-push-test hidden>
                        {{ __('ui.notif_push_test') }}
                    </button>
                </div>
                <p class="push-enable__status muted" data-push-status></p>
            </div>
        </section>

        <section class="surface-panel settings-panel settings-panel--wide" aria-labelledby="notif-inbox">
            <h2 id="notif-inbox" class="settings-panel__title">{{ __('ui.notif_inbox') }}</h2>
            <ul class="notif-feed">
                @forelse ($notifications as $n)
                    <li class="notif-feed__item {{ in_array($n->id, $readIds, true) ? 'is-read' : 'is-unread' }}">
                        <div class="notif-feed__dot" aria-hidden="true"></div>
                        <div class="notif-feed__body">
                            <strong>{{ $n->title }}</strong>
                            <p>{{ $n->body }}</p>
                            <time dir="ltr">{{ $n->created_at?->diffForHumans() }}</time>
                        </div>
                    </li>
                @empty
                    <li class="settings-empty">{{ __('ui.notif_empty') }}</li>
                @endforelse
            </ul>
        </section>

        @if (auth()->user()->isAdmin())
            <section class="surface-panel settings-panel" aria-labelledby="notif-broadcast">
                <h2 id="notif-broadcast" class="settings-panel__title">{{ __('ui.notif_send_title') }}</h2>
                <form method="POST" action="{{ route('settings.notifications.send') }}" class="notif-compose">
                    @csrf
                    <label class="field">
                        <span class="field__label">{{ __('ui.notif_title') }}</span>
                        <input class="field__input" type="text" name="title" required maxlength="120" value="{{ old('title') }}">
                    </label>
                    <label class="field">
                        <span class="field__label">{{ __('ui.notif_body') }}</span>
                        <textarea class="field__input" name="body" rows="3" required maxlength="2000">{{ old('body') }}</textarea>
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
                    <button type="submit" class="btn btn--primary btn--sm">{{ __('ui.notif_send') }}</button>
                </form>
            </section>
        @endif
    </div>
</section>
@endsection
