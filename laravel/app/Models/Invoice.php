<?php

namespace App\Models;

use App\Enums\CollectorChannel;
use App\Enums\InvoiceStatus;
use App\Enums\InvoiceType;
use App\Support\InvoiceNumber;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

#[Fillable([
    'invoice_number',
    'store_id',
    'warehouse_id',
    'collector_id',
    'invoice_type',
    'status',
    'channel',
    'subtotal',
    'discount_percent',
    'discount_amount',
    'total_amount',
    'paid_amount',
    'debt_amount',
    'currency',
    'sent_at',
    'sent_by_id',
])]
class Invoice extends Model
{
    protected function casts(): array
    {
        return [
            'invoice_type' => InvoiceType::class,
            'status' => InvoiceStatus::class,
            'channel' => CollectorChannel::class,
            'subtotal' => 'decimal:2',
            'discount_percent' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'paid_amount' => 'decimal:2',
            'debt_amount' => 'decimal:2',
            'sent_at' => 'datetime',
        ];
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function collector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'collector_id');
    }

    public function sentBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sent_by_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function collections(): HasMany
    {
        return $this->hasMany(Collection::class);
    }

    public function saleCollection(): ?Collection
    {
        return $this->collections->sortByDesc('id')->first();
    }

    public function isPendingSend(): bool
    {
        return $this->status === InvoiceStatus::PendingSend;
    }

    public function isSent(): bool
    {
        return $this->status === InvoiceStatus::Sent;
    }

    public function isCancelled(): bool
    {
        return $this->status === InvoiceStatus::Cancelled;
    }

    /**
     * Debt: owning collector, accountant, or admin.
     * Cash: accountant or admin only.
     */
    public function userCanCancel(User $actor): bool
    {
        if ($this->isCancelled()) {
            return false;
        }

        $isOffice = $actor->isAdmin() || $actor->isAccountant();

        if ($this->invoice_type === InvoiceType::Cash) {
            return $isOffice;
        }

        // Debt
        if ($isOffice) {
            return true;
        }

        return $actor->isCollector()
            && (int) $this->collector_id === (int) $actor->id
            && $actor->canAccess(\App\Enums\PagePermission::InvoicesSell);
    }

    /**
     * Cancel invoice: restore store debt (debt sales) and warehouse stock if already sent.
     */
    public function cancel(User $actor): self
    {
        if (! $this->userCanCancel($actor)) {
            throw new InvalidArgumentException('دەسەڵاتت نییە بۆ هەڵوەشاندنەوەی ئەم پسوولەیە.');
        }

        return DB::transaction(function () use ($actor) {
            $invoice = static::query()
                ->lockForUpdate()
                ->findOrFail($this->id);

            if ($invoice->status === InvoiceStatus::Cancelled) {
                throw new InvalidArgumentException('ئەم پسوولەیە پێشتر هەڵوەشێنراوەتەوە.');
            }

            $wasSent = $invoice->status === InvoiceStatus::Sent;
            $invoice->load(['items.product', 'warehouse', 'collections']);

            foreach ($invoice->collections as $linked) {
                $linked->reverseAndDelete($actor);
            }

            $store = Store::query()->lockForUpdate()->findOrFail($invoice->store_id);

            // Every sale posts the full total onto store debt; sale cash is held as a
            // pending collection until the accountant confirms it.
            $store->current_debt = number_format(
                max(0, round((float) $store->current_debt - (float) $invoice->total_amount, 2)),
                2,
                '.',
                '',
            );
            $store->save();

            if ($wasSent) {
                $warehouse = Warehouse::query()
                    ->lockForUpdate()
                    ->findOrFail($invoice->warehouse_id);

                foreach ($invoice->piecesToSendByProduct() as $productId => $pieces) {
                    $product = Product::query()->findOrFail($productId);
                    StockInventory::addPieces($warehouse, $product, (int) $pieces);
                }
            }

            $invoice->status = InvoiceStatus::Cancelled;
            $invoice->save();

            return $invoice->load(['items', 'store', 'collector', 'warehouse', 'sentBy', 'collections']);
        });
    }

    /**
     * Pieces to leave کۆگا for this invoice (sold + gift), keyed by product_id.
     *
     * @return array<int, int>
     */
    public function piecesToSendByProduct(): array
    {
        $piecesByProduct = [];

        foreach ($this->items as $item) {
            $conversion = max(1, (int) $item->conversion_to_piece);
            $units = (float) $item->quantity + (float) $item->gift_quantity;
            $pieces = (int) round($units * $conversion);
            if ($pieces < 1) {
                continue;
            }
            $productId = (int) $item->product_id;
            $piecesByProduct[$productId] = ($piecesByProduct[$productId] ?? 0) + $pieces;
        }

        return $piecesByProduct;
    }

    /**
     * Accountant/Admin: review sale → deduct from کۆگا → mark sent to store.
     */
    public function sendFromWarehouse(User $actor): self
    {
        if (! $actor->canAccess(\App\Enums\PagePermission::Releases)) {
            throw new InvalidArgumentException('دەسەڵاتت نییە بۆ ناردنی کاڵا لە کۆگا.');
        }

        return DB::transaction(function () use ($actor) {
            $invoice = static::query()
                ->lockForUpdate()
                ->findOrFail($this->id);

            if ($invoice->status !== InvoiceStatus::PendingSend) {
                throw new InvalidArgumentException('ئەم پسوولەیە چاوەڕێی ناردن نییە یان پێشتر نێردراوە.');
            }

            $invoice->load(['items.product', 'warehouse']);

            $warehouse = Warehouse::query()
                ->lockForUpdate()
                ->findOrFail($invoice->warehouse_id);

            if (! $warehouse->is_active) {
                throw new InvalidArgumentException('کۆگا ناچالاکە.');
            }

            $piecesByProduct = $invoice->piecesToSendByProduct();
            if ($piecesByProduct === []) {
                throw new InvalidArgumentException('هیچ کاڵایەک بۆ ناردن لەم پسوولەیەدا نییە.');
            }

            foreach ($piecesByProduct as $productId => $pieces) {
                $product = Product::query()->findOrFail($productId);
                StockInventory::removePieces($warehouse, $product, (int) $pieces);
            }

            $invoice->status = InvoiceStatus::Sent;
            $invoice->sent_at = now();
            $invoice->sent_by_id = $actor->id;
            $invoice->save();

            return $invoice->load(['items', 'store', 'collector', 'warehouse', 'sentBy']);
        });
    }

    /**
     * @param  list<array{product_unit_id: int|string, quantity?: float|int|string, gift_quantity?: float|int|string}>  $lines
     */
    public static function createSale(
        User $collector,
        Store $store,
        Warehouse $warehouse,
        InvoiceType $type,
        array $lines,
        float $discountPercent = 0,
        ?float $paidNow = null,
    ): self {
        if (! $collector->canAccess(\App\Enums\PagePermission::InvoicesSell)) {
            throw new InvalidArgumentException('دەسەڵاتت نییە بۆ فرۆشتن.');
        }

        $channel = $collector->collector_channel;
        if (! $channel instanceof CollectorChannel) {
            $channel = CollectorChannel::Wholesale;
        }

        if (! $store->is_active) {
            throw new InvalidArgumentException('فرۆشگا ناچالاکە.');
        }

        $maxDiscount = (float) ($collector->max_discount_percent ?? 0);
        $maxGift = (float) ($collector->max_gift_percent ?? 0);
        $discountPercent = round(max(0, min(100, $discountPercent)), 2);
        if ($discountPercent > $maxDiscount + 0.0001) {
            throw new InvalidArgumentException(
                'داشکاندن نابێت لە '.rtrim(rtrim(number_format($maxDiscount, 2, '.', ''), '0'), '.').'% زیاتر بێت.',
            );
        }

        $normalized = [];
        $soldUnits = 0.0;
        $giftUnits = 0.0;
        foreach ($lines as $line) {
            $unitId = (int) ($line['product_unit_id'] ?? 0);
            $qty = round((float) ($line['quantity'] ?? 0), 2);
            $giftQty = round((float) ($line['gift_quantity'] ?? 0), 2);
            if ($unitId < 1 || ($qty <= 0 && $giftQty <= 0)) {
                continue;
            }
            $sold = max(0, $qty);
            $gift = max(0, $giftQty);
            $soldUnits += $sold;
            $giftUnits += $gift;
            $normalized[] = [
                'product_unit_id' => $unitId,
                'quantity' => $sold,
                'gift_quantity' => $gift,
            ];
        }

        if ($normalized === []) {
            throw new InvalidArgumentException('لانیکەم یەک هێڵ پێویستە.');
        }

        if ($giftUnits > 0) {
            $allowedGift = $soldUnits > 0
                ? round($soldUnits * ($maxGift / 100), 2)
                : ($maxGift >= 100 ? $giftUnits : 0.0);
            if ($giftUnits > $allowedGift + 0.0001) {
                throw new InvalidArgumentException(
                    'دیاری نابێت لە '.rtrim(rtrim(number_format($maxGift, 2, '.', ''), '0'), '.').'%ی فرۆشتن زیاتر بێت.',
                );
            }
        }

        return DB::transaction(function () use ($collector, $store, $warehouse, $type, $channel, $normalized, $discountPercent, $paidNow) {
            $store = Store::query()->lockForUpdate()->findOrFail($store->id);

            $last = static::query()
                ->lockForUpdate()
                ->orderByDesc('id')
                ->value('invoice_number');

            $built = [];
            $subtotal = 0.0;

            foreach ($normalized as $line) {
                $unit = ProductUnit::query()
                    ->with('product')
                    ->findOrFail($line['product_unit_id']);

                $product = $unit->product;
                if (! $product || ! $product->is_active) {
                    throw new InvalidArgumentException('کاڵا ناچالاکە یان نەدۆزرایەوە.');
                }

                $unitPrice = (float) $unit->priceFor($channel);
                $soldQty = (float) $line['quantity'];
                $giftQty = (float) $line['gift_quantity'];
                $lineTotal = round($unitPrice * $soldQty, 2);
                $subtotal += $lineTotal;

                $built[] = [
                    'product_id' => $product->id,
                    'product_unit_id' => $unit->id,
                    'product_name' => $product->displayName(),
                    'unit' => $unit->unit->value,
                    'quantity' => $soldQty,
                    'gift_quantity' => $giftQty,
                    'is_gift' => $soldQty <= 0 && $giftQty > 0,
                    'conversion_to_piece' => $unit->conversion_to_piece,
                    'unit_price' => number_format($unitPrice, 2, '.', ''),
                    'line_total' => number_format($lineTotal, 2, '.', ''),
                ];
            }

            $subtotal = round($subtotal, 2);
            $discountAmount = round($subtotal * ($discountPercent / 100), 2);
            $total = round(max(0, $subtotal - $discountAmount), 2);

            if ($type === InvoiceType::Cash) {
                $paid = $total;
                $debt = 0.0;
            } else {
                $paid = round(max(0, min($total, (float) ($paidNow ?? 0))), 2);
                $debt = round($total - $paid, 2);
                if ($debt <= 0.0001) {
                    $paid = $total;
                    $debt = 0.0;
                    $type = InvoiceType::Cash;
                }
            }

            // Full invoice total becomes store receivable. Any cash the collector
            // takes now is held as a pending collection until accountant approval.
            $store->current_debt = number_format(
                (float) $store->current_debt + $total,
                2,
                '.',
                '',
            );
            $store->save();

            $invoice = static::query()->create([
                'invoice_number' => InvoiceNumber::next($last),
                'store_id' => $store->id,
                'warehouse_id' => $warehouse->id,
                'collector_id' => $collector->id,
                'invoice_type' => $type,
                'status' => InvoiceStatus::PendingSend,
                'channel' => $channel,
                'subtotal' => number_format($subtotal, 2, '.', ''),
                'discount_percent' => number_format($discountPercent, 2, '.', ''),
                'discount_amount' => number_format($discountAmount, 2, '.', ''),
                'total_amount' => number_format($total, 2, '.', ''),
                'paid_amount' => number_format($paid, 2, '.', ''),
                'debt_amount' => number_format($debt, 2, '.', ''),
                'currency' => 'IQD',
            ]);

            foreach ($built as $row) {
                $invoice->items()->create($row);
            }

            if ($paid > 0.0001) {
                Collection::holdFromSale($collector, $store->fresh(), $invoice, $paid);
            }

            return $invoice->load(['items', 'store', 'collector', 'warehouse', 'collections']);
        });
    }
}
