@if ($paginator->hasPages())
    <nav class="pager__nav" aria-label="{{ __('ui.pager_label') }}">
        @if ($paginator->onFirstPage())
            <span class="pager__link pager__link--disabled">{{ __('ui.pager_previous') }}</span>
        @else
            <a class="pager__link" href="{{ $paginator->previousPageUrl() }}" rel="prev">{{ __('ui.pager_previous') }}</a>
        @endif

        @if ($paginator->hasMorePages())
            <a class="pager__link" href="{{ $paginator->nextPageUrl() }}" rel="next">{{ __('ui.pager_next') }}</a>
        @else
            <span class="pager__link pager__link--disabled">{{ __('ui.pager_next') }}</span>
        @endif
    </nav>
@endif
