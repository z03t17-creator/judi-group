<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;

#[Fillable(['warehouse_id', 'product_id', 'qty_pieces'])]
class StockInventory extends Model
{
    protected function casts(): array
    {
        return [
            'qty_pieces' => 'integer',
        ];
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Increase on-hand base pieces for a product in a warehouse.
     */
    public static function addPieces(Warehouse $warehouse, Product $product, int $pieces): self
    {
        if ($pieces < 1) {
            throw new \InvalidArgumentException('ژمارەی دانە دەبێت لە سفر زیاتر بێت.');
        }

        return DB::transaction(function () use ($warehouse, $product, $pieces) {
            $row = static::query()
                ->where('warehouse_id', $warehouse->id)
                ->where('product_id', $product->id)
                ->lockForUpdate()
                ->first();

            if ($row) {
                $row->qty_pieces = (int) $row->qty_pieces + $pieces;
                $row->save();

                return $row;
            }

            return static::query()->create([
                'warehouse_id' => $warehouse->id,
                'product_id' => $product->id,
                'qty_pieces' => $pieces,
            ]);
        });
    }

    /**
     * Decrease on-hand base pieces (send goods out of کۆگا).
     */
    public static function removePieces(Warehouse $warehouse, Product $product, int $pieces): self
    {
        if ($pieces < 1) {
            throw new \InvalidArgumentException('ژمارەی دانە دەبێت لە سفر زیاتر بێت.');
        }

        return DB::transaction(function () use ($warehouse, $product, $pieces) {
            $row = static::query()
                ->where('warehouse_id', $warehouse->id)
                ->where('product_id', $product->id)
                ->lockForUpdate()
                ->first();

            $onHand = $row ? (int) $row->qty_pieces : 0;
            if ($onHand < $pieces) {
                throw new \InvalidArgumentException(
                    'کۆگا کافی نییە بۆ «'.$product->displayName().'» — پێویست: '
                    .number_format($pieces).' دانە، هەیە: '.number_format($onHand).' دانە.',
                );
            }

            $row->qty_pieces = $onHand - $pieces;
            $row->save();

            return $row;
        });
    }

    /**
     * @return array{pieces: int, carton: int, packet: int, piece: int, label: string}
     */
    public function breakdown(): array
    {
        $product = $this->relationLoaded('product')
            ? $this->product
            : $this->product()->first();

        if (! $product) {
            $qty = (int) $this->qty_pieces;

            return [
                'pieces' => $qty,
                'carton' => 0,
                'packet' => 0,
                'piece' => $qty,
                'label' => $qty.' دانە',
            ];
        }

        return $product->breakdownPieces((int) $this->qty_pieces);
    }
}
