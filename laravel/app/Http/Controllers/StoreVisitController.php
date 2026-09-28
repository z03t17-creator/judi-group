<?php

namespace App\Http\Controllers;

use App\Enums\CollectorChannel;
use App\Enums\PagePermission;
use App\Http\Requests\StartStoreVisitRequest;
use App\Http\Requests\StoreRejectRequest;
use App\Models\Category;
use App\Models\Product;
use App\Models\Store;
use App\Models\StoreReject;
use App\Models\StoreVisit;
use App\Models\Warehouse;
use App\Support\CollectorReportBuilder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;
use InvalidArgumentException;

class StoreVisitController extends Controller
{
    public function entry(Request $request): RedirectResponse
    {
        $this->authorizeVisit($request);

        $open = StoreVisit::openForCollector($request->user());
        if ($open) {
            return redirect()->route('visits.show', $open);
        }

        return redirect()->route('visits.create');
    }

    public function create(Request $request): View|RedirectResponse
    {
        $this->authorizeVisit($request);

        $open = StoreVisit::openForCollector($request->user());
        if ($open) {
            return redirect()->route('visits.show', $open);
        }

        $stores = Store::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'owner_name', 'phone', 'address', 'current_debt', 'image_path']);

        $preselect = (int) $request->query('store_id', 0);

        return view('visits.create', [
            'stores' => $stores,
            'preselectStoreId' => $preselect > 0 ? $preselect : (int) old('store_id', 0),
        ]);
    }

    public function store(StartStoreVisitRequest $request): RedirectResponse
    {
        $store = Store::query()->findOrFail($request->integer('store_id'));

        try {
            $visit = StoreVisit::start(
                $request->user(),
                $store,
                $request->input('note'),
            );
        } catch (InvalidArgumentException $e) {
            return back()->withInput()->withErrors(['store_id' => $e->getMessage()]);
        }

        return redirect()
            ->route('visits.show', $visit)
            ->with('success', __('ui.visit_started', ['store' => $store->name]));
    }

    public function show(Request $request, StoreVisit $visit): View
    {
        $this->authorizeVisit($request);
        $visit->assertOwnedBy($request->user());
        $visit->load(['store', 'rejects.items', 'invoices', 'collections']);

        $store = $visit->store;
        $invoiceCount = $visit->invoices->count();
        $collectionTotal = (float) $visit->collections->sum(fn ($c) => (float) $c->amount);
        $rejectCredit = (float) $visit->rejects->sum(fn ($r) => (float) $r->credit_amount);

        return view('visits.show', [
            'visit' => $visit,
            'store' => $store,
            'stats' => [
                'invoices' => $invoiceCount,
                'collections' => $collectionTotal,
                'rejects' => $rejectCredit,
            ],
            'canOrder' => $request->user()->canAccess(PagePermission::InvoicesSell),
            'canCollect' => $request->user()->canAccess(PagePermission::Collections),
            'canReject' => $request->user()->canAccess(PagePermission::InvoicesSell)
                || $request->user()->canAccess(PagePermission::Collections),
            'canReport' => $request->user()->canAccess(PagePermission::Reports)
                || $request->user()->canAccess(PagePermission::ReportsReview),
        ]);
    }

    public function end(Request $request, StoreVisit $visit): RedirectResponse
    {
        $this->authorizeVisit($request);
        $visit->assertOwnedBy($request->user());

        try {
            $visit->end($request->user());
        } catch (InvalidArgumentException $e) {
            return back()->withErrors(['visit' => $e->getMessage()]);
        }

        return redirect()
            ->route('stores.show', $visit->store_id)
            ->with('success', __('ui.visit_ended'));
    }

    public function report(Request $request, StoreVisit $visit): View
    {
        $this->authorizeVisit($request);
        $visit->assertOwnedBy($request->user());
        $visit->load(['store', 'invoices.items', 'collections', 'rejects.items']);

        $user = $request->user();
        $from = $visit->started_at->copy()->startOfDay();
        $to = ($visit->ended_at ?? now())->copy()->endOfDay();

        $report = null;
        if ($user->canAccess(PagePermission::Reports) || $user->canAccess(PagePermission::ReportsReview)) {
            $report = CollectorReportBuilder::build(
                collect([$user->isCollector() ? $user : $visit->collector()->first()]),
                $from,
                $to,
                null,
                (int) $visit->store_id,
            );
        }

        return view('visits.report', [
            'visit' => $visit,
            'store' => $visit->store,
            'report' => $report,
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
        ]);
    }

    public function rejectCreate(Request $request, StoreVisit $visit): View|RedirectResponse
    {
        $this->authorizeReject($request);
        $visit->assertOwnedBy($request->user());

        if (! $visit->isOpen()) {
            return redirect()
                ->route('visits.show', $visit)
                ->withErrors(['visit' => __('ui.visit_closed_no_reject')]);
        }

        $user = $request->user();
        $channel = $user->collector_channel instanceof CollectorChannel
            ? $user->collector_channel
            : CollectorChannel::Wholesale;

        $categories = Category::query()
            ->where('is_active', true)
            ->with(['subcategories' => fn ($q) => $q->where('is_active', true)->orderBy('name')])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (Category $cat) => [
                'id' => $cat->id,
                'name' => $cat->name,
                'subcategories' => $cat->subcategories->map(fn ($sub) => [
                    'id' => $sub->id,
                    'name' => $sub->name,
                ])->values(),
            ]);

        $catalog = Product::query()
            ->with(['units' => fn ($q) => $q->orderBy('id')])
            ->where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(function (Product $product) use ($channel) {
                return [
                    'id' => $product->id,
                    'name' => $product->displayName(),
                    'sku' => $product->sku,
                    'barcode' => $product->barcode,
                    'image' => $product->imageUrl(),
                    'category_id' => $product->category_id,
                    'subcategory_id' => $product->subcategory_id,
                    'units' => $product->units->map(fn ($unit) => [
                        'id' => $unit->id,
                        'unit' => $unit->unit->value,
                        'label' => $unit->unit->label(),
                        'barcode' => $unit->barcode,
                        'price' => (float) $unit->priceFor($channel),
                        'conversion' => (int) $unit->conversion_to_piece,
                    ])->values(),
                ];
            })->values();

        return view('visits.reject', [
            'visit' => $visit,
            'store' => $visit->store,
            'catalog' => $catalog,
            'categories' => $categories,
            'warehouse' => Warehouse::primary(),
        ]);
    }

    public function rejectStore(StoreRejectRequest $request, StoreVisit $visit): RedirectResponse
    {
        $this->authorizeReject($request);
        $visit->assertOwnedBy($request->user());

        try {
            $reject = StoreReject::recordReturn(
                $visit,
                $request->user(),
                $request->input('lines', []),
                $request->input('note'),
            );
        } catch (InvalidArgumentException $e) {
            return back()->withInput()->withErrors(['reject' => $e->getMessage()]);
        }

        return redirect()
            ->route('visits.show', $visit)
            ->with('success', __('ui.reject_saved', [
                'amount' => number_format((float) $reject->credit_amount, 0),
            ]));
    }

    private function authorizeVisit(Request $request): void
    {
        if (! $request->user()?->canAccess(PagePermission::Stores)) {
            abort(403);
        }
    }

    private function authorizeReject(Request $request): void
    {
        $user = $request->user();
        if (! $user?->canAccess(PagePermission::InvoicesSell)
            && ! $user?->canAccess(PagePermission::Collections)) {
            abort(403);
        }
    }
}
