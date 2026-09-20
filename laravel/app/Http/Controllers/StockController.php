<?php

namespace App\Http\Controllers;

use App\Models\StockInventory;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\View\View;

class StockController extends Controller
{
    public function index(Request $request): View
    {
        $warehouse = Warehouse::primary();

        if (! $warehouse) {
            return view('stock.index', [
                'warehouse' => null,
                'rows' => new LengthAwarePaginator([], 0, 30),
                'stats' => [
                    'sku_count' => 0,
                    'piece_total' => 0,
                ],
                'stockTotals' => [
                    'pieces' => 0,
                    'carton' => 0,
                    'packet' => 0,
                    'piece' => 0,
                ],
            ]);
        }

        $filtered = StockInventory::query()
            ->where('stock_inventories.warehouse_id', $warehouse->id)
            ->join('products', 'products.id', '=', 'stock_inventories.product_id')
            ->when($request->filled('q'), function ($query) use ($request) {
                $q = '%'.$request->string('q').'%';
                $query->where(function ($inner) use ($q) {
                    $inner->where('products.name', 'like', $q)
                        ->orWhere('products.sku', 'like', $q)
                        ->orWhere('products.barcode', 'like', $q)
                        ->orWhere('products.pack_spec', 'like', $q);
                });
            })
            ->where('stock_inventories.qty_pieces', '>', 0);

        $stats = [
            'sku_count' => (clone $filtered)->count(),
            'piece_total' => (int) (clone $filtered)->sum('stock_inventories.qty_pieces'),
        ];

        $rows = (clone $filtered)
            ->with(['product.units'])
            ->orderBy('products.name')
            ->select('stock_inventories.*')
            ->paginate(30)
            ->withQueryString();

        $stockTotals = ['pieces' => 0, 'carton' => 0, 'packet' => 0, 'piece' => 0];
        foreach ($rows as $row) {
            $breakdown = $row->breakdown();
            $stockTotals['pieces'] += (int) $row->qty_pieces;
            $stockTotals['carton'] += (int) $breakdown['carton'];
            $stockTotals['packet'] += (int) $breakdown['packet'];
            $stockTotals['piece'] += (int) $breakdown['piece'];
        }

        return view('stock.index', [
            'warehouse' => $warehouse,
            'rows' => $rows,
            'stats' => $stats,
            'stockTotals' => $stockTotals,
        ]);
    }
}
