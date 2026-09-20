<?php

namespace App\Models;

use App\Support\PurchaseNumber;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

#[Fillable([
    'purchase_number',
    'supplier_id',
    'warehouse_id',
    'created_by_id',
    'purchased_at',
    'total_cost',
    'notes',
])]
class Purchase extends Model
{
    protected function casts(): array
    {
        return [
            'purchased_at' => 'date',
            'total_cost' => 'decimal:2',
        ];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseItem::class);
    }

    /**
     * Receive goods into کۆگا: create purchase + increase stock (base pieces).
     *
     * @param  list<array{product_unit_id: int|string, quantity: float|int|string, unit_cost: float|int|string}>  $lines
     */
    public static function receiveIntoWarehouse(
        User $actor,
        Warehouse $warehouse,
        array $lines,
        ?Supplier $supplier = null,
        ?string $purchasedAt = null,
        ?string $notes = null,
    ): self {
        if (! $actor->canAccess(\App\Enums\PagePermission::Purchases)) {
            throw new InvalidArgumentException('دەسەڵاتت نییە بۆ کڕین / خستنە کۆگا.');
        }

        if (! $warehouse->is_active) {
            throw new InvalidArgumentException('کۆگا ناچالاکە.');
        }

        if ($supplier && ! $supplier->is_active) {
            throw new InvalidArgumentException('دابینکەر ناچالاکە.');
        }

        $normalized = [];
        foreach ($lines as $line) {
            $unitId = (int) ($line['product_unit_id'] ?? 0);
            $qty = round((float) ($line['quantity'] ?? 0), 2);
            $unitCost = round((float) ($line['unit_cost'] ?? 0), 2);
            if ($unitId < 1 || $qty <= 0) {
                continue;
            }
            if ($unitCost < 0) {
                throw new InvalidArgumentException('نرخی کڕین نابێت نەرێنی بێت.');
            }
            $normalized[] = [
                'product_unit_id' => $unitId,
                'quantity' => $qty,
                'unit_cost' => $unitCost,
            ];
        }

        if ($normalized === []) {
            throw new InvalidArgumentException('لانیکەم یەک هێڵ پێویستە.');
        }

        $date = $purchasedAt
            ? \Illuminate\Support\Carbon::parse($purchasedAt)->toDateString()
            : now()->toDateString();

        return DB::transaction(function () use ($actor, $warehouse, $supplier, $normalized, $date, $notes) {
            $last = static::query()
                ->lockForUpdate()
                ->orderByDesc('id')
                ->value('purchase_number');

            $built = [];
            $totalCost = 0.0;
            $piecesByProduct = [];

            foreach ($normalized as $line) {
                $unit = ProductUnit::query()
                    ->with('product')
                    ->findOrFail($line['product_unit_id']);

                $product = $unit->product;
                if (! $product || ! $product->is_active) {
                    throw new InvalidArgumentException('کاڵا ناچالاکە یان نەدۆزرایەوە.');
                }

                $conversion = max(1, (int) $unit->conversion_to_piece);
                $qtyPieces = (int) round((float) $line['quantity'] * $conversion);
                if ($qtyPieces < 1) {
                    throw new InvalidArgumentException('ژمارەی دانە دەبێت لە سفر زیاتر بێت.');
                }

                $lineTotal = round((float) $line['quantity'] * (float) $line['unit_cost'], 2);
                $totalCost += $lineTotal;

                $built[] = [
                    'product_id' => $product->id,
                    'product_unit_id' => $unit->id,
                    'product_name' => $product->displayName(),
                    'unit' => $unit->unit->value,
                    'quantity' => number_format((float) $line['quantity'], 2, '.', ''),
                    'conversion_to_piece' => $conversion,
                    'qty_pieces' => $qtyPieces,
                    'unit_cost' => number_format((float) $line['unit_cost'], 2, '.', ''),
                    'line_total' => number_format($lineTotal, 2, '.', ''),
                ];

                $piecesByProduct[$product->id] = ($piecesByProduct[$product->id] ?? 0) + $qtyPieces;
            }

            $purchase = static::query()->create([
                'purchase_number' => PurchaseNumber::next($last),
                'supplier_id' => $supplier?->id,
                'warehouse_id' => $warehouse->id,
                'created_by_id' => $actor->id,
                'purchased_at' => $date,
                'total_cost' => number_format(round($totalCost, 2), 2, '.', ''),
                'notes' => $notes !== null && $notes !== '' ? $notes : null,
            ]);

            foreach ($built as $row) {
                $purchase->items()->create($row);
            }

            foreach ($piecesByProduct as $productId => $pieces) {
                $product = Product::query()->findOrFail($productId);
                StockInventory::addPieces($warehouse, $product, (int) $pieces);
            }

            return $purchase->load(['items', 'supplier', 'warehouse', 'createdBy']);
        });
    }
}
