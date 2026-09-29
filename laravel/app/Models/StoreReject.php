<?php

namespace App\Models;

use App\Enums\CollectorChannel;
use App\Enums\InvoiceStatus;
use App\Enums\PagePermission;
use App\Enums\StoreRejectStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

#[Fillable([
    'store_visit_id',
    'store_id',
    'collector_id',
    'warehouse_id',
    'status',
    'credit_amount',
    'note',
    'reviewed_at',
    'reviewed_by_id',
])]
class StoreReject extends Model
{
    protected function casts(): array
    {
        return [
            'status' => StoreRejectStatus::class,
            'credit_amount' => 'decimal:2',
            'reviewed_at' => 'datetime',
        ];
    }

    public function visit(): BelongsTo
    {
        return $this->belongsTo(StoreVisit::class, 'store_visit_id');
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function collector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'collector_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(StoreRejectItem::class);
    }

    public function isPosted(): bool
    {
        return $this->status === StoreRejectStatus::Posted;
    }

    public function needsReview(): bool
    {
        return $this->isPosted() && $this->reviewed_at === null;
    }

    /**
     * Units previously sold to this store on accountant-sent invoices, minus already returned.
     * Pending (unsent) collector orders are excluded.
     *
     * @return Collection<int, array{product_unit_id: int, product_id: int, available: float, sold: float, returned: float}>
     */
    public static function returnableByUnitForStore(Store $store): Collection
    {
        $sold = DB::table('invoice_items')
            ->join('invoices', 'invoices.id', '=', 'invoice_items.invoice_id')
            ->where('invoices.store_id', $store->id)
            ->where('invoices.status', InvoiceStatus::Sent->value)
            ->groupBy('invoice_items.product_unit_id', 'invoice_items.product_id')
            ->selectRaw(
                'invoice_items.product_unit_id, invoice_items.product_id, '
                .'SUM(invoice_items.quantity + invoice_items.gift_quantity) as sold_qty'
            )
            ->get()
            ->keyBy('product_unit_id');

        if ($sold->isEmpty()) {
            return collect();
        }

        $returned = DB::table('store_reject_items')
            ->join('store_rejects', 'store_rejects.id', '=', 'store_reject_items.store_reject_id')
            ->where('store_rejects.store_id', $store->id)
            ->where('store_rejects.status', StoreRejectStatus::Posted->value)
            ->groupBy('store_reject_items.product_unit_id')
            ->selectRaw('store_reject_items.product_unit_id, SUM(store_reject_items.quantity) as returned_qty')
            ->pluck('returned_qty', 'product_unit_id');

        return $sold
            ->map(function ($row) use ($returned) {
                $unitId = (int) $row->product_unit_id;
                $soldQty = round((float) $row->sold_qty, 2);
                $returnedQty = round((float) ($returned[$unitId] ?? 0), 2);
                $available = round(max(0, $soldQty - $returnedQty), 2);

                return [
                    'product_unit_id' => $unitId,
                    'product_id' => (int) $row->product_id,
                    'sold' => $soldQty,
                    'returned' => $returnedQty,
                    'available' => $available,
                ];
            })
            ->filter(fn (array $row) => $row['available'] > 0.0001)
            ->values();
    }

    public static function availableQtyForUnit(Store $store, int $productUnitId): float
    {
        $row = static::returnableByUnitForStore($store)
            ->firstWhere('product_unit_id', $productUnitId);

        return $row ? (float) $row['available'] : 0.0;
    }

