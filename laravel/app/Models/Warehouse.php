<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'name_ckb', 'code', 'is_primary', 'is_active'])]
class Warehouse extends Model
{
    protected function casts(): array
    {
        return [
            'is_primary' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public static function primary(): ?self
    {
        return static::query()->where('is_primary', true)->where('is_active', true)->first();
    }

    public function displayName(): string
    {
        $locale = app()->getLocale();

        if ($locale === 'ckb' && filled($this->name_ckb)) {
            return (string) $this->name_ckb;
        }

        if ($locale === 'ar' && $this->code === 'MAIN') {
            return __('ui.warehouse_main');
        }

        return (string) ($this->name ?: $this->name_ckb ?: '—');
    }

    public function stockInventories(): HasMany
    {
        return $this->hasMany(StockInventory::class);
    }

    public function purchases(): HasMany
    {
        return $this->hasMany(Purchase::class);
    }
}
