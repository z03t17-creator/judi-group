@extends('layouts.app')

@section('title', ($store->exists ? __('ui.store_edit') : __('ui.store_new')).' — JUDI')

@section('content')
<section class="page">
    <header class="page__header page__header--iconed">
        @include('partials.icon-badge', ['icon' => $store->exists ? 'pencil' : 'plus', 'tone' => 'orange', 'size' => 'lg'])
        <div class="page__header-text">
            <h1 class="page__title">{{ $store->exists ? __('ui.store_edit') : __('ui.store_new') }}</h1>
            <p class="page__lead">{{ __('ui.store_lead') }}</p>
        </div>
        <a href="{{ $store->exists ? route('stores.show', $store) : route('stores.index') }}" class="btn btn--regular">
            @include('partials.icons.arrow-back', ['class' => 'btn__icon'])
            {{ __('ui.back') }}
        </a>
    </header>

    @if ($errors->any())
        <div class="alert alert--danger" role="alert">{{ $errors->first() }}</div>
    @endif

    <form
        method="POST"
        action="{{ $store->exists ? route('stores.update', $store) : route('stores.store') }}"
        class="surface-panel form-panel"
        enctype="multipart/form-data"
    >
        @csrf
        @if ($store->exists)
            @method('PUT')
        @endif

        @include('partials.image-upload', [
            'name' => 'image',
            'label' => __('ui.image'),
            'previewUrl' => $store->imageUrl(),
            'round' => false,
            'capture' => 'environment',
        ])

        <div class="form-grid form-grid--store">
            <label class="field">
                <span class="field__label">{{ __('ui.store_name') }}</span>
                <input class="field__input" type="text" name="name" value="{{ old('name', $store->name) }}" required>
            </label>
            <label class="field">
                <span class="field__label">{{ __('ui.store_owner') }}</span>
                <input class="field__input" type="text" name="owner_name" value="{{ old('owner_name', $store->owner_name) }}" placeholder="{{ __('ui.store_owner_placeholder') }}">
            </label>
            <label class="field">
                <span class="field__label">{{ __('ui.phone') }}</span>
                <input class="field__input" type="text" name="phone" value="{{ old('phone', $store->phone) }}" required dir="ltr" inputmode="tel">
            </label>
            <label class="field field--wide">
                <span class="field__label">{{ __('ui.address') }}</span>
                <input class="field__input" type="text" name="address" value="{{ old('address', $store->address) }}">
            </label>

            <div
                class="store-map field--wide"
                data-store-map
                data-maps-key="{{ $maps['key'] ?? '' }}"
                data-default-lat="{{ $maps['lat'] ?? 35.5558 }}"
                data-default-lng="{{ $maps['lng'] ?? 45.4351 }}"
                data-default-zoom="{{ $maps['zoom'] ?? 12 }}"
            >
                <div class="store-map__head">
                    <span class="field__label">{{ __('ui.store_map') }}</span>
                    <p class="store-map__hint muted">{{ __('ui.store_map_hint') }}</p>
                </div>
                <div class="store-map__actions">
                    <button type="button" class="btn btn--regular btn--sm" data-map-gps>
                        {{ __('ui.store_map_gps') }}
                    </button>
                    <button type="button" class="btn btn--ghost btn--sm" data-map-clear>
                        {{ __('ui.store_map_clear') }}
                    </button>
                </div>
                <div class="store-map__canvas" data-map-canvas role="presentation"></div>
                @if (empty($maps['key']))
                    <p class="store-map__note muted">
                        {{ __('ui.store_map_using_osm') }}
                        <a href="https://console.cloud.google.com/google/maps-apis/credentials" target="_blank" rel="noopener">{{ __('ui.store_map_get_key') }}</a>
                    </p>
                @endif
                <div class="store-map__coords form-grid form-grid--coords">
                    <label class="field">
                        <span class="field__label">{{ __('ui.store_lat') }}</span>
                        <input
                            class="field__input"
                            type="text"
                            name="latitude"
                            inputmode="decimal"
                            dir="ltr"
                            data-map-lat
                            value="{{ old('latitude', $store->latitude) }}"
                            placeholder="35.5558"
                            autocomplete="off"
                        >
                    </label>
                    <label class="field">
                        <span class="field__label">{{ __('ui.store_lng') }}</span>
                        <input
                            class="field__input"
                            type="text"
                            name="longitude"
                            inputmode="decimal"
                            dir="ltr"
                            data-map-lng
                            value="{{ old('longitude', $store->longitude) }}"
                            placeholder="45.4351"
                            autocomplete="off"
                        >
                    </label>
                </div>
            </div>

            <label class="field">
                <span class="field__label">{{ __('ui.credit_limit') }}</span>
                <input
                    class="field__input"
                    type="text"
                    inputmode="numeric"
                    dir="ltr"
                    data-money
                    data-decimals="0"
                    name="credit_limit"
                    value="{{ old('credit_limit', number_format((float) ($store->credit_limit ?? 0), 0, '.', ',')) }}"
                    required
                >
            </label>
            @if ($store->exists)
                <label class="field">
                    <span class="field__label">{{ __('ui.current_debt') }}</span>
                    <input
                        class="field__input"
                        type="text"
                        value="{{ number_format((float) $store->current_debt, 0) }}"
                        disabled
                        dir="ltr"
                    >
                </label>
            @endif
        </div>

        <label class="check check--spaced">
            <input type="checkbox" name="is_active" value="1" @checked(old('is_active', $store->is_active ?? true))>
            <span>{{ __('ui.active_store') }}</span>
        </label>

        <div class="sticky-cta">
            <button type="submit" class="btn btn--primary">{{ __('ui.save') }}</button>
            @if ($store->exists)
                <button type="submit" form="store-delete" class="btn btn--danger"
                    onclick="return confirm('?')">{{ __('ui.delete') }}</button>
            @endif
        </div>
    </form>

    @if ($store->exists)
        <form id="store-delete" method="POST" action="{{ route('stores.destroy', $store) }}" class="visually-hidden">
            @csrf
            @method('DELETE')
        </form>
    @endif
</section>
@if (! empty($maps['key']))
    <script>window.judiStoreMapInit = window.judiStoreMapInit || function () {};</script>
    <script
        src="https://maps.googleapis.com/maps/api/js?key={{ urlencode($maps['key']) }}&callback=judiStoreMapInit"
        async
        defer
    ></script>
    <script src="{{ asset('js/store-map.js') }}?v=2" defer></script>
@else
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
    <script src="{{ asset('js/store-map.js') }}?v=2"></script>
@endif
@endsection
