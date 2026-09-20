<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePurchaseRequest;
use App\Models\Category;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Supplier;
use App\Models\Warehouse;
use App\Support\DatePeriodFilter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;
use InvalidArgumentException;

class PurchaseController extends Controller
{
    public function index(Request $request): View
    {
        [$from, $to, $period] = DatePeriodFilter::resolve($request, 'month');

        $supplierId = (int) $request->input('supplier_id', 0);
        $suppliers = Supplier::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        if ($supplierId > 0 && ! $suppliers->contains('id', $supplierId)) {
            $supplierId = 0;
        }

        $filtered = Purchase::query()
            ->when(
                $supplierId > 0,
                fn ($q) => $q->where('supplier_id', $supplierId),
            )
            ->tap(fn ($q) => DatePeriodFilter::apply($q, $from, $to, 'purchased_at', true))
            ->when($request->filled('q'), function ($query) use ($request) {
                $q = '%'.$request->string('q').'%';
                $query->where(function ($inner) use ($q) {
                    $inner->where('purchase_number', 'like', $q)
                        ->orWhereHas('supplier', function ($supplier) use ($q) {
                            $supplier->where('name', 'like', $q)
                                ->orWhere('phone', 'like', $q);
                        });
                });
            });

        $stats = [
            'count' => (clone $filtered)->count(),
            'total' => (float) (clone $filtered)->sum('total_cost'),
            'suppliers' => (int) (clone $filtered)->whereNotNull('supplier_id')->distinct()->count('supplier_id'),
        ];

        $purchases = (clone $filtered)
            ->with(['supplier', 'createdBy'])
            ->latest('id')
            ->paginate(20)
            ->withQueryString();

        return view('purchases.index', [
            'purchases' => $purchases,
            'stats' => $stats,
            'suppliers' => $suppliers,
            'supplierId' => $supplierId,
            'period' => $period,
            'from' => ($from ?? now()->startOfMonth())->toDateString(),
            'to' => ($to ?? now())->toDateString(),
            'q' => $request->string('q')->toString(),
        ]);
    }

    public function create(): View
    {
        $warehouse = Warehouse::primary();

        $suppliers = Supplier::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'phone']);

        $products = Product::query()
            ->where('is_active', true)
            ->with(['units' => fn ($q) => $q->orderBy('id')])
            ->orderBy('name')
            ->get();

        $catalog = $products->map(function (Product $product) {
            return [
                'id' => $product->id,
                'name' => $product->displayName(),
                'sku' => $product->sku,
                'image' => $product->imageUrl(),
                'category_id' => $product->category_id,
                'subcategory_id' => $product->subcategory_id,
                'units' => $product->units->map(fn ($unit) => [
                    'id' => $unit->id,
                    'unit' => $unit->unit->value,
                    'label' => $unit->unit->label(),
                    'conversion' => (int) $unit->conversion_to_piece,
                ])->values(),
            ];
        })->values();

        $tones = ['sky', 'teal', 'amber', 'violet', 'orange', 'emerald', 'cyan', 'indigo'];
        $categories = Category::query()
            ->where('is_active', true)
            ->with(['subcategories' => fn ($q) => $q->where('is_active', true)->orderBy('name')])
            ->withCount(['products' => fn ($q) => $q->where('is_active', true)])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->values()
            ->map(fn (Category $category, int $i) => [
                'id' => $category->id,
                'name' => $category->name,
                'tone' => $tones[$i % count($tones)],
                'products_count' => (int) $category->products_count,
                'subcategories' => $category->subcategories->map(fn ($sub) => [
                    'id' => $sub->id,
                    'name' => $sub->name,
                ])->values(),
            ])
            ->values();

        return view('purchases.create', [
            'warehouse' => $warehouse,
            'suppliers' => $suppliers,
            'catalog' => $catalog,
            'categories' => $categories,
        ]);
    }

    public function store(StorePurchaseRequest $request): RedirectResponse
    {
        $warehouse = Warehouse::primary();
        if (! $warehouse) {
            return back()
                ->withInput()
                ->withErrors(['purchase' => 'کۆگای سەرەکی نییە — سەرەتا FACE L0 تەواو بکە.']);
        }

        $supplier = null;
        if ($request->filled('supplier_id')) {
            $supplier = Supplier::query()->find((int) $request->input('supplier_id'));
            $typedName = trim((string) $request->input('supplier_name', ''));
            if ($supplier && $typedName !== '' && $supplier->name !== $typedName) {
                $supplier = null;
            }
        }
        if (! $supplier) {
            $supplier = Supplier::findOrCreateByName($request->input('supplier_name'));
        }

        try {
            $purchase = Purchase::receiveIntoWarehouse(
                $request->user(),
                $warehouse,
                $request->input('lines', []),
                $supplier,
                $request->input('purchased_at'),
                $request->input('notes'),
            );
        } catch (InvalidArgumentException $e) {
            return back()
                ->withInput()
                ->withErrors(['purchase' => $e->getMessage()]);
        }

        return redirect()
            ->route('purchases.show', $purchase)
            ->with('success', 'کڕین تۆمارکرا و کاڵا خرایە ناو کۆگا.');
    }

    public function show(Purchase $purchase): View
    {
        $purchase->load(['items', 'supplier', 'warehouse', 'createdBy']);

        return view('purchases.show', [
            'purchase' => $purchase,
        ]);
    }
}
