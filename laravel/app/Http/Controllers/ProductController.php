<?php

namespace App\Http\Controllers;

use App\Enums\ProductUnitKind;
use App\Http\Requests\ProductRequest;
use App\Models\Category;
use App\Models\Product;
use App\Models\StockInventory;
use App\Models\Warehouse;
use App\Support\ProfileImage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\View\View;

class ProductController extends Controller
{
    public function index(Request $request): View
    {
        $categoryId = $request->integer('category_id') ?: null;
        $subcategoryId = $request->integer('subcategory_id') ?: null;
        $canManage = $this->canManage($request);
        $canManageCategories = (bool) $request->user()?->canAccess(\App\Enums\PagePermission::CategoriesManage);

        $stockByProduct = $this->stockPiecesByProduct();

        $categories = Category::query()
            ->where('is_active', true)
            ->withCount('products')
            ->with(['subcategories' => fn ($q) => $q->where('is_active', true)->withCount('products')])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $categoryStock = $this->categoryStockTotals($categories, $stockByProduct);

        $selectedCategory = $categoryId
            ? $categories->firstWhere('id', $categoryId)
            : null;

        $selectedSubcategory = null;
        if ($selectedCategory && $subcategoryId) {
            $selectedSubcategory = $selectedCategory->subcategories->firstWhere('id', $subcategoryId);
            if (! $selectedSubcategory) {
                $subcategoryId = null;
            }
        }

        // Step 1: pick a category first (unless searching globally).
        if (! $categoryId && ! $request->filled('q')) {
            return view('products.browse', [
                'categories' => $categories,
                'canManage' => $canManage,
                'canManageCategories' => $canManageCategories,
                'categoryStock' => $categoryStock,
            ]);
        }

        $products = Product::query()
            ->with(['units', 'category', 'subcategory'])
            ->when($categoryId, fn ($q) => $q->where('category_id', $categoryId))
            ->when($subcategoryId, fn ($q) => $q->where('subcategory_id', $subcategoryId))
            ->when($request->filled('q'), function ($query) use ($request) {
                $q = '%'.$request->string('q').'%';
                $query->where(function ($inner) use ($q) {
                    $inner->where('name', 'like', $q)
                        ->orWhere('sku', 'like', $q)
                        ->orWhere('barcode', 'like', $q)
                        ->orWhere('pack_spec', 'like', $q);
                });
            })
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        return view('products.index', [
            'products' => $products,
            'canManage' => $canManage,
            'canManageCategories' => $canManageCategories,
            'unitKinds' => ProductUnitKind::ordered(),
            'categories' => $categories,
            'selectedCategory' => $selectedCategory,
            'selectedSubcategory' => $selectedSubcategory,
            'stockByProduct' => $stockByProduct,
        ]);
    }

    /**
     * @return Collection<int, int> product_id => qty_pieces
     */
    private function stockPiecesByProduct(): Collection
    {
        $warehouse = Warehouse::primary();
        if (! $warehouse) {
            return collect();
        }

        return StockInventory::query()
            ->where('warehouse_id', $warehouse->id)
            ->pluck('qty_pieces', 'product_id')
            ->map(fn ($qty) => (int) $qty);
    }

    /**
     * @param  Collection<int, Category>  $categories
     * @param  Collection<int, int>  $stockByProduct
     * @return array<int, int> category_id => total pieces
     */
    private function categoryStockTotals(Collection $categories, Collection $stockByProduct): array
    {
        if ($categories->isEmpty() || $stockByProduct->isEmpty()) {
            return [];
        }

        $productCategories = Product::query()
            ->whereIn('category_id', $categories->pluck('id'))
            ->pluck('category_id', 'id');

        $totals = [];
        foreach ($productCategories as $productId => $categoryId) {
            $pieces = (int) $stockByProduct->get($productId, 0);
            if ($pieces < 1) {
                continue;
            }
            $totals[(int) $categoryId] = ($totals[(int) $categoryId] ?? 0) + $pieces;
        }

        return $totals;
    }

