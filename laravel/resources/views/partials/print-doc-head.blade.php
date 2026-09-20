@php
    $printTitle = $printTitle ?? 'JUDI';
    $printSubtitle = $printSubtitle ?? null;
    $printFilters = $printFilters ?? null;
    $company = config('judi.company', []);
    $phones = $company['phones'] ?? [];
@endphp
<div class="print-doc-head print-only" aria-hidden="true">
    <div class="print-doc-head__top">
        <div class="print-doc-head__brand">
            <img
                src="{{ $judiLogoUrl }}"
                alt=""
                class="print-doc-head__logo"
                width="56"
                height="56"
            >
            <div class="print-doc-head__text">
                <strong class="print-doc-head__company">{{ $company['name'] ?? 'JUDI' }}</strong>
                @if (! empty($company['tagline']))
                    <p class="print-doc-head__tagline">{{ $company['tagline'] }}</p>
                @endif
                @if ($phones)
                    <p class="print-doc-head__phones" dir="ltr">{{ implode(' · ', $phones) }}</p>
                @endif
                @if (! empty($company['address']))
                    <p class="print-doc-head__address">{{ $company['address'] }}</p>
                @endif
            </div>
        </div>
        <div class="print-doc-head__meta">
            <p class="print-doc-head__title">{{ $printTitle }}</p>
            @if ($printSubtitle)
                <p class="print-doc-head__sub">{{ $printSubtitle }}</p>
            @endif
            <p class="print-doc-head__date" dir="ltr">{{ now()->timezone(config('app.timezone'))->format('Y-m-d H:i') }}</p>
            <p class="print-doc-head__pages" aria-hidden="true"></p>
        </div>
    </div>
</div>
@if (! empty($printFilters))
    @include('partials.print-filters', ['printFilters' => $printFilters])
@endif
