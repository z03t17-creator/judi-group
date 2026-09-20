@if (session('success'))
    <div class="alert alert--success" role="status">{{ session('success') }}</div>
@endif

@if ($errors->has('collector'))
    <div class="alert alert--danger" role="alert">{{ $errors->first('collector') }}</div>
@endif

@if ($errors->has('invoice'))
    <div class="alert alert--danger" role="alert">{{ $errors->first('invoice') }}</div>
@endif

@if ($errors->has('purchase'))
    <div class="alert alert--danger" role="alert">{{ $errors->first('purchase') }}</div>
@endif

@if ($errors->has('release'))
    <div class="alert alert--danger" role="alert">{{ $errors->first('release') }}</div>
@endif

@if ($errors->has('release'))
    <div class="alert alert--danger" role="alert">{{ $errors->first('release') }}</div>
@endif
