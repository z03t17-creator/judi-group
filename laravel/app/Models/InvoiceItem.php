<?php

namespace App\Models;

use App\Enums\CollectorChannel;
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
    'discount_percent',
    'discount_amount',
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
            'discount_percent' => 'decimal:2',
            'discount_amount' => 'decimal:2',
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

    /**
     * Price of one piece for comparison when the line is carton/packet.
     * Returns null when the line is already piece or no piece unit exists.
     */
    public function pieceUnitPrice(?CollectorChannel $channel = null): ?float
    {
        if ($this->unit === ProductUnitKind::Piece) {
            return null;
        }

        $channel ??= $this->invoice?->channel;
        if (! $channel instanceof CollectorChannel) {
            $channel = CollectorChannel::Wholesale;
        }

        $product = $this->relationLoaded('product')
            ? $this->product
            : $this->product()->with('units')->first();

        if (! $product) {
            return null;
        }

        $units = $product->relationLoaded('units')
            ? $product->units
            : $product->units()->get();

        $piece = $units->first(
            fn (ProductUnit $unit) => $unit->unit === ProductUnitKind::Piece
        );

        if (! $piece) {
            return null;
        }

        return round((float) $piece->priceFor($channel), 2);
    }
}
