<?php

namespace App\Http\Controllers;

use App\Enums\ProductUnitKind;
use App\Http\Requests\ProductRequest;
use App\Models\Category;
use App\Models\Product;
use App\Support\ProfileImage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ProductController extends Controller
{
    public function index(Request $request): View
    {
        $categoryId = $request->integer('category_id') ?: null;
        $subcategoryId = $request->integer('subcategory_id') ?: null;
        $canManage = $this->canManage($request);

        $categories = Category::query()
            ->where('is_active', true)
            ->withCount('products')
            ->with(['subcategories' => fn ($q) => $q->where('is_active', true)->withCount('products')])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

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
            'unitKinds' => ProductUnitKind::ordered(),
            'categories' => $categories,
            'selectedCategory' => $selectedCategory,
            'selectedSubcategory' => $selectedSubcategory,
        ]);
    }

    public function create(Request $request): View
    {
        $this->authorizeManage($request);

        return view('products.form', [
            'product' => new Product([
                'pieces_per_packet' => 6,
                'pieces_per_carton' => 24,
                'is_active' => true,
            ]),
            'unitKinds' => ProductUnitKind::ordered(),
            'prices' => $this->emptyPrices(),
            'categories' => $this->categoryOptions(),
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
