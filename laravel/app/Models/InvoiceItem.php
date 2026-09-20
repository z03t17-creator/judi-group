<?php

namespace App\Models;

use App\Enums\ProductUnitKind;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'invoice_id',
    'product_id',
    'product_unit_id',
    'product_name',
    'unit',
    'quantity',
    'gift_quantity',
    'is_gift',
    'conversion_to_piece',
    'unit_price',
    'line_total',
])]
class InvoiceItem extends Model
{
    protected function casts(): array
    {
        return [
            'unit' => ProductUnitKind::class,
            'quantity' => 'decimal:2',
            'gift_quantity' => 'decimal:2',
            'is_gift' => 'boolean',
            'conversion_to_piece' => 'integer',
            'unit_price' => 'decimal:2',
            'line_total' => 'decimal:2',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
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