    public function create(Request $request): View
    {
        $this->authorizeManage($request);

        $barcode = trim((string) $request->query('barcode', ''));

        return view('products.form', [
            'product' => new Product([
                'barcode' => $barcode !== '' ? $barcode : null,
                'pieces_per_packet' => 6,
                'pieces_per_carton' => 24,
                'is_active' => true,
            ]),
            'unitKinds' => ProductUnitKind::ordered(),
            'prices' => $this->emptyPrices(),
            'categories' => $this->categoryOptions(),
        ]);
    }

    public function lookupBarcode(Request $request)
    {
        $barcode = trim((string) $request->query('barcode', ''));
        if ($barcode === '') {
            return response()->json([
                'found' => false,
                'barcode' => '',
            ]);
        }

        $product = Product::query()
            ->where('barcode', $barcode)
            ->first();

        if (! $product) {
            return response()->json([
                'found' => false,
                'barcode' => $barcode,
                'create_url' => $request->user()?->canAccess(\App\Enums\PagePermission::ProductsManage)
                    ? route('products.create', ['barcode' => $barcode])
                    : null,
            ]);
        }

        $canManage = (bool) $request->user()?->canAccess(\App\Enums\PagePermission::ProductsManage);

        return response()->json([
            'found' => true,
            'id' => $product->id,
            'name' => $product->name,
            'sku' => $product->sku,
            'barcode' => $product->barcode,
            'view_url' => route('products.index', ['q' => $product->barcode]),
            'edit_url' => $canManage ? route('products.edit', $product) : null,
        ]);
    }

    public function store(ProductRequest $request): RedirectResponse
    {
        $data = $request->productData();
        if ($request->hasFile('image')) {
            $data['image_path'] = ProfileImage::store($request->file('image'), 'products');
        }

        $product = Product::createWithUnits($data);

        return redirect()
            ->route('products.index')
            ->with('success', 'کاڵا «'.$product->displayName().'» زیادکرا.');
    }

    public function edit(Request $request, Product $product): View
    {
        $this->authorizeManage($request);
        $product->load('units');

        return view('products.form', [
            'product' => $product,
            'unitKinds' => ProductUnitKind::ordered(),
            'prices' => $this->pricesFromProduct($product),
            'categories' => $this->categoryOptions(),
        ]);
    }

    public function update(ProductRequest $request, Product $product): RedirectResponse
    {
        $data = $request->productData();
        if ($request->hasFile('image')) {
            ProfileImage::delete($product->image_path);
            $data['image_path'] = ProfileImage::store($request->file('image'), 'products');
        }

        $product->updateWithUnits($data);

        return redirect()
            ->route('products.index')
            ->with('success', 'کاڵا نوێکرایەوە.');
    }

    public function destroy(Request $request, Product $product): RedirectResponse
    {
        $this->authorizeManage($request);
        $product->delete();

        return redirect()
            ->route('products.index')
            ->with('success', 'کاڵا سڕایەوە.');
    }

    private function canManage(Request $request): bool
    {
        return (bool) $request->user()?->canAccess(\App\Enums\PagePermission::ProductsManage);
    }

    private function authorizeManage(Request $request): void
    {
        if (! $this->canManage($request)) {
            abort(403, 'دەسەڵاتت نییە بۆ ئەم بەشە.');
        }
    }

    /** @return array<string, array{wholesale: string, retail: string, barcode: string}> */
    private function emptyPrices(): array
    {
        $prices = [];
        foreach (ProductUnitKind::ordered() as $kind) {
            $prices[$kind->value] = ['wholesale' => '0', 'retail' => '0', 'barcode' => ''];
        }

        return $prices;
    }

    /** @return array<string, array{wholesale: string, retail: string, barcode: string}> */
    private function pricesFromProduct(Product $product): array
    {
        $prices = $this->emptyPrices();

        foreach ($product->units as $unit) {
            $key = $unit->unit->value;
            $prices[$key] = [
                'wholesale' => (string) $unit->price_wholesale,
                'retail' => (string) $unit->price_retail,
                'barcode' => (string) ($unit->barcode ?? ''),
            ];
        }

        // Carton identity is the product barcode.
        if (($product->barcode ?? '') !== '') {
            $prices[ProductUnitKind::Carton->value]['barcode'] = (string) $product->barcode;
        }

        return $prices;
    }

    private function categoryOptions()
    {
        return Category::query()
            ->where('is_active', true)
            ->with(['subcategories' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order')->orderBy('name')])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();
    }
}
