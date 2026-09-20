<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreRequest;
use App\Models\Store;
use App\Support\DatePeriodFilter;
use App\Support\ProfileImage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class StoreController extends Controller
{
    public function index(Request $request): View
    {
        $stores = Store::query()
            ->when($request->filled('q'), function ($query) use ($request) {
                $q = '%'.$request->string('q').'%';
                $query->where(function ($inner) use ($q) {
                    $inner->where('name', 'like', $q)
                        ->orWhere('owner_name', 'like', $q)
                        ->orWhere('phone', 'like', $q)
                        ->orWhere('address', 'like', $q);
                });
            })
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        return view('stores.index', [
            'stores' => $stores,
            'canManage' => $this->canManage($request),
        ]);
    }

    public function show(Request $request, Store $store): View
    {
        [$from, $to, $period] = DatePeriodFilter::resolve($request, 'all');

        $recentInvoices = $store->invoices()
            ->tap(fn ($q) => DatePeriodFilter::apply($q, $from, $to, 'created_at'))
            ->latest('id')
            ->paginate(20)
            ->withQueryString();

        return view('stores.show', [
            'store' => $store,
            'canManage' => $this->canManage($request),
            'maps' => $this->mapsConfig(),
            'recentInvoices' => $recentInvoices,
            'googleMapsUrl' => $store->googleMapsUrl(),
            'period' => $period,
            'from' => ($from ?? now()->startOfMonth())->toDateString(),
            'to' => ($to ?? now())->toDateString(),
        ]);
    }

    public function create(Request $request): View
    {
        $this->authorizeManage($request);

        return view('stores.form', [
            'store' => new Store([
                'credit_limit' => 0,
                'is_active' => true,
            ]),
            'maps' => $this->mapsConfig(),
        ]);
    }

    public function store(StoreRequest $request): RedirectResponse
    {
        $data = $request->safe()->except(['image']);
        if ($request->hasFile('image')) {
            $data['image_path'] = ProfileImage::store($request->file('image'), 'stores');
        }

        $store = Store::query()->create($data);

        return redirect()
            ->route('stores.show', $store)
            ->with('success', 'فرۆشگا «'.$store->name.'» زیادکرا.');
    }

    public function edit(Request $request, Store $store): View
    {
        $this->authorizeManage($request);

        return view('stores.form', [
            'store' => $store,
            'maps' => $this->mapsConfig(),
        ]);
    }

    public function update(StoreRequest $request, Store $store): RedirectResponse
    {
        $data = $request->safe()->except(['image']);
        if ($request->hasFile('image')) {
            ProfileImage::delete($store->image_path);
            $data['image_path'] = ProfileImage::store($request->file('image'), 'stores');
        }

        $store->update($data);

        return redirect()
            ->route('stores.show', $store)
            ->with('success', 'فرۆشگا نوێکرایەوە.');
    }

    public function destroy(Request $request, Store $store): RedirectResponse
    {
        $this->authorizeManage($request);
        $store->delete();

        return redirect()
            ->route('stores.index')
            ->with('success', 'فرۆشگا سڕایەوە.');
    }

    private function canManage(Request $request): bool
    {
        return (bool) $request->user()?->canAccess(\App\Enums\PagePermission::StoresManage);
    }

    private function authorizeManage(Request $request): void
    {
        if (! $this->canManage($request)) {
            abort(403, 'دەسەڵاتت نییە بۆ ئەم بەشە.');
        }
    }

    /**
     * @return array{key: string|null, lat: float, lng: float, zoom: int}
     */
    private function mapsConfig(): array
    {
        $key = config('services.google.maps_api_key');

        return [
            'key' => is_string($key) && $key !== '' ? $key : null,
            'lat' => (float) config('services.google.maps_lat', 35.5558),
            'lng' => (float) config('services.google.maps_lng', 45.4351),
            'zoom' => (int) config('services.google.maps_zoom', 12),
        ];
    }
}
