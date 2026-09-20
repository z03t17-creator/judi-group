@php
    $label = $label ?? __('ui.print');
    $btnClass = $btnClass ?? 'btn btn--print';
@endphp
<button
    type="button"
    class="{{ $btnClass }} no-print"
    onclick="typeof judiPrint==='function'?judiPrint('a4'):window.print()"
    title="{{ $label }}"
>
    @include('partials.icons.print', ['class' => 'btn__icon'])
    <span>{{ $label }}</span>
</button>
