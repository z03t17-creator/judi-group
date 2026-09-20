@php
    /** @var array<int, array{label: string, value: string, hint?: string|null, icon?: string, tone?: string}> $kpis */
    $kpis = $kpis ?? [];
@endphp

@if (count($kpis) > 0)
    <div class="kpi-grid report-kpis list-kpis" style="--kpi-cols: {{ min(4, max(1, count($kpis))) }}">
        @foreach ($kpis as $kpi)
            <article class="kpi-card kpi-card--iconed report-kpi report-kpi--{{ $kpi['tone'] ?? 'teal' }}">
                @include('partials.icon-badge', [
                    'icon' => $kpi['icon'] ?? 'clipboard',
                    'tone' => $kpi['tone'] ?? 'teal',
                    'size' => 'md',
                ])
                <div>
                    <h2>{{ $kpi['label'] }}</h2>
                    <p class="kpi-card__value ltr-inline">{{ $kpi['value'] }}</p>
                    @if (! empty($kpi['hint']))
                        <p class="kpi-card__hint">{{ $kpi['hint'] }}</p>
                    @endif
                </div>
            </article>
        @endforeach
    </div>
@endif
