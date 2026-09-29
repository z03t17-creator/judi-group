<?php

namespace App\Http\Controllers;

use App\Enums\CollectorChannel;
use App\Enums\InvoiceStatus;
use App\Enums\InvoiceType;
use App\Enums\PagePermission;
use App\Http\Requests\StoreInvoiceRequest;
use App\Models\Category;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\Store;
use App\Models\StoreVisit;
use App\Models\Warehouse;
use App\Support\CollectorReportBuilder;
use App\Support\DatePeriodFilter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;
use InvalidArgumentException;

class InvoiceController extends Controller
{
    public function index(Request $request): View
    {
        $user = $request->user();
        $canFilterCollectors = ! $user->isCollector();

        [$from, $to, $period] = DatePeriodFilter::resolve($request, 'month');

        $channel = $request->string('channel')->toString();
        if (! in_array($channel, [CollectorChannel::Wholesale->value, CollectorChannel::Retail->value], true)) {
            $channel = '';
        }

        $invoiceType = $request->string('type')->toString();
        if (! in_array($invoiceType, [InvoiceType::Cash->value, InvoiceType::Debt->value], true)) {
            $invoiceType = '';
        }

        $status = $request->string('status')->toString();
        if (! in_array($status, [InvoiceStatus::PendingSend->value, InvoiceStatus::Sent->value], true)) {
            $status = '';
        }

        $collectors = $canFilterCollectors
            ? CollectorReportBuilder::collectors($channel !== '' ? $channel : null)
            : collect();

        $selectedCollectorId = $canFilterCollectors
            ? (int) $request->input('collector_id', 0)
            : 0;

        if ($canFilterCollectors && $selectedCollectorId > 0 && ! $collectors->contains('id', $selectedCollectorId)) {
            $selectedCollectorId = 0;
        }

        $invoices = Invoice::query()
            ->with(['store', 'collector', 'items'])
            ->when(
                $user->isCollector(),
                fn ($q) => $q->where('collector_id', $user->id),
            )
            ->when(
                $canFilterCollectors && $selectedCollectorId > 0,
                fn ($q) => $q->where('collector_id', $selectedCollectorId),
            )
            ->when(
                $canFilterCollectors && $selectedCollectorId === 0 && $channel !== '',
                fn ($q) => $q->whereIn('collector_id', $collectors->pluck('id')->all() ?: [0]),
            )
            ->when(
                $invoiceType !== '',
                fn ($q) => $q->where('invoice_type', $invoiceType),
            )
            ->when(
                $status !== '',
                fn ($q) => $q->where('status', $status),
            )
            ->tap(fn ($q) => DatePeriodFilter::apply($q, $from, $to, 'created_at'))
            ->when($request->filled('q'), function ($query) use ($request) {
                $q = '%'.$request->string('q').'%';
                $query->where(function ($inner) use ($q) {
                    $inner->where('invoice_number', 'like', $q)
                        ->orWhereHas('store', function ($store) use ($q) {
                            $store->where('name', 'like', $q)
                                ->orWhere('owner_name', 'like', $q)
                                ->orWhere('phone', 'like', $q);
                        });
                });
            })
            ->latest('id')
            ->paginate(20)
            ->withQueryString();

        return view('invoices.index', [
            'invoices' => $invoices,
            'canCreate' => $this->canSell($request),
            'canFilterCollectors' => $canFilterCollectors,
            'collectors' => $collectors,
            'selectedCollectorId' => $selectedCollectorId,
            'period' => $period,
            'from' => ($from ?? now()->startOfMonth())->toDateString(),
            'to' => ($to ?? now())->toDateString(),
            'channel' => $channel,
            'invoiceType' => $invoiceType,
            'status' => $status,
            'q' => $request->string('q')->toString(),
        ]);
    }

    public function create(Request $request): View|RedirectResponse
    {
        $this->authorizeSell($request);

        $user = $request->user();
        $channel = $user->collector_channel instanceof CollectorChannel
            ? $user->collector_channel
            : CollectorChannel::Wholesale;

        $activeVisit = StoreVisit::openForCollector($user);
        $visitId = (int) $request->query('visit', 0);
        $lockedVisit = null;
        if ($visitId > 0) {
            $lockedVisit = StoreVisit::query()->with('store')->findOrFail($visitId);
            $lockedVisit->assertOwnedBy($user);
            if (! $lockedVisit->isOpen()) {
                return redirect()
                    ->route('visits.show', $lockedVisit)
                    ->withErrors(['visit' => __('ui.visit_closed_no_order')]);
            }
        } elseif ($activeVisit) {
            $lockedVisit = $activeVisit;
        }

        $stores = Store::query()
            ->where('is_active', true)
            ->when(
                $lockedVisit,
                fn ($q) => $q->where('id', $lockedVisit->store_id),
            )
            ->orderBy('name')
            ->get(['id', 'name', 'owner_name', 'phone', 'address', 'latitude', 'longitude', 'current_debt', 'credit_limit', 'image_path']);

        $mapsKey = config('services.google.maps_api_key');
        $maps = [
            'key' => is_string($mapsKey) && $mapsKey !== '' ? $mapsKey : null,
            'lat' => (float) config('services.google.maps_lat', 35.5558),
            'lng' => (float) config('services.google.maps_lng', 45.4351),
            'zoom' => (int) config('services.google.maps_zoom', 12),
        ];

        $categories = Category::query()
            ->where('is_active', true)
            ->with(['subcategories' => fn ($q) => $q->where('is_active', true)->orderBy('name')])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (Category $category) => [
                'id' => $category->id,
                'name' => $category->name,
                'subcategories' => $category->subcategories->map(fn ($sub) => [
                    'id' => $sub->id,
                    'name' => $sub->name,
                ])->values(),
            ])
            ->values();

