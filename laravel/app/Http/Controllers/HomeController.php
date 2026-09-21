<?php

namespace App\Http\Controllers;

use App\Enums\Role;
use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\StockInventory;
use App\Models\Store;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class HomeController extends Controller
{
    public function __invoke(Request $request): View
    {
        $user = $request->user();
        $warehouse = Warehouse::primary();

        $invoiceQuery = Invoice::query();
        if ($user->isCollector()) {
            $invoiceQuery->where('collector_id', $user->id);
        }

        $stockSkuCount = 0;
        $stockPieceTotal = 0;
        if ($warehouse) {
            $stockSkuCount = StockInventory::query()
                ->where('warehouse_id', $warehouse->id)
                ->where('qty_pieces', '>', 0)
                ->count();
            $stockPieceTotal = (int) StockInventory::query()
                ->where('warehouse_id', $warehouse->id)
                ->sum('qty_pieces');
        }

        $pendingReleaseCount = 0;
        if ($user->canAccess(\App\Enums\PagePermission::Releases)) {
            $pendingReleaseCount = Invoice::query()
                ->where('status', InvoiceStatus::PendingSend)
                ->count();
        }

        $pendingCollectionCount = 0;
        if ($user->canAccess(\App\Enums\PagePermission::ReportsReview)) {
            $pendingCollectionCount = \App\Models\Collection::query()
                ->where('status', \App\Enums\CollectionStatus::Pending)
                ->count();
        }

        $pendingDeviceCount = 0;
        if ($user->canApproveDevices()) {
            $pendingDeviceCount = \App\Models\DeviceLoginRequest::query()
                ->where('status', 'pending')
                ->where('expires_at', '>', now())
                ->count();
        }

        return view('home', [
            'user' => $user,
            'warehouse' => $warehouse,
            'productCount' => Product::query()->where('is_active', true)->count(),
            'storeCount' => Store::query()->where('is_active', true)->count(),
            'collectorCount' => User::query()
                ->where('role', Role::Collector)
                ->where('is_active', true)
                ->count(),
            'invoiceCount' => $invoiceQuery->count(),
            'stockSkuCount' => $stockSkuCount,
            'stockPieceTotal' => $stockPieceTotal,
            'pendingReleaseCount' => $pendingReleaseCount,
            'pendingApprovalCount' => $pendingReleaseCount + $pendingCollectionCount + $pendingDeviceCount,
        ]);
    }
}
