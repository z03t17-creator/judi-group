@php
    $name = $name ?? 'image';
    $label = $label ?? __('ui.image');
    $previewUrl = $previewUrl ?? null;
    $round = $round ?? false;
    $capture = $capture ?? 'environment'; // rear camera on phones; ignored on many desktops
    $uid = 'img-'.str_replace(['[', ']'], '-', $name).'-'.uniqid();
@endphp

<div class="profile-upload" data-image-upload>
    @if ($previewUrl)
        <img
            class="profile-upload__img {{ $round ? 'profile-upload__img--round' : '' }}"
            src="{{ $previewUrl }}"
            alt=""
            data-image-preview
        >
    @else
        <img
            class="profile-upload__img {{ $round ? 'profile-upload__img--round' : '' }}"
            src="{{ asset('images/placeholders/default.svg') }}"
            alt=""
            data-image-preview
            hidden
        >
    @endif

    <div class="image-upload-controls">
        <label class="field" style="margin:0">
            <span class="field__label">{{ $label }}</span>
            <input
                class="field__input"
                type="file"
                name="{{ $name }}"
                id="{{ $uid }}"
                accept="image/*"
                capture="{{ $capture }}"
                data-image-input
            >
        </label>
        <div class="image-upload-actions">
            <button type="button" class="btn btn--regular btn--sm" data-image-gallery>
                {{ __('ui.image_gallery') }}
            </button>
            <button type="button" class="btn btn--primary btn--sm" data-image-camera>
                {{ __('ui.image_camera') }}
            </button>
        </div>
        <p class="password-hint">{{ __('ui.image_camera_hint') }}</p>
    </div>

    <dialog class="camera-dialog" data-camera-dialog>
        <div class="camera-dialog__frame">
            <video data-camera-video autoplay playsinline muted></video>
            <canvas data-camera-canvas hidden></canvas>
        </div>
        <div class="camera-dialog__actions">
            <button type="button" class="btn btn--regular" data-camera-cancel>{{ __('ui.back') }}</button>
            <button type="button" class="btn btn--primary" data-camera-snap>{{ __('ui.image_take') }}</button>
        </div>
    </dialog>
</div>
