@if (session('success'))
    <div class="alert alert--success" role="status">{{ session('success') }}</div>
@endif

@if (session('error'))
    <div class="alert alert--danger" role="alert">{{ session('error') }}</div>
@endif

@foreach (['collector', 'invoice', 'purchase', 'release', 'lines', 'discount_percent', 'store_id', 'visit'] as $flashKey)
    @if ($errors->has($flashKey))
        <div class="alert alert--danger" role="alert">{{ $errors->first($flashKey) }}</div>
    @endif
@endforeach
