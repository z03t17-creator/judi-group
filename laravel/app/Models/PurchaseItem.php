<?php

namespace App\Models;

use App\Enums\ProductUnitKind;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'purchase_id',
    'product_id',
    'product_unit_id',
    'product_name',
    'unit',
    'quantity',
    'conversion_to_piece',
    'qty_pieces',
    'unit_cost',
    'line_total',
])]
class PurchaseItem extends Model
{
    protected function casts(): array
    {
        return [
            'unit' => ProductUnitKind::class,
            'quantity' => 'decimal:2',
            'conversion_to_piece' => 'integer',
            'qty_pieces' => 'integer',
            'unit_cost' => 'decimal:2',
            'line_total' => 'decimal:2',
        ];
    }

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function productUnit(): BelongsTo
    {
        return $this->belongsTo(ProductUnit::class);
    }
}
