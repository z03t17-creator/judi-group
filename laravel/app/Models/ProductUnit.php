<?php

namespace App\Models;

use App\Enums\CollectorChannel;
use App\Enums\ProductUnitKind;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'product_id',
    'unit',
    'barcode',
    'conversion_to_piece',
    'price_wholesale',
    'price_retail',
])]
class ProductUnit extends Model
{
    protected function casts(): array
    {
        return [
            'unit' => ProductUnitKind::class,
            'conversion_to_piece' => 'integer',
            'price_wholesale' => 'decimal:2',
            'price_retail' => 'decimal:2',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function priceFor(CollectorChannel $channel): string
    {
        return $channel === CollectorChannel::Wholesale
            ? (string) $this->price_wholesale
            : (string) $this->price_retail;
    }
}
