<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Subcategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class CategoryController extends Controller
{
    public function index(Request $request): View
    {
        $categories = Category::query()
            ->with([
                'subcategories' => fn ($q) => $q
                    ->withCount('products')
                    ->orderBy('sort_order')
                    ->orderBy('name'),
            ])
            ->withCount('products')
            ->when($request->filled('q'), function ($query) use ($request) {
                $q = '%'.$request->string('q').'%';
                $query->where(function ($inner) use ($q) {
                    $inner->where('name', 'like', $q)
                        ->orWhereHas('subcategories', fn ($sub) => $sub->where('name', 'like', $q));
                });
            })
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return view('categories.index', [
            'categories' => $categories,
            'canManage' => $this->canManage($request),
        ]);
    }

    public function create(Request $request): View
    {
        $this->authorizeManage($request);

        return view('categories.form', [
            'category' => new Category(['sort_order' => 0, 'is_active' => true]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorizeManage($request);

        $data = $this->validateCategory($request);
        Category::query()->create($data);

        return redirect()
            ->route('categories.index')
            ->with('success', 'پۆل «'.$data['name'].'» زیادکرا.');
    }

    public function edit(Request $request, Category $category): View
    {
        $this->authorizeManage($request);

        return view('categories.form', [
            'category' => $category,
        ]);
    }

    public function update(Request $request, Category $category): RedirectResponse
    {
        $this->authorizeManage($request);

        $data = $this->validateCategory($request);
        $category->update($data);

        return redirect()
            ->route('categories.index')
            ->with('success', 'پۆل نوێکرایەوە.');
    }

    public function destroy(Request $request, Category $category): RedirectResponse
    {
        $this->authorizeManage($request);

        if ($category->products()->exists()) {
            return back()->withErrors([
                'category' => 'ناتوانیت ئەم پۆلە بسڕیتەوە — کاڵای پێوە بەستراوە.',
            ]);
        }

        $category->delete();

        return redirect()
            ->route('categories.index')
            ->with('success', 'پۆل سڕایەوە.');
    }

    public function createSubcategory(Request $request, Category $category): View
    {
        $this->authorizeManage($request);

        return view('categories.subcategory-form', [
            'category' => $category,
            'subcategory' => new Subcategory([
                'category_id' => $category->id,
                'sort_order' => 0,
                'is_active' => true,
            ]),
        ]);
    }

    public function storeSubcategory(Request $request, Category $category): RedirectResponse
    {
        $this->authorizeManage($request);

        $data = $this->validateSubcategory($request);
        $data['category_id'] = $category->id;
        Subcategory::query()->create($data);

        return redirect()
            ->route('categories.index')
            ->with('success', 'ژێرپۆل «'.$data['name'].'» زیادکرا.');
    }

    public function editSubcategory(Request $request, Subcategory $subcategory): View
    {
        $this->authorizeManage($request);
        $subcategory->load('category');

        return view('categories.subcategory-form', [
            'category' => $subcategory->category,
            'subcategory' => $subcategory,
        ]);
    }

    public function updateSubcategory(Request $request, Subcategory $subcategory): RedirectResponse
    {
        $this->authorizeManage($request);

        $data = $this->validateSubcategory($request);
        $subcategory->update($data);

        return redirect()
            ->route('categories.index')
            ->with('success', 'ژێرپۆل نوێکرایەوە.');
    }

    public function destroySubcategory(Request $request, Subcategory $subcategory): RedirectResponse
    {
        $this->authorizeManage($request);

        if ($subcategory->products()->exists()) {
            return back()->withErrors([
                'category' => 'ناتوانیت ئەم ژێرپۆلە بسڕیتەوە — کاڵای پێوە بەستراوە.',
            ]);
        }

        $subcategory->delete();

        return redirect()
            ->route('categories.index')
            ->with('success', 'ژێرپۆل سڕایەوە.');
    }

    /** @return array{name: string, sort_order: int, is_active: bool} */
    private function validateCategory(Request $request): array
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'is_active' => ['sometimes', 'boolean'],
        ], [
            'name.required' => 'ناوی پۆل پێویستە.',
        ]);

        return [
            'name' => trim($validated['name']),
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
            'is_active' => $request->boolean('is_active'),
        ];
    }

    /** @return array{name: string, sort_order: int, is_active: bool} */
    private function validateSubcategory(Request $request): array
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'is_active' => ['sometimes', 'boolean'],
        ], [
            'name.required' => 'ناوی ژێرپۆل پێویستە.',
        ]);

        return [
            'name' => trim($validated['name']),
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
            'is_active' => $request->boolean('is_active'),
        ];
    }

    private function canManage(Request $request): bool
    {
        return (bool) $request->user()?->canAccess(\App\Enums\PagePermission::CategoriesManage);
    }

    private function authorizeManage(Request $request): void
    {
        if (! $this->canManage($request)) {
            abort(403, 'دەسەڵاتت نییە بۆ ئەم بەشە.');
        }
    }
}
