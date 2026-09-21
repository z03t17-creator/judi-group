<?php

namespace App\Support;

use App\Enums\CollectorChannel;
use App\Enums\InvoiceType;
use App\Enums\Role;
use App\Models\Collection as DebtCollection;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;

final class CollectorReportBuilder
{
    /**
     * @param  list<int>|Collection<int, int|User>  $collectors
     * @return array{
     *   collector: ?User,
     *   collectors: Collection,
     *   title: string,
     *   from: string,
     *   to: string,
     *   invoice_count: int,
     *   stores_visited: int,
     *   cash_count: int,
     *   debt_count: int,
     *   sales_total: float,
     *   cash_total: float,
     *   debt_total: float,
     *   paid_total: float,
     *   discount_total: float,
     *   discount_avg_percent: float,
     *   discount_max_used_percent: float,
     *   discount_limit_percent: float,
     *   sold_units: float,
     *   gift_units: float,
     *   gift_pct_of_sold: float,
     *   gift_limit_percent: float,
     *   expense_count: int,
     *   expense_total: float,
     *   collection_count: int,
     *   collection_total: float,
     *   pending_collection_total: float,
     *   net_cash: float,
     *   stores: Collection,
     *   expenses: Collection,
     *   collections: Collection,
     *   invoices: Collection
     * }
     */
    public static function build(
        User|iterable $collectors,
        Carbon $from,
        Carbon $to,
        ?string $invoiceType = null,
        ?int $storeId = null,
    ): array {
        $list = self::normalizeCollectors($collectors);
        $ids = $list->pluck('id')->all();

        $fromDay = $from->copy()->startOfDay();
        $toDay = $to->copy()->endOfDay();

        $invoices = Invoice::query()
            ->with(['store', 'items', 'collector'])
            ->whereIn('collector_id', $ids ?: [0])
            ->whereBetween('created_at', [$fromDay, $toDay])
            ->when(
                $invoiceType === InvoiceType::Cash->value || $invoiceType === InvoiceType::Debt->value,
                fn ($q) => $q->where('invoice_type', $invoiceType),
            )
            ->when($storeId && $storeId > 0, fn ($q) => $q->where('store_id', $storeId))
            ->orderByDesc('id')
            ->get();

        $expenses = Expense::query()
            ->with('collector')
            ->whereIn('collector_id', $ids ?: [0])
            ->whereDate('spent_at', '>=', $fromDay->toDateString())
            ->whereDate('spent_at', '<=', $toDay->toDateString())
            ->orderByDesc('spent_at')
            ->orderByDesc('id')
            ->get();

        $collections = DebtCollection::query()
            ->with(['store', 'collector'])
            ->whereIn('collector_id', $ids ?: [0])
            ->whereDate('collected_at', '>=', $fromDay->toDateString())
            ->whereDate('collected_at', '<=', $toDay->toDateString())
            ->when($storeId && $storeId > 0, fn ($q) => $q->where('store_id', $storeId))
            ->orderByDesc('collected_at')
            ->orderByDesc('id')
            ->get();

        $cash = $invoices->where('invoice_type', InvoiceType::Cash);
        $debt = $invoices->where('invoice_type', InvoiceType::Debt);

        $salesTotal = (float) $invoices->sum(fn (Invoice $i) => (float) $i->total_amount);
        $cashTotal = (float) $invoices->sum(fn (Invoice $i) => (float) $i->paid_amount);
        $debtTotal = (float) $debt->sum(fn (Invoice $i) => (float) $i->debt_amount);
        $paidTotal = $cashTotal;
        $discountTotal = (float) $invoices->sum(fn (Invoice $i) => (float) $i->discount_amount);
        $soldUnits = (float) $invoices->sum(
            fn (Invoice $i) => (float) $i->items->sum(fn ($line) => (float) $line->quantity),
        );
        $giftUnits = (float) $invoices->sum(
            fn (Invoice $i) => (float) $i->items->sum(fn ($line) => (float) $line->gift_quantity),
        );
        $giftPctOfSold = $soldUnits > 0
            ? round(($giftUnits / $soldUnits) * 100, 2)
            : ($giftUnits > 0 ? 100.0 : 0.0);
        $discountAvgPercent = $invoices->isEmpty()
            ? 0.0
            : round((float) $invoices->avg(fn (Invoice $i) => (float) $i->discount_percent), 2);
        $discountMaxUsed = $invoices->isEmpty()
            ? 0.0
            : round((float) $invoices->max(fn (Invoice $i) => (float) $i->discount_percent), 2);
        $discountLimit = $list->isEmpty()
            ? 0.0
            : round((float) $list->max(fn (User $u) => (float) ($u->max_discount_percent ?? 0)), 2);
        $giftLimit = $list->isEmpty()
            ? 0.0
            : round((float) $list->max(fn (User $u) => (float) ($u->max_gift_percent ?? 0)), 2);
        $expenseTotal = (float) $expenses->sum(fn (Expense $e) => (float) $e->amount);

        // Only confirmed receipts count toward debt collected / company net cash.
        // Invoice paid_now sits in the collector wallet as a pending collection until
        // the accountant confirms — do not treat it as company cash early.
        $confirmedCollections = $collections->filter(
            fn (DebtCollection $c) => $c->isConfirmed(),
        );
        $collectionTotal = (float) $confirmedCollections->sum(fn (DebtCollection $c) => (float) $c->amount);
        $pendingCollectionTotal = (float) $collections
            ->filter(fn (DebtCollection $c) => $c->isPending())
            ->sum(fn (DebtCollection $c) => (float) $c->amount);

        $stores = $invoices
            ->groupBy('store_id')
            ->map(function (Collection $rows) use ($confirmedCollections) {
                $first = $rows->first();
                $storeId = (int) $first->store_id;
                $collected = (float) $confirmedCollections
                    ->where('store_id', $storeId)
                    ->sum(fn (DebtCollection $c) => (float) $c->amount);

                return [
                    'store' => $first->store,
                    'invoice_count' => $rows->count(),
                    'sales_total' => (float) $rows->sum(fn (Invoice $i) => (float) $i->total_amount),
                    'cash_total' => (float) $rows->sum(fn (Invoice $i) => (float) $i->paid_amount),
                    'debt_total' => (float) $rows->sum(fn (Invoice $i) => (float) $i->debt_amount),
                    'collected_total' => $collected,
                ];
            })
            ->sortByDesc('invoice_count')
            ->values();

        // Stores that only paid debt (no sales in period) still appear for collections.
        $salesStoreIds = $stores->map(fn (array $row) => (int) ($row['store']?->id ?? 0))->all();
        foreach ($confirmedCollections->groupBy('store_id') as $storeId => $rows) {
            if (in_array((int) $storeId, $salesStoreIds, true)) {
                continue;
            }
            $first = $rows->first();
            $stores->push([
                'store' => $first->store,
                'invoice_count' => 0,
                'sales_total' => 0.0,
                'cash_total' => 0.0,
                'debt_total' => 0.0,
                'collected_total' => (float) $rows->sum(fn (DebtCollection $c) => (float) $c->amount),
            ]);
        }

        $single = $list->count() === 1 ? $list->first() : null;

        return [
            'collector' => $single,
            'collectors' => $list,
            'title' => $single
                ? trim($single->name.($single->collector_channel ? ' · '.$single->collector_channel->mandubLabel() : ''))
                : ($list->isEmpty() ? '—' : __('ui.report_all_selected')),
            'from' => $fromDay->toDateString(),
            'to' => $toDay->toDateString(),
            'invoice_count' => $invoices->count(),
            'stores_visited' => $stores->count(),
            'cash_count' => $cash->count(),
            'debt_count' => $debt->count(),
            'sales_total' => $salesTotal,
            'cash_total' => $cashTotal,
            'debt_total' => $debtTotal,
            'paid_total' => $paidTotal,
            'discount_total' => $discountTotal,
            'discount_avg_percent' => $discountAvgPercent,
            'discount_max_used_percent' => $discountMaxUsed,
            'discount_limit_percent' => $discountLimit,
            'sold_units' => $soldUnits,
            'gift_units' => $giftUnits,
            'gift_pct_of_sold' => $giftPctOfSold,
            'gift_limit_percent' => $giftLimit,
            'expense_count' => $expenses->count(),
            'expense_total' => $expenseTotal,
            'collection_count' => $confirmedCollections->count(),
            'collection_total' => $collectionTotal,
            'pending_collection_total' => $pendingCollectionTotal,
            'net_cash' => $collectionTotal - $expenseTotal,
            'stores' => $stores,
            'expenses' => $expenses,
            // Full list (pending + confirmed) so pending rows can show with a badge.
            'collections' => $collections,
            'invoices' => $invoices,
        ];
    }

    /**
     * @return Collection<int, User>
     */
    public static function collectors(?string $channel = null): Collection
    {
        return User::query()
            ->where('role', Role::Collector)
            ->where('is_active', true)
            ->when(
                $channel === CollectorChannel::Wholesale->value
                    || $channel === CollectorChannel::Retail->value,
                fn ($q) => $q->where('collector_channel', $channel),
            )
            ->orderBy('name')
            ->get();
    }

    /**
     * @param  User|iterable<int, User|int>  $collectors
     * @return Collection<int, User>
     */
    private static function normalizeCollectors(User|iterable $collectors): Collection
    {
        if ($collectors instanceof User) {
            return collect([$collectors]);
        }

        $items = collect($collectors)->filter()->values();
        if ($items->isEmpty()) {
            return collect();
        }

        if ($items->first() instanceof User) {
            return $items->unique('id')->values();
        }

        return User::query()
            ->whereIn('id', $items->map(fn ($id) => (int) $id)->all())
            ->get();
    }
}
