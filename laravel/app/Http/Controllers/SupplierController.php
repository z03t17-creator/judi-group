<?php

namespace App\Http\Controllers;

use App\Http\Requests\SupplierRequest;
use App\Models\Supplier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class SupplierController extends Controller
{
    public function index(Request $request): View
    {
        $filtered = Supplier::query()
            ->when($request->filled('q'), function ($query) use ($request) {
                $q = '%'.$request->string('q').'%';
                $query->where(function ($inner) use ($q) {
                    $inner->where('name', 'like', $q)
                        ->orWhere('phone', 'like', $q);
                });
            });

        $stats = [
            'count' => (clone $filtered)->count(),
            'active' => (clone $filtered)->where('is_active', true)->count(),
            'inactive' => (clone $filtered)->where('is_active', false)->count(),
        ];

        $suppliers = (clone $filtered)
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        return view('suppliers.index', [
            'suppliers' => $suppliers,
            'stats' => $stats,
        ]);
    }

    public function create(): View
    {
        return view('suppliers.form', [
            'supplier' => new Supplier(['is_active' => true]),
        ]);
    }

    public function store(SupplierRequest $request): RedirectResponse
    {
        $supplier = Supplier::query()->create($request->validated());

        return redirect()
            ->route('suppliers.index')
            ->with('success', 'دابینکەر «'.$supplier->name.'» زیادکرا.');
    }

    public function edit(Supplier $supplier): View
    {
        return view('suppliers.form', [
            'supplier' => $supplier,
        ]);
    }

    public function update(SupplierRequest $request, Supplier $supplier): RedirectResponse
    {
        $supplier->update($request->validated());

        return redirect()
            ->route('suppliers.index')
            ->with('success', 'دابینکەر نوێکرایەوە.');
    }

    public function destroy(Supplier $supplier): RedirectResponse
    {
        $supplier->delete();

        return redirect()
            ->route('suppliers.index')
            ->with('success', 'دابینکەر سڕایەوە.');
    }
}
