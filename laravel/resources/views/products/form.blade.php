@extends('layouts.app')

@section('title', ($product->exists ? __('ui.product_edit') : __('ui.product_new')).' — JUDI')

@section('content')
@php
    $ppp = (int) old('pieces_per_packet', $product->pieces_per_packet ?: 1);
    $ppc = (int) old('pieces_per_carton', $product->pieces_per_carton ?: 1);
    $packSpec = old('pack_spec', $product->pack_spec);

    if (! $packSpec) {
        if ($ppp > 1 && $ppc > $ppp && $ppc % $ppp === 0) {
            $packSpec = $ppp.'x'.(int) ($ppc / $ppp);
        } else {
            $packSpec = (string) max(1, $ppc);
        }
    }
@endphp

<section class="page product-form-page">
    <header class="page__header page__header--iconed">
        @include('partials.icon-badge', ['icon' => $product->exists ? 'pencil' : 'plus', 'tone' => 'emerald', 'size' => 'lg'])
        <div class="page__header-text">
            <h1 class="page__title">{{ $product->exists ? __('ui.product_edit') : __('ui.product_new') }}</h1>
            <p class="page__lead">{{ __('ui.product_lead') }}</p>
        </div>
        <a href="{{ route('products.index') }}" class="btn btn--regular">
            @include('partials.icons.arrow-back', ['class' => 'btn__icon'])
            {{ __('ui.back') }}
        </a>
    </header>

    @if ($errors->any())
        <div class="alert alert--danger" role="alert">{{ $errors->first() }}</div>
    @endif

    <div class="product-workspace">
        {{-- Preview first in DOM so it shows above the form on phone; CSS pins it right on desktop --}}
        <aside class="barcode-preview surface-panel" data-barcode-preview aria-labelledby="barcode-preview-title">
            <div class="barcode-preview__head">
                <h2 id="barcode-preview-title" class="barcode-preview__title">{{ __('ui.barcode_preview') }}</h2>
                <button type="button" class="btn btn--regular btn--sm" data-print-label disabled>{{ __('ui.print') }}</button>
            </div>

            <div class="barcode-preview__chips" role="tablist" data-preview-chips>
                <button type="button" class="chip is-active" role="tab" data-preview-select="product" aria-selected="true">{{ __('ui.preview_product') }}</button>
                <button type="button" class="chip" role="tab" data-preview-select="piece" aria-selected="false">{{ __('ui.preview_piece') }}</button>
                <button type="button" class="chip" role="tab" data-preview-select="packet" aria-selected="false">{{ __('ui.preview_packet') }}</button>
                <button type="button" class="chip" role="tab" data-preview-select="carton" aria-selected="false">{{ __('ui.preview_carton') }}</button>
            </div>

            <div class="barcode-preview__card">
                <p class="barcode-preview__name" data-preview-name>—</p>
                <p class="barcode-preview__sku" data-preview-sku>—</p>
                <p class="barcode-preview__unit" data-preview-unit></p>
                <svg class="barcode-preview__svg" data-preview-svg role="img" aria-label="barcode" hidden></svg>
                <p class="barcode-preview__empty" data-preview-empty>{{ __('ui.preview_empty') }}</p>
                <p class="barcode-preview__code" data-preview-code dir="ltr"></p>
            </div>

            <button type="button" class="btn btn--primary btn--block" data-preview-generate>{{ __('ui.preview_regen') }}</button>
        </aside>

        <form
            id="product-form"
            method="POST"
            action="{{ $product->exists ? route('products.update', $product) : route('products.store') }}"
            class="surface-panel product-form"
            data-product-form
            enctype="multipart/form-data"
        >
            @csrf
            @if ($product->exists)
                @method('PUT')
            @endif

            <section class="form-section">
                @include('partials.image-upload', [
                    'name' => 'image',
                    'label' => __('ui.image'),
                    'previewUrl' => $product->imageUrl(),
                    'round' => false,
                    'capture' => 'environment',
                ])

                <label class="field">
                    <span class="field__label">{{ __('ui.product_name') }}</span>
                    <input class="field__input" type="text" name="name" id="product-name"
                        value="{{ old('name', $product->name) }}" required autocomplete="off" data-sync-preview>
                </label>

                <div class="form-grid">
                    <label class="field">
                        <span class="field__label">{{ __('ui.category') }}</span>
                        <select class="field__input" name="category_id" required data-category-select>
                            <option value="">—</option>
                            @foreach ($categories as $category)
                                <option value="{{ $category->id }}" @selected((string) old('category_id', $product->category_id) === (string) $category->id)>
                                    {{ $category->name }}
                                </option>
                            @endforeach
                        </select>
                    </label>
                    <label class="field">
                        <span class="field__label">{{ __('ui.subcategory') }}</span>
                        <select class="field__input" name="subcategory_id" data-subcategory-select>
                            <option value="">—</option>
                        </select>
                    </label>
                </div>

                <div class="field">
                    <span class="field__label">{{ __('ui.sku') }}</span>
                    <div class="field-row">
                        <input class="field__input field__input--mono" type="text" name="sku" id="product-sku"
                            value="{{ old('sku', $product->sku) }}" required autocomplete="off" spellcheck="false" data-sync-preview>
                        <button type="button" class="btn btn--gen" data-generate-sku>{{ __('ui.generate_sku') }}</button>
                    </div>
                </div>

                <div class="field">
                    <span class="field__label">{{ __('ui.barcode_main') }}</span>
                    <div class="field-row">
                        <input class="field__input field__input--mono" type="text" name="barcode" id="product-barcode"
                            value="{{ old('barcode', $product->barcode) }}" inputmode="numeric" autocomplete="off"
                            spellcheck="false" data-sync-preview data-preview-key="product">
                        <button type="button" class="btn btn--gen" data-generate-barcode
                            data-target="#product-barcode" data-sku-source="#product-sku">{{ __('ui.generate_barcode') }}</button>
                    </div>
                </div>
            </section>

            <section class="form-section">
                <h2 class="form-section__title">{{ __('ui.pack_title') }}</h2>
                <p class="form-section__hint">{{ __('ui.pack_hint') }}</p>

                <label class="field">
                    <span class="field__label">{{ __('ui.pack_title') }}</span>
                    <input
                        class="field__input field__input--mono pack-spec-input"
                        type="text"
                        name="pack_spec"
                        id="pack-spec"
                        value="{{ $packSpec }}"
                        placeholder="{{ __('ui.pack_placeholder') }}"
                        autocomplete="off"
                        inputmode="text"
                        data-pack-spec
                    >
                </label>

                <div class="pack-live" data-pack-live aria-live="polite">
                    <div class="pack-live__item">
                        <span class="pack-live__label">{{ __('ui.pack_live_packet') }}</span>
                        <strong class="pack-live__value" data-live-packet>{{ $ppp }}</strong>
                    </div>
                    <div class="pack-live__item">
                        <span class="pack-live__label">{{ __('ui.pack_live_packets_in_carton') }}</span>
                        <strong class="pack-live__value" data-live-packets>{{ $ppp > 0 ? max(1, (int) round($ppc / max(1, $ppp))) : 1 }}</strong>
                    </div>
                    <div class="pack-live__item">
                        <span class="pack-live__label">{{ __('ui.pack_live_carton') }}</span>
                        <strong class="pack-live__value" data-live-carton>{{ $ppc }}</strong>
                    </div>
                </div>

                <input type="hidden" name="pieces_per_packet" id="pieces-per-packet" value="{{ $ppp }}" data-pieces-packet>
                <input type="hidden" name="pieces_per_carton" id="pieces-per-carton" value="{{ $ppc }}" data-pieces-carton>
            </section>

            <section class="form-section">
                <h2 class="form-section__title">{{ __('ui.prices_title') }}</h2>
                <div class="price-matrix-wrap">
                    <table class="price-matrix">
                        <thead>
                            <tr>
                                <th scope="col">{{ __('ui.unit') }}</th>
                                <th scope="col">{{ __('ui.barcode') }}</th>
                                <th scope="col">{{ __('ui.price_wholesale') }}</th>
                                <th scope="col">{{ __('ui.price_retail') }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach ($unitKinds as $kind)
                                <tr>
                                    <th scope="row" class="price-matrix__unit">
                                        <strong>{{ __('ui.'.$kind->value) }}</strong>
                                    </th>
                                    <td>
                                        <div class="field-row field-row--tight">
                                            <input class="field__input field__input--mono" type="text"
                                                name="prices[{{ $kind->value }}][barcode]"
                                                id="unit-barcode-{{ $kind->value }}"
                                                value="{{ old("prices.{$kind->value}.barcode", $prices[$kind->value]['barcode'] ?? '') }}"
                                                inputmode="numeric" autocomplete="off" spellcheck="false"
                                                data-sync-preview data-preview-key="{{ $kind->value }}">
                                            <button type="button" class="btn btn--gen btn--sm"
                                                data-generate-barcode
                                                data-target="#unit-barcode-{{ $kind->value }}"
                                                data-sku-source="#product-sku"
                                                data-unit-suffix="{{ $kind->value }}">{{ __('ui.generate') }}</button>
                                        </div>
                                    </td>
                                    <td>
                                        <input
                                            class="field__input"
                                            type="text"
                                            inputmode="numeric"
                                            dir="ltr"
                                            data-money
                                            data-decimals="0"
                                            name="prices[{{ $kind->value }}][wholesale]"
                                            value="{{ old("prices.{$kind->value}.wholesale", number_format((float) ($prices[$kind->value]['wholesale'] ?? 0), 0, '.', ',')) }}"
                                            required
                                        >
                                    </td>
                                    <td>
                                        <input
                                            class="field__input"
                                            type="text"
                                            inputmode="numeric"
                                            dir="ltr"
                                            data-money
                                            data-decimals="0"
                                            name="prices[{{ $kind->value }}][retail]"
                                            value="{{ old("prices.{$kind->value}.retail", number_format((float) ($prices[$kind->value]['retail'] ?? 0), 0, '.', ',')) }}"
                                            required
                                        >
                                    </td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            </section>

            <label class="check check--spaced">
                <input type="checkbox" name="is_active" value="1" @checked(old('is_active', $product->is_active ?? true))>
                <span>{{ __('ui.active_product') }}</span>
            </label>

            <div class="sticky-cta">
                <button type="submit" class="btn btn--primary">{{ __('ui.save') }}</button>
                @if ($product->exists)
                    <button type="submit" form="product-delete" class="btn btn--danger"
                        onclick="return confirm('?')">{{ __('ui.delete') }}</button>
                @endif
            </div>
        </form>
    </div>

    @if ($product->exists)
        <form id="product-delete" method="POST" action="{{ route('products.destroy', $product) }}" class="visually-hidden">
            @csrf
            @method('DELETE')
        </form>
    @endif
</section>

<script src="{{ asset('js/vendor/JsBarcode.all.min.js') }}"></script>
<script src="{{ asset('js/product-form.js') }}?v=6" defer></script>
@php
    $categoryTree = $categories->map(function ($c) {
        return [
            'id' => $c->id,
            'subs' => $c->subcategories->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->name,
            ])->values(),
        ];
    })->values();
@endphp
<script>
(function () {
  var tree = @json($categoryTree);
  var cat = document.querySelector('[data-category-select]');
  var sub = document.querySelector('[data-subcategory-select]');
  var selected = @json((string) old('subcategory_id', $product->subcategory_id));
  function fill() {
    if (!cat || !sub) return;
    var row = tree.find(function (c) { return String(c.id) === String(cat.value); });
    sub.innerHTML = '<option value="">—</option>';
    (row ? row.subs : []).forEach(function (s) {
      var opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      if (String(s.id) === String(selected)) opt.selected = true;
      sub.appendChild(opt);
    });
  }
  if (cat) cat.addEventListener('change', function () { selected = ''; fill(); });
  fill();
})();
</script>
@endsection
