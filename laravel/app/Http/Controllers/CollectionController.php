<?php

namespace App\Http\Controllers;

use App\Enums\CollectionStatus;
use App\Enums\CollectorChannel;
use App\Enums\PagePermission;
use App\Http\Requests\StoreCollectionRequest;
use App\Models\Collection;
use App\Models\Store;
use App\Support\CollectorReportBuilder;
use App\Support\DatePeriodFilter;
use App\Support\ProfileImage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;
use InvalidArgumentException;

class CollectionController extends Controller
{
    public function index(Request $request): View
    {
        $user = $request->user();
        $canReview = $user->canAccess(PagePermission::ReportsReview);

        [$from, $to, $period] = DatePeriodFilter::resolve($request, 'month');

        $channel = $request->string('channel')->toString();
        if (! in_array($channel, [CollectorChannel::Wholesale->value, CollectorChannel::Retail->value], true)) {
            $channel = '';
        }

        $status = $request->string('status')->toString();
        if (! in_array($status, [CollectionStatus::Pending->value, CollectionStatus::Confirmed->value], true)) {
            $status = '';
        }

        $collectors = $canReview
            ? CollectorReportBuilder::collectors($channel !== '' ? $channel : null)
            : collect();

        $selectedCollectorId = $canReview
            ? (int) $request->input('collector_id', 0)
            : 0;

        if ($canReview && $selectedCollectorId > 0 && ! $collectors->contains('id', $selectedCollectorId)) {
            $selectedCollectorId = 0;
        }

        $filtered = Collection::query()
            ->when(
                ! $canReview,
                fn ($q) => $q->where('collector_id', $user->id),
            )
            ->when(
                $canReview && $selectedCollectorId > 0,
                fn ($q) => $q->where('collector_id', $selectedCollectorId),
            )
            ->when(
                $canReview && $selectedCollectorId === 0 && $channel !== '',
                fn ($q) => $q->whereIn('collector_id', $collectors->pluck('id')->all() ?: [0]),
            )
            ->when(
                $status !== '',
                fn ($q) => $q->where('status', $status),
            )
            ->tap(fn ($q) => DatePeriodFilter::apply($q, $from, $to, 'collected_at', true));

        // Debt-collected KPIs count confirmed receipts only; list may still show pending.
        $confirmed = (clone $filtered)->where('status', CollectionStatus::Confirmed);
        $count = (clone $confirmed)->count();
        $total = (float) (clone $confirmed)->sum('amount');

        $stats = [
            'count' => $count,
            'total' => $total,
            'average' => $count > 0 ? $total / $count : 0.0,
            'stores' => (int) (clone $confirmed)->whereNotNull('store_id')->distinct()->count('store_id'),
        ];

        $collections = (clone $filtered)
            ->with(['store', 'collector'])
            ->latest('collected_at')
            ->latest('id')
            ->paginate(30)
            ->withQueryString();

        return view('collections.index', [
            'collections' => $collections,
            'stats' => $stats,
            'canCreate' => $user->canAccess(PagePermission::Collections),
            'canReview' => $canReview,
            'collectors' => $collectors,
            'selectedCollectorId' => $selectedCollectorId,
            'period' => $period,
            'from' => ($from ?? now()->startOfMonth())->toDateString(),
            'to' => ($to ?? now())->toDateString(),
            'channel' => $channel,
            'status' => $status,
        ]);
    }

    public function create(Request $request): View
    {
        $stores = Store::query()
            ->where('is_active', true)
            ->where('current_debt', '>', 0)
            ->orderBy('name')
            ->get()
            ->map(function (Store $store) {
                $store->setAttribute('available_debt', Collection::availableDebtForStore($store));

                return $store;
            })
            ->filter(fn (Store $store) => (float) $store->available_debt > 0)
            ->values();

        return view('collections.form', [
            'collection' => new Collection([
                'collected_at' => now()->toDateString(),
            ]),
            'stores' => $stores,
        ]);
    }

    public function store(StoreCollectionRequest $request): RedirectResponse
    {
        $store = Store::query()->findOrFail((int) $request->validated('store_id'));
        $receiptPath = null;

        if ($request->hasFile('receipt')) {
            $receiptPath = ProfileImage::store($request->file('receipt'), 'collections');
        }

        try {
            $collection = Collection::recordPayment(
                $request->user(),
                $store,
                (float) $request->validated('amount'),
                $request->validated('collected_at'),
                $request->validated('note'),
                $receiptPath,
            );
        } catch (InvalidArgumentException $e) {
            if ($receiptPath) {
                ProfileImage::delete($receiptPath);
            }

            return back()->withInput()->withErrors(['amount' => $e->getMessage()]);
        }

        return redirect()
            ->route('collections.show', $collection)
            ->with('success', __('ui.collection_saved', [
                'amount' => number_format((float) $collection->amount, 0),
            ]));
    }

    public function show(Request $request, Collection $collection): View
    {
        $user = $request->user();
        $canReview = $user->canAccess(PagePermission::ReportsReview);

        if (! $canReview && (int) $collection->collector_id !== (int) $user->id) {
            abort(403);
        }

        $collection->load(['store', 'collector', 'confirmedBy']);

        return view('collections.show', [
            'collection' => $collection,
            'company' => config('judi.company'),
            'autoPrint' => $request->query('print') === 'slip'
                ? 'slip'
                : ($request->boolean('print') ? 'a4' : null),
            'canReview' => $canReview,
            'canConfirm' => $canReview && $collection->isPending(),
            'canDelete' => $canReview || (
                $user->canAccess(PagePermission::Collections)
                && (int) $collection->collector_id === (int) $user->id
            ),
        ]);
    }

    public function confirm(Request $request, Collection $collection): RedirectResponse
    {
        try {
            $collection->confirm($request->user());
        } catch (InvalidArgumentException $e) {
            return redirect()
                ->route('collections.show', $collection)
                ->withErrors(['confirm' => $e->getMessage()]);
        }

        return redirect()
            ->route('collections.show', $collection)
            ->with('success', __('ui.collection_confirmed', [
                'amount' => number_format((float) $collection->amount, 0),
            ]));
    }

    public function destroy(Request $request, Collection $collection): RedirectResponse
    {
        try {
            $collection->reverseAndDelete($request->user());
        } catch (InvalidArgumentException $e) {
            abort(403, $e->getMessage());
        }

        return redirect()
            ->route('collections.index')
            ->with('success', __('ui.collection_deleted'));
    }
}