    /**
     * @param  list<array{product_unit_id: int|string, quantity?: float|int|string}>  $lines
     */
    public static function recordReturn(
        StoreVisit $visit,
        User $collector,
        array $lines,
        ?string $note = null,
    ): self {
        if (! $visit->isOpen()) {
            throw new InvalidArgumentException('سەردان کۆتایی هاتووە — گەڕاندنەوە تۆمار ناکرێت.');
        }

        if ((int) $visit->collector_id !== (int) $collector->id) {
            throw new InvalidArgumentException('ئەم سەردانە هی تۆ نییە.');
        }

        if (! $collector->canAccess(PagePermission::InvoicesSell)
            && ! $collector->canAccess(PagePermission::Collections)) {
            throw new InvalidArgumentException('دەسەڵاتت نییە بۆ گەڕاندنەوە بۆ کۆگا.');
        }

        $warehouse = Warehouse::primary();
        if (! $warehouse) {
            throw new InvalidArgumentException('کۆگای سەرەکی نییە.');
        }

        $channel = $collector->collector_channel;
        if (! $channel instanceof CollectorChannel) {
            $channel = CollectorChannel::Wholesale;
        }

        $store = Store::query()->findOrFail($visit->store_id);
        $returnable = static::returnableByUnitForStore($store)->keyBy('product_unit_id');

        $built = [];
        $grossCredit = 0.0;
        $claimed = [];

        foreach ($lines as $line) {
            $unitId = (int) ($line['product_unit_id'] ?? 0);
            $qty = round((float) ($line['quantity'] ?? 0), 2);
            if ($unitId < 1 || $qty <= 0) {
                continue;
            }

            $available = (float) ($returnable[$unitId]['available'] ?? 0);
            $already = (float) ($claimed[$unitId] ?? 0);
            $left = round(max(0, $available - $already), 2);
            if ($left <= 0.0001) {
                throw new InvalidArgumentException('ئەم کاڵایە لەم فرۆشگایە نەفرۆشراوە یان پێشتر گەڕێنراوەتەوە.');
            }
            if ($qty > $left + 0.0001) {
                throw new InvalidArgumentException(
                    'ژمارەی گەڕاندنەوە لە فرۆشتنی فرۆشگا زیاترە (زۆرترین '.rtrim(rtrim(number_format($left, 2, '.', ''), '0'), '.').').',
                );
            }

            $unit = ProductUnit::query()->with('product')->findOrFail($unitId);
            $product = $unit->product;
            if (! $product || ! $product->is_active) {
                throw new InvalidArgumentException('کاڵا ناچالاکە یان نەدۆزرایەوە.');
            }

            $unitPrice = (float) $unit->priceFor($channel);
            $lineCredit = round($unitPrice * $qty, 2);
            $pieces = (int) round($qty * max(1, (int) $unit->conversion_to_piece));
            if ($pieces < 1) {
                throw new InvalidArgumentException('ژمارەی دانە نادروستە بۆ «'.$product->displayName().'».');
            }

            $claimed[$unitId] = round($already + $qty, 2);
            $grossCredit += $lineCredit;
            $built[] = [
                'product_id' => $product->id,
                'product_unit_id' => $unit->id,
                'product_name' => $product->displayName(),
                'unit' => $unit->unit->value,
                'quantity' => number_format($qty, 2, '.', ''),
                'conversion_to_piece' => (int) $unit->conversion_to_piece,
                'pieces' => $pieces,
                'unit_price' => number_format($unitPrice, 2, '.', ''),
                'line_credit' => number_format($lineCredit, 2, '.', ''),
                'product' => $product,
            ];
        }

        if ($built === []) {
            throw new InvalidArgumentException('لانیکەم یەک کاڵا بۆ گەڕاندنەوە هەڵبژێرە.');
        }

        $grossCredit = round($grossCredit, 2);

        return DB::transaction(function () use ($visit, $collector, $warehouse, $built, $grossCredit, $note) {
            $store = Store::query()->lockForUpdate()->findOrFail($visit->store_id);
            $debt = round((float) $store->current_debt, 2);
            $credit = min($grossCredit, $debt);

            // Scale line credits if debt cannot cover full list price.
            $scale = $grossCredit > 0.0001 ? ($credit / $grossCredit) : 0.0;

            $reject = static::query()->create([
                'store_visit_id' => $visit->id,
                'store_id' => $store->id,
                'collector_id' => $collector->id,
                'warehouse_id' => $warehouse->id,
                'status' => StoreRejectStatus::Posted,
                'credit_amount' => number_format($credit, 2, '.', ''),
                'note' => $note,
            ]);

            foreach ($built as $row) {
                $product = $row['product'];
                unset($row['product']);
                $lineCredit = round((float) $row['line_credit'] * $scale, 2);
                $row['line_credit'] = number_format($lineCredit, 2, '.', '');
                $reject->items()->create($row);
                StockInventory::addPieces($warehouse, $product, (int) $row['pieces']);
            }

            if ($credit > 0) {
                $store->current_debt = number_format(max(0, $debt - $credit), 2, '.', '');
                $store->save();
            }

            return $reject->load(['items', 'store', 'collector', 'warehouse', 'visit']);
        });
    }

    public function markReviewed(User $actor): self
    {
        if (! $actor->canAccess(PagePermission::ReportsReview)
            && ! $actor->isAdmin()
            && ! $actor->isAccountant()) {
            throw new InvalidArgumentException('دەسەڵاتت نییە بۆ پێداچوونەوەی گەڕاندنەوە.');
        }

        if ($this->reviewed_at !== null) {
            return $this;
        }

        $this->reviewed_at = now();
        $this->reviewed_by_id = $actor->id;
        $this->save();

        return $this;
    }
}
