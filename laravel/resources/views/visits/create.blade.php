@extends('layouts.app')

@section('title', __('ui.visit_start'). ' — '.__('ui.brand_short'))

@section('content')
<section class="page visit-start-page">
    <header class="page__header page__header--iconed">
        @include('partials.icon-badge', ['icon' => 'store', 'tone' => 'teal', 'size' => 'lg'])
        <div class="page__header-text">
            <h1 class="page__title">{{ __('ui.visit_start') }}</h1>
            <p class="page__lead">{{ __('ui.visit_start_lead') }}</p>
        </div>
        <a href="{{ route('stores.index') }}" class="btn btn--ghost btn--sm">{{ __('ui.back') }}</a>
    </header>

    @include('partials.flash')
    @if ($errors->any())
        <p class="field__error">{{ $errors->first() }}</p>
    @endif

    <form method="POST" action="{{ route('visits.store') }}" class="visit-start-form">
        @csrf
        <label class="sell-search">
            <span class="visually-hidden">{{ __('ui.search') }}</span>
            <input
                class="sell-search__input"
                type="search"
                data-visit-store-filter
                placeholder="{{ __('ui.search_store') }}"
                enterkeyhint="search"
                autocomplete="off"
            >
        </label>

        <div class="sell-store-list sell-store-list--page" role="listbox" aria-label="{{ __('ui.stores') }}">
            @foreach ($stores as $store)
                <label
                    class="sell-store sell-store--page visit-store-option"
                    data-visit-store-option
                    data-search="{{ mb_strtolower($store->name.' '.$store->owner_name.' '.$store->phone.' '.$store->address) }}"
                >
                    <input
                        type="radio"
                        name="store_id"
                        value="{{ $store->id }}"
                        class="visually-hidden"
                        @checked((int) $preselectStoreId === (int) $store->id)
                        required
                    >
                    <img class="sell-store__img" src="{{ $store->imageUrl() }}" alt="">
                    <span class="sell-store__body">
                        <strong>{{ $store->name }}</strong>
                        <span class="sell-store__phone" dir="ltr">{{ $store->phone }}</span>
                    </span>
                    @if ((float) $store->current_debt > 0)
                        <span class="sell-store__debt" dir="ltr">{{ number_format((float) $store->current_debt, 0) }}</span>
                    @endif
                </label>
            @endforeach
        </div>

        <div class="sticky-cta sticky-cta--sell no-print">
            <button type="submit" class="btn btn--primary btn--sell-submit">{{ __('ui.visit_start') }}</button>
        </div>
    </form>
</section>

<script>
(function () {
  var filter = document.querySelector("[data-visit-store-filter]");
  var options = Array.prototype.slice.call(document.querySelectorAll("[data-visit-store-option]"));
  if (!filter) return;
  filter.addEventListener("input", function () {
    var needle = (filter.value || "").trim().toLowerCase();
    options.forEach(function (el) {
      var hay = el.getAttribute("data-search") || "";
      el.hidden = needle !== "" && hay.indexOf(needle) === -1;
    });
  });
})();
</script>
@endsection
