<?php

namespace App\Models;

use App\Enums\CollectorChannel;
use App\Enums\PagePermission;
use App\Enums\StoreRejectStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
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

        $built = [];
        $grossCredit = 0.0;

        foreach ($lines as $line) {
            $unitId = (int) ($line['product_unit_id'] ?? 0);
            $qty = round((float) ($line['quantity'] ?? 0), 2);
            if ($unitId < 1 || $qty <= 0) {
                continue;
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
