<?php

namespace App\Support;

use App\Models\Purchase;
use App\Models\StockInventory;
use App\Models\Warehouse;
use Carbon\Carbon;
use Illuminate\Support\Collection;

final class OfficeReportBuilder
{
    /**
     * Accountant/Admin warehouse snapshot + purchases in period.
     *
     * @return array{
     *   warehouse: ?Warehouse,
     *   from: string,
     *   to: string,
     *   stock_sku_count: int,
     *   stock_piece_total: int,
     *   stock_rows: Collection,
     *   purchase_count: int,
     *   purchase_total_cost: float,
     *   purchases: Collection
     * }
     */
    public static function build(Carbon $from, Carbon $to): array
    {
        $fromDay = $from->copy()->startOfDay();
        $toDay = $to->copy()->endOfDay();
        $warehouse = Warehouse::primary();

        $stockRows = collect();
        $stockSkuCount = 0;
        $stockPieceTotal = 0;

        if ($warehouse) {
            $stockRows = StockInventory::query()
                ->where('stock_inventories.warehouse_id', $warehouse->id)
                ->where('stock_inventories.qty_pieces', '>', 0)
                ->join('products', 'products.id', '=', 'stock_inventories.product_id')
                ->with(['product.units'])
                ->orderBy('products.name')
                ->select('stock_inventories.*')
                ->get();

            $stockSkuCount = $stockRows->count();
            $stockPieceTotal = (int) $stockRows->sum(fn (StockInventory $row) => (int) $row->qty_pieces);
        }

        $purchases = Purchase::query()
            ->with(['supplier', 'createdBy', 'items'])
            ->when(
                $warehouse,
                fn ($q) => $q->where('warehouse_id', $warehouse->id),
            )
            ->whereDate('purchased_at', '>=', $fromDay->toDateString())
            ->whereDate('purchased_at', '<=', $toDay->toDateString())
            ->orderByDesc('purchased_at')
            ->orderByDesc('id')
            ->get();

        return [
            'warehouse' => $warehouse,
            'from' => $fromDay->toDateString(),
            'to' => $toDay->toDateString(),
            'stock_sku_count' => $stockSkuCount,
            'stock_piece_total' => $stockPieceTotal,
            'stock_rows' => $stockRows,
            'purchase_count' => $purchases->count(),
            'purchase_total_cost' => (float) $purchases->sum(fn (Purchase $p) => (float) $p->total_cost),
            'purchases' => $purchases,
        ];
    }
}
