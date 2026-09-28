<?php

namespace App\Models;

use App\Enums\PagePermission;
use App\Enums\StoreVisitStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

#[Fillable([
    'collector_id',
    'store_id',
    'status',
    'started_at',
    'ended_at',
    'note',
])]
class StoreVisit extends Model
{
    protected function casts(): array
    {
        return [
            'status' => StoreVisitStatus::class,
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    public function collector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'collector_id');
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function rejects(): HasMany
    {
        return $this->hasMany(StoreReject::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function collections(): HasMany
    {
        return $this->hasMany(Collection::class);
    }

    public function isOpen(): bool
    {
        return $this->status === StoreVisitStatus::Open;
    }

    public function isClosed(): bool
    {
        return $this->status === StoreVisitStatus::Closed;
    }

    public static function openForCollector(User $collector): ?self
    {
        return static::query()
            ->with('store')
            ->where('collector_id', $collector->id)
            ->where('status', StoreVisitStatus::Open)
            ->latest('id')
            ->first();
    }

    public static function start(User $collector, Store $store, ?string $note = null): self
    {
        if (! $collector->canAccess(PagePermission::Stores)) {
            throw new InvalidArgumentException('دەسەڵاتت نییە بۆ سەردانی فرۆشگا.');
        }

        if (! $store->is_active) {
            throw new InvalidArgumentException('فرۆشگا ناچالاکە.');
        }

        if (static::openForCollector($collector)) {
            throw new InvalidArgumentException('سەردانێکی کراوە هەیه — سەرەتا کۆتایی پێبهێنە.');
        }

        return static::query()->create([
            'collector_id' => $collector->id,
            'store_id' => $store->id,
            'status' => StoreVisitStatus::Open,
            'started_at' => now(),
            'note' => $note,
        ]);
    }

    public function end(User $actor): self
    {
        if (! $this->isOpen()) {
            throw new InvalidArgumentException('ئەم سەردانە پێشتر کۆتایی هاتووە.');
        }

        $isOwner = (int) $this->collector_id === (int) $actor->id;
        $isOffice = $actor->isAdmin() || $actor->isAccountant();
        if (! $isOwner && ! $isOffice) {
            throw new InvalidArgumentException('دەسەڵاتت نییە بۆ کۆتایی هێنانی سەردان.');
        }

        $this->status = StoreVisitStatus::Closed;
        $this->ended_at = now();
        $this->save();

        return $this;
    }

    public function assertOwnedBy(User $actor): void
    {
        if ((int) $this->collector_id !== (int) $actor->id
            && ! $actor->isAdmin()
            && ! $actor->isAccountant()) {
            abort(403);
        }
    }

    /**
     * Attach this visit to an invoice created during the visit (best-effort).
     */
    public function attachInvoice(Invoice $invoice): void
    {
        if ((int) $invoice->store_id !== (int) $this->store_id) {
            return;
        }

        DB::table('invoices')
            ->where('id', $invoice->id)
            ->whereNull('store_visit_id')
            ->update(['store_visit_id' => $this->id]);
    }

    public function attachCollection(Collection $collection): void
    {
        if ((int) $collection->store_id !== (int) $this->store_id) {
            return;
        }

        DB::table('collections')
            ->where('id', $collection->id)
            ->whereNull('store_visit_id')
            ->update(['store_visit_id' => $this->id]);
    }
}
