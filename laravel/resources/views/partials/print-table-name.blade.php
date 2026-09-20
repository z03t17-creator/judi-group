@php
    $printTableTitle = $printTableTitle ?? ($printTitle ?? '');
    $printTableSubtitle = $printTableSubtitle ?? ($printSubtitle ?? null);
    $colspan = (int) ($colspan ?? 1);
@endphp
@if ($printTableTitle !== '')
    <tr class="print-table-name">
        <th colspan="{{ max(1, $colspan) }}">
            <span class="print-table-name__title">{{ $printTableTitle }}</span>
            @if ($printTableSubtitle)
                <span class="print-table-name__sub"> — {{ $printTableSubtitle }}</span>
            @endif
        </th>
    </tr>
@endif
