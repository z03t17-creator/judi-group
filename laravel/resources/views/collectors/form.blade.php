@extends('layouts.app')

@section('title', ($collector->exists ? __('ui.collector_edit') : __('ui.collector_new')).' — JUDI')

@section('content')
<section class="page">
    <header class="page__header page__header--iconed">
        @include('partials.icon-badge', ['icon' => $collector->exists ? 'pencil' : 'plus', 'tone' => 'violet', 'size' => 'lg'])
        <div class="page__header-text">
            <h1 class="page__title">{{ $collector->exists ? __('ui.collector_edit') : __('ui.collector_new') }}</h1>
            <p class="page__lead">{{ __('ui.collector_lead') }}</p>
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
        action="{{ $collector->exists ? route('collectors.update', $collector) : route('collectors.store') }}"
        class="surface-panel form-panel"
        enctype="multipart/form-data"
    >
        @csrf
        @if ($collector->exists)
            @method('PUT')
        @endif

        @include('partials.image-upload', [
            'name' => 'image',
            'label' => __('ui.image'),
            'previewUrl' => $collector->imageUrl(),
            'round' => true,
            'capture' => 'user',
        ])

        <div class="form-grid">
            <label class="field">
                <span class="field__label">{{ __('ui.name') }}</span>
                <input class="field__input" type="text" name="name" value="{{ old('name', $collector->name) }}" required>
            </label>
            <label class="field">
                <span class="field__label">{{ __('ui.email') }}</span>
                <input class="field__input" type="email" name="email" value="{{ old('email', $collector->email) }}" required dir="ltr" inputmode="email">
            </label>
            <label class="field">
                <span class="field__label">{{ __('ui.collector_channel') }}</span>
                <select class="field__input" name="collector_channel" required>
                    @foreach ($channels as $channel)
                        <option value="{{ $channel->value }}" @selected(old('collector_channel', $collector->collector_channel?->value) === $channel->value)>
                            {{ $channel->mandubLabel() }}
                        </option>
                    @endforeach
                </select>
            </label>
            <label class="field">
                <span class="field__label">{{ __('ui.max_discount') }} %</span>
                <input
                    class="field__input"
                    type="number"
                    name="max_discount_percent"
                    min="0"
                    max="100"
                    step="0.01"
                    inputmode="decimal"
                    value="{{ old('max_discount_percent', $collector->max_discount_percent ?? 0) }}"
                    required
                >
            </label>
            <label class="field">
                <span class="field__label">{{ __('ui.max_gift') }} %</span>
                <input
                    class="field__input"
                    type="number"
                    name="max_gift_percent"
                    min="0"
                    max="100"
                    step="0.01"
                    inputmode="decimal"
                    value="{{ old('max_gift_percent', $collector->max_gift_percent ?? 0) }}"
                    required
                >
            </label>
            <label class="field">
                <span class="field__label">
                    {{ __('ui.new_password') }}
                    @if ($collector->exists)
                        {{ __('ui.password_unchanged') }}
                    @endif
                </span>
                <input class="field__input" type="password" name="password" {{ $collector->exists ? '' : 'required' }} autocomplete="new-password">
            </label>
            <label class="field">
                <span class="field__label">{{ __('ui.confirm_password') }}</span>
                <input class="field__input" type="password" name="password_confirmation" {{ $collector->exists ? '' : 'required' }} autocomplete="new-password">
            </label>
        </div>

        <label class="check check--spaced">
            <input type="checkbox" name="is_active" value="1" @checked(old('is_active', $collector->is_active ?? true))>
            <span>{{ __('ui.collector_active') }}</span>
        </label>

        <div class="sticky-cta">
            <button type="submit" class="btn btn--primary">{{ __('ui.save') }}</button>
            @if ($collector->exists)
                <button type="submit" form="collector-delete" class="btn btn--danger"
                    onclick="return confirm(@json(__('ui.confirm_delete_collector')))">{{ __('ui.delete') }}</button>
            @endif
        </div>
    </form>

    @if ($collector->exists)
        <form id="collector-delete" method="POST" action="{{ route('collectors.destroy', $collector) }}" class="visually-hidden">
            @csrf
            @method('DELETE')
        </form>
    @endif
</section>
@endsection
