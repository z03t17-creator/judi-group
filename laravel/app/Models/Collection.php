<?php

namespace App\Models;

use App\Enums\CollectionStatus;
use App\Enums\PagePermission;
use App\Support\CollectionNumber;
use App\Support\ProfileImage;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

#[Fillable([
    'receipt_number',
    'store_id',
    'invoice_id',
    'collector_id',
    'amount',
    'currency',
    'collected_at',
    'note',
    'receipt_path',
    'status',
    'confirmed_at',
    'confirmed_by_id',
])]
class Collection extends Model
{
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'collected_at' => 'date',
            'status' => CollectionStatus::class,
            'confirmed_at' => 'datetime',
        ];
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function collector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'collector_id');
    }

    public function confirmedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by_id');
    }

    public function isPending(): bool
    {
        return $this->status === CollectionStatus::Pending;
    }

    public function isConfirmed(): bool
    {
        return $this->status === CollectionStatus::Confirmed;
    }

    public function receiptUrl(): ?string
    {
        if (! $this->receipt_path) {
            return null;
        }

        return ProfileImage::url($this->receipt_path);
    }

    /**
     * Debt still open for new receipts: current_debt minus pending (unconfirmed) collections.
     */
    public static function availableDebtForStore(Store $store): float
    {
        $debt = round((float) $store->current_debt, 2);
        $pending = round((float) static::query()
            ->where('store_id', $store->id)
            ->where('status', CollectionStatus::Pending)
            ->sum('amount'), 2);

        return max(0, round($debt - $pending, 2));
    }

    /**
     * Record a pending debt receipt. Store debt is unchanged until confirm().
     */
    public static function recordPayment(
        User $collector,
        Store $store,
        float $amount,
        ?string $collectedAt = null,
        ?string $note = null,
        ?string $receiptPath = null,
    ): self {
        if (! $collector->canAccess(PagePermission::Collections)) {
            throw new InvalidArgumentException('دەسەڵاتت نییە بۆ کۆکردنەوەی پارە.');
        }

        if (! $store->is_active) {
            throw new InvalidArgumentException('فرۆشگا ناچالاکە.');
        }

        $amount = round($amount, 2);
        if ($amount < 1) {
            throw new InvalidArgumentException('بڕ دەبێت لە سفر زیاتر بێت.');
        }

        $date = $collectedAt
            ? \Illuminate\Support\Carbon::parse($collectedAt)->toDateString()
            : now()->toDateString();

        return DB::transaction(function () use ($collector, $store, $amount, $date, $note, $receiptPath) {
            $store = Store::query()->lockForUpdate()->findOrFail($store->id);
            $available = static::availableDebtForStore($store);

            if ($available <= 0) {
                throw new InvalidArgumentException('ئەم فرۆشگایە قەرزی نییە.');
            }

            if ($amount > $available + 0.0001) {
                throw new InvalidArgumentException(
                    'بڕ نابێت لە قەرزی بەردەست زیاتر بێت ('.number_format($available, 0).').',
                );
            }

            $last = static::query()
                ->lockForUpdate()
                ->orderByDesc('id')
                ->value('receipt_number');

            $collection = static::query()->create([
                'receipt_number' => CollectionNumber::next($last),
                'store_id' => $store->id,
                'invoice_id' => null,
                'collector_id' => $collector->id,
                'amount' => number_format($amount, 2, '.', ''),
                'currency' => 'IQD',
                'collected_at' => $date,
                'note' => $note !== null && $note !== '' ? $note : null,
                'receipt_path' => $receiptPath,
                'status' => CollectionStatus::Pending,
            ]);

            return $collection->load(['store', 'collector']);
        });
    }

    /**
     * Cash taken at sale time: sits in the collector wallet until accountant confirms.
     * Caller must already have increased store.current_debt by the full invoice total.
     */
    public static function holdFromSale(
        User $collector,
        Store $store,
        Invoice $invoice,
        float $amount,
    ): self {
        $amount = round($amount, 2);
        if ($amount < 1) {
            throw new InvalidArgumentException('بڕ دەبێت لە سفر زیاتر بێت.');
        }

        $available = static::availableDebtForStore($store);
        if ($amount > $available + 0.0001) {
            throw new InvalidArgumentException(
                'بڕ نابێت لە قەرزی بەردەست زیاتر بێت ('.number_format($available, 0).').',
            );
        }

        $last = static::query()
            ->lockForUpdate()
            ->orderByDesc('id')
            ->value('receipt_number');

        $note = __('ui.collection_from_sale', [
            'invoice' => $invoice->invoice_number,
        ]);

        return static::query()->create([
            'receipt_number' => CollectionNumber::next($last),
            'store_id' => $store->id,
            'invoice_id' => $invoice->id,
            'collector_id' => $collector->id,
            'amount' => number_format($amount, 2, '.', ''),
            'currency' => 'IQD',
            'collected_at' => now()->toDateString(),
            'note' => $note,
            'receipt_path' => null,
            'status' => CollectionStatus::Pending,
        ])->load(['store', 'collector', 'invoice']);
    }

    /**
     * Accountant: confirm a pending receipt and reduce store.current_debt.
     */
    public function confirm(User $actor): self
    {
        if (! $actor->canAccess(PagePermission::ReportsReview)) {
            throw new InvalidArgumentException('دەسەڵاتت نییە بۆ پشتڕاستکردنەوەی وەرگرتن.');
        }

        return DB::transaction(function () use ($actor) {
            $collection = static::query()->lockForUpdate()->findOrFail($this->id);

            if ($collection->status !== CollectionStatus::Pending) {
                throw new InvalidArgumentException('ئەم وەرگرتنە چاوەڕێی پشتڕاستکردنەوە نییە یان پێشتر پشتڕاستکراوە.');
            }

            $store = Store::query()->lockForUpdate()->findOrFail($collection->store_id);
            $debt = round((float) $store->current_debt, 2);
            $amount = round((float) $collection->amount, 2);

            if ($amount > $debt + 0.0001) {
                throw new InvalidArgumentException(
                    'بڕ نابێت لە قەرزی ئێستا زیاتر بێت ('.number_format($debt, 0).').',
                );
            }

            $collection->status = CollectionStatus::Confirmed;
            $collection->confirmed_at = now();
            $collection->confirmed_by_id = $actor->id;
            $collection->save();

            $store->current_debt = number_format(
                max(0, round($debt - $amount, 2)),
                2,
                '.',
                '',
            );
            $store->save();

            return $collection->load(['store', 'collector', 'confirmedBy']);
        });
    }

    /**
     * Delete a collection. Confirmed rows restore store debt; pending rows do not.
     */
    public function reverseAndDelete(User $actor): void
    {
        $canReview = $actor->canAccess(PagePermission::ReportsReview);
        $owns = (int) $this->collector_id === (int) $actor->id;

        if (! $canReview && ! ($owns && $actor->canAccess(PagePermission::Collections))) {
            throw new InvalidArgumentException('دەسەڵاتت نییە بۆ سڕینەوەی ئەم وەرگرتنە.');
        }

        DB::transaction(function () {
            $collection = static::query()->lockForUpdate()->findOrFail($this->id);
            $store = Store::query()->lockForUpdate()->findOrFail($collection->store_id);

            if ($collection->status === CollectionStatus::Confirmed) {
                $store->current_debt = number_format(
                    round((float) $store->current_debt + (float) $collection->amount, 2),
                    2,
                    '.',
                    '',
                );
                $store->save();
            }

            ProfileImage::delete($collection->receipt_path);
            $collection->delete();
        });
    }
}
