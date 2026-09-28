@php
    $target = $target ?? null;
    $label = $label ?? __('ui.print_section');
@endphp
@if ($target)
    <button
        type="button"
        class="btn btn--print btn--sm report-section__print no-print"
        data-print-section="{{ $target }}"
        title="{{ $label }}"
    >
        @include('partials.icons.print', ['class' => 'btn__icon'])
        <span>{{ $label }}</span>
    </button>
@endif
