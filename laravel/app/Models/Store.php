<?php

namespace App\Models;

use App\Support\ProfileImage;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'name',
    'owner_name',
    'phone',
    'address',
    'latitude',
    'longitude',
    'credit_limit',
    'current_debt',
    'is_active',
    'image_path',
])]
class Store extends Model
{
    protected function casts(): array
    {
        return [
            'credit_limit' => 'decimal:2',
            'current_debt' => 'decimal:2',
            'latitude' => 'float',
            'longitude' => 'float',
            'is_active' => 'boolean',
        ];
    }

    public function hasCoordinates(): bool
    {
        return $this->latitude !== null
            && $this->longitude !== null
            && is_finite((float) $this->latitude)
            && is_finite((float) $this->longitude);
    }

    /** Open this store in Google Maps (no API key needed). */
    public function googleMapsUrl(): ?string
    {
        if (! $this->hasCoordinates()) {
            return null;
        }

        return 'https://www.google.com/maps?q='.rawurlencode(
            number_format((float) $this->latitude, 7, '.', '').','.number_format((float) $this->longitude, 7, '.', '')
        );
    }

    public function openStreetMapUrl(): ?string
    {
        if (! $this->hasCoordinates()) {
            return null;
        }

        $lat = number_format((float) $this->latitude, 7, '.', '');
        $lng = number_format((float) $this->longitude, 7, '.', '');

        return "https://www.openstreetmap.org/?mlat={$lat}&mlon={$lng}#map=17/{$lat}/{$lng}";
    }

    public function displayName(): string
    {
        return $this->name;
    }

    public function imageUrl(): string
    {
        return ProfileImage::url($this->image_path, 'images/placeholders/store.svg');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function collections(): HasMany
    {
        return $this->hasMany(Collection::class);
    }
}
