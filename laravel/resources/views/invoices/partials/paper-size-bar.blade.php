{{-- Paper size picker — same for collector / wholesale / admin / accountant --}}
<div class="paper-size-bar no-print" role="group" aria-label="{{ __('ui.paper_size') }}">
    <span class="paper-size-bar__label">{{ __('ui.paper_size') }}</span>
    <div class="paper-size-bar__actions">
        <button type="button" class="paper-size-bar__btn" data-print="a4" data-paper-preview="a4">
            <strong>A4</strong>
            <span>{{ __('ui.print_a4_short') }}</span>
        </button>
        <button type="button" class="paper-size-bar__btn" data-print="a5" data-paper-preview="a5">
            <strong>A5</strong>
            <span>{{ __('ui.print_a5_short') }}</span>
        </button>
        <button type="button" class="paper-size-bar__btn" data-print="slip" data-paper-preview="slip">
            <strong>80mm</strong>
            <span>{{ __('ui.print_slip_short') }}</span>
        </button>
    </div>
</div>
