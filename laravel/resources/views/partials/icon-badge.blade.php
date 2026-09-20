@php
    $tone = $tone ?? 'teal';
    $size = $size ?? 'md';
    $icon = $icon ?? 'tags';
@endphp
<span class="icon-badge icon-badge--{{ $size }} tone-{{ $tone }}" aria-hidden="true">
    @include('partials.icons.'.$icon, ['class' => 'icon-badge__svg'])
</span>