        $products = Product::query()
            ->where('is_active', true)
            ->with(['units' => fn ($q) => $q->orderBy('id')])
            ->orderBy('name')
            ->get();

        $catalog = $products->map(function (Product $product) use ($channel) {
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
                ])->values(),
            ];
        })->values();

        return view('invoices.create', [
            'stores' => $stores,
            'catalog' => $catalog,
            'categories' => $categories,
            'channel' => $channel,
            'warehouse' => Warehouse::primary(),
            'maxDiscount' => (float) ($user->max_discount_percent ?? 0),
            'maxGift' => (float) ($user->max_gift_percent ?? 0),
            'maps' => $maps,
            'activeVisit' => $lockedVisit,
            'visitLockedStoreId' => $lockedVisit?->store_id,
        ]);
    }

    public function store(StoreInvoiceRequest $request): RedirectResponse
    {
        $this->authorizeSell($request);

        $user = $request->user();
        $store = Store::query()->findOrFail($request->integer('store_id'));
        $activeVisit = StoreVisit::openForCollector($user);

        if ($activeVisit && (int) $activeVisit->store_id !== (int) $store->id) {
            return back()->withInput()->withErrors([
                'store_id' => __('ui.visit_store_mismatch'),
            ]);
        }

        try {
            $invoice = Invoice::createSale(
                $user,
                $store,
                Warehouse::primary(),
                $request->input('lines', []),
                (float) $request->input('discount_percent', 0),
            );
        } catch (InvalidArgumentException $e) {
            return back()->withInput()->withErrors(['invoice' => $e->getMessage()]);
        }

        if ($activeVisit) {
            $activeVisit->attachInvoice($invoice);

            return redirect()
                ->route('visits.show', $activeVisit)
                ->with('success', __('ui.visit_invoice_saved', [
                    'invoice' => $invoice->invoice_number,
                    'amount' => number_format((float) $invoice->total_amount, 0),
                ]))
                ->with('last_invoice_id', $invoice->id);
        }

        return redirect()
            ->route('invoices.show', [$invoice, 'print' => 1])
            ->with('success', 'پسوولە «'.$invoice->invoice_number.'» تۆمارکرا (قەرز).')
            ->with('auto_print', 'a4');
    }

    public function show(Request $request, Invoice $invoice): View
    {
        $this->authorizeView($request, $invoice);

        $invoice->load(['items.product', 'store', 'collector', 'warehouse', 'sentBy', 'collections.store', 'collections.collector']);
        $user = $request->user();
        $saleCollection = $invoice->saleCollection();

        return view('invoices.show', [
            'invoice' => $invoice,
            'saleCollection' => $saleCollection,
            'company' => \App\Support\Brand::company(),
            'autoPrint' => $request->query('print') === 'slip'
                ? 'slip'
                : ($request->boolean('print') || session('auto_print') ? 'a4' : null),
            'autoPrintReceipt' => (bool) session('auto_print_receipt', false) && $saleCollection,
            'canRelease' => (bool) $user?->canAccess(PagePermission::Releases)
                && $invoice->isPendingSend(),
            'canCancel' => $user && $invoice->userCanCancel($user),
            'backUrl' => $this->invoiceBackUrl($request, $invoice),
            'backLabel' => $this->invoiceBackLabel($request, $invoice),
        ]);
    }

    private function invoiceBackUrl(Request $request, Invoice $invoice): string
    {
        if ($invoice->store_visit_id) {
            return route('visits.show', $invoice->store_visit_id);
        }

        $user = $request->user();
        if ($user) {
            $openVisit = StoreVisit::openForCollector($user);
            if ($openVisit && (int) $openVisit->store_id === (int) $invoice->store_id) {
                return route('visits.show', $openVisit);
            }
        }

        return route('invoices.index');
    }

    private function invoiceBackLabel(Request $request, Invoice $invoice): string
    {
        if ($invoice->store_visit_id) {
            return __('ui.visit_hub');
        }

        $user = $request->user();
        if ($user) {
            $openVisit = StoreVisit::openForCollector($user);
            if ($openVisit && (int) $openVisit->store_id === (int) $invoice->store_id) {
                return __('ui.visit_hub');
            }
        }

        return __('ui.back');
    }

    public function cancel(Request $request, Invoice $invoice): RedirectResponse
    {
        $this->authorizeView($request, $invoice);

        try {
            $invoice->cancel($request->user());
        } catch (InvalidArgumentException $e) {
            return back()->withErrors(['invoice' => $e->getMessage()]);
        }

        return redirect()
            ->route('invoices.show', $invoice)
            ->with('success', __('ui.invoice_cancelled'));
    }

    private function canSell(Request $request): bool
    {
        return (bool) $request->user()?->canAccess(PagePermission::InvoicesSell);
    }

    private function authorizeSell(Request $request): void
    {
        if (! $this->canSell($request)) {
            abort(403);
        }
    }

    private function authorizeView(Request $request, Invoice $invoice): void
    {
        $user = $request->user();
        if (! $user?->canAccess(PagePermission::Invoices) && ! $user?->canAccess(PagePermission::InvoicesSell)) {
            abort(403);
        }
        if ($user->isCollector() && (int) $invoice->collector_id !== (int) $user->id) {
            abort(403);
        }
    }
}
