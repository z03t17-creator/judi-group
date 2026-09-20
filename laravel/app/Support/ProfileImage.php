<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

final class ProfileImage
{
    public static function url(?string $path, string $fallback = 'images/placeholders/default.svg'): string
    {
        if (! $path) {
            return asset($fallback);
        }

        if (str_starts_with($path, 'images/') || str_starts_with($path, 'http')) {
            return str_starts_with($path, 'http') ? $path : asset($path);
        }

        return asset('storage/'.$path);
    }

    public static function store(UploadedFile $file, string $folder): string
    {
        $name = Str::uuid()->toString().'.'.$file->getClientOriginalExtension();

        return $file->storeAs($folder, $name, 'public');
    }

    public static function delete(?string $path): void
    {
        if (! $path || str_starts_with($path, 'images/')) {
            return;
        }

        Storage::disk('public')->delete($path);
    }
}
