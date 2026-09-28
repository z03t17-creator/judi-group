<?php

namespace App\Http\Controllers;

use App\Enums\CollectorChannel;
use App\Enums\PagePermission;
use App\Enums\Role;
use App\Http\Requests\CollectorRequest;
use App\Http\Requests\StoreCollectorPenaltyRequest;
use App\Http\Requests\StoreCollectorSalaryRequest;
use App\Models\CollectorPenalty;
use App\Models\CollectorSalaryEntry;
use App\Models\User;
use App\Support\CollectorReportBuilder;
use App\Support\DatePeriodFilter;
use App\Support\ProfileImage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class CollectorController extends Controller
{
    public function index(Request $request): View
    {
        $collectors = User::query()
            ->where('role', Role::Collector)
            ->when($request->filled('q'), function ($query) use ($request) {
                $q = '%'.$request->string('q').'%';
                $query->where(function ($inner) use ($q) {
                    $inner->where('name', 'like', $q)
                        ->orWhere('email', 'like', $q);
                });
            })
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        return view('collectors.index', [
            'collectors' => $collectors,
            'canManage' => $request->user()?->canAccess(PagePermission::CollectorsManage) ?? false,
        ]);
    }

    public function show(Request $request, User $collector): View
    {
        $this->ensureCollector($collector);
        $this->authorizeViewProfile($request, $collector);

        [$from, $to, $period] = DatePeriodFilter::resolve($request, 'month');
        if ($period === 'all') {
            $from = now()->startOfMonth()->startOfDay();
            $to = now()->startOfDay();
            $period = 'month';
        }

        $report = CollectorReportBuilder::build(
            collect([$collector]),
            $from,
            $to,
        );

        $salaries = CollectorSalaryEntry::query()
            ->where('collector_id', $collector->id)
            ->tap(fn ($q) => DatePeriodFilter::apply($q, $from, $to, 'paid_at', true))
            ->with('createdBy')
            ->latest('paid_at')
            ->latest('id')
            ->get();

        $penalties = CollectorPenalty::query()
            ->where('collector_id', $collector->id)
            ->tap(fn ($q) => DatePeriodFilter::apply($q, $from, $to, 'penalized_at', true))
            ->with('createdBy')
            ->latest('penalized_at')
            ->latest('id')
            ->get();

        $actor = $request->user();
        $canLedger = $this->canManageLedger($actor);

        return view('collectors.show', [
            'collector' => $collector,
            'report' => $report,
            'salaries' => $salaries,
            'penalties' => $penalties,
            'salaryTotal' => (float) $salaries->sum(fn ($row) => (float) $row->amount),
            'penaltyTotal' => (float) $penalties->sum(fn ($row) => (float) $row->amount),
            'period' => $period,
            'from' => ($from ?? now()->startOfMonth())->toDateString(),
            'to' => ($to ?? now())->toDateString(),
            'canManage' => $actor?->canAccess(PagePermission::CollectorsManage) ?? false,
            'canLedger' => $canLedger,
        ]);
    }

    public function create(Request $request): View
    {
        $this->authorizeManage($request);

        return view('collectors.form', [
            'collector' => new User([
                'role' => Role::Collector,
                'collector_channel' => CollectorChannel::Wholesale,
                'is_active' => true,
                'max_discount_percent' => 0,
                'max_gift_percent' => 0,
            ]),
            'channels' => CollectorChannel::cases(),
        ]);
    }

    public function store(CollectorRequest $request): RedirectResponse
    {
        $data = $request->safe()->except(['password_confirmation', 'image']);
        $data['role'] = Role::Collector;
        $data['email_verified_at'] = now();

        if (empty($data['password'])) {
            unset($data['password']);
        }

        if ($request->hasFile('image')) {
            $data['image_path'] = ProfileImage::store($request->file('image'), 'collectors');
        }

        $collector = User::query()->create($data);

        return redirect()
            ->route('collectors.show', $collector)
            ->with('success', 'مەندوب «'.$collector->name.'» زیادکرا.');
    }

    public function edit(Request $request, User $collector): View
    {
        $this->authorizeManage($request);
        $this->ensureCollector($collector);

        return view('collectors.form', [
            'collector' => $collector,
            'channels' => CollectorChannel::cases(),
        ]);
    }

    public function update(CollectorRequest $request, User $collector): RedirectResponse
    {
        $this->ensureCollector($collector);

        $data = $request->safe()->except(['password_confirmation', 'image']);
        $data['role'] = Role::Collector;

        if (empty($data['password'])) {
            unset($data['password']);
        }

        if ($request->hasFile('image')) {
            ProfileImage::delete($collector->image_path);
            $data['image_path'] = ProfileImage::store($request->file('image'), 'collectors');
        }

        $collector->update($data);

        return redirect()
            ->route('collectors.show', $collector)
            ->with('success', 'مەندوب نوێکرایەوە.');
    }

    public function destroy(Request $request, User $collector): RedirectResponse
    {
        $this->authorizeManage($request);
        $this->ensureCollector($collector);

        if ($collector->id === $request->user()->id) {
            return back()->withErrors(['collector' => 'ناتوانیت خۆت بسڕیتەوە.']);
        }

        $collector->delete();

        return redirect()
            ->route('users.index', ['role' => 'collector'])
            ->with('success', 'مەندوب سڕایەوە.');
    }

    public function storeSalary(StoreCollectorSalaryRequest $request, User $collector): RedirectResponse
    {
        $this->ensureCollector($collector);

        CollectorSalaryEntry::query()->create([
            'collector_id' => $collector->id,
            'amount' => number_format((float) $request->validated('amount'), 2, '.', ''),
            'paid_at' => $request->validated('paid_at'),
            'note' => $request->validated('note'),
            'created_by_id' => $request->user()->id,
        ]);

        return back()->with('success', __('ui.salary_saved'));
    }

    public function destroySalary(Request $request, User $collector, CollectorSalaryEntry $salary): RedirectResponse
    {
        $this->ensureCollector($collector);
        $this->authorizeLedger($request);

        if ((int) $salary->collector_id !== (int) $collector->id) {
            abort(404);
        }

        $salary->delete();

        return back()->with('success', __('ui.salary_deleted'));
    }

    public function storePenalty(StoreCollectorPenaltyRequest $request, User $collector): RedirectResponse
    {
        $this->ensureCollector($collector);

        CollectorPenalty::query()->create([
            'collector_id' => $collector->id,
            'amount' => number_format((float) $request->validated('amount'), 2, '.', ''),
            'penalized_at' => $request->validated('penalized_at'),
            'reason' => $request->validated('reason'),
            'note' => $request->validated('note'),
            'created_by_id' => $request->user()->id,
        ]);

        return back()->with('success', __('ui.penalty_saved'));
    }

    public function destroyPenalty(Request $request, User $collector, CollectorPenalty $penalty): RedirectResponse
    {
        $this->ensureCollector($collector);
        $this->authorizeLedger($request);

        if ((int) $penalty->collector_id !== (int) $collector->id) {
            abort(404);
        }

        $penalty->delete();

        return back()->with('success', __('ui.penalty_deleted'));
    }

    private function authorizeManage(Request $request): void
    {
        if (! $request->user()?->canAccess(PagePermission::CollectorsManage)) {
            abort(403, 'دەسەڵاتت نییە بۆ ئەم بەشە.');
        }
    }

    private function authorizeViewProfile(Request $request, User $collector): void
    {
        $actor = $request->user();
        if (! $actor) {
            abort(403);
        }

        if ($actor->isCollector() && (int) $actor->id === (int) $collector->id) {
            return;
        }

        if ($actor->canAccess(PagePermission::Collectors)
            || $actor->canAccess(PagePermission::CollectorsManage)
            || $actor->canAccess(PagePermission::ReportsReview)
            || $actor->isAdmin()
            || $actor->isAccountant()) {
            return;
        }

        abort(403);
    }

    private function authorizeLedger(Request $request): void
    {
        if (! $this->canManageLedger($request->user())) {
            abort(403);
        }
    }

    private function canManageLedger(?User $actor): bool
    {
        return (bool) ($actor?->isAdmin() || $actor?->isAccountant());
    }

    private function ensureCollector(User $collector): void
    {
        if ($collector->role !== Role::Collector) {
            abort(404);
        }
    }
}
