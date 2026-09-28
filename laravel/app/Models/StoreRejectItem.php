<?php

namespace App\Models;

use App\Enums\ProductUnitKind;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'store_reject_id',
    'product_id',
    'product_unit_id',
    'product_name',
    'unit',
    'quantity',
    'conversion_to_piece',
    'pieces',
    'unit_price',
    'line_credit',
])]
class StoreRejectItem extends Model
{
    protected function casts(): array
    {
        return [
            'unit' => ProductUnitKind::class,
            'quantity' => 'decimal:2',
            'conversion_to_piece' => 'integer',
            'pieces' => 'integer',
            'unit_price' => 'decimal:2',
            'line_credit' => 'decimal:2',
        ];
    }

    public function reject(): BelongsTo
    {
        return $this->belongsTo(StoreReject::class, 'store_reject_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function productUnit(): BelongsTo
    {
        return $this->belongsTo(ProductUnit::class);
    }

    public function unitLabel(): string
    {
        return $this->unit instanceof ProductUnitKind
            ? $this->unit->label()
            : (string) $this->unit;
    }
}
