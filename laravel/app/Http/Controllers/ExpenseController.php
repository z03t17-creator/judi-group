<?php

namespace App\Http\Controllers;

use App\Enums\CollectorChannel;
use App\Enums\ExpenseCategory;
use App\Enums\PagePermission;
use App\Http\Requests\StoreExpenseRequest;
use App\Models\Expense;
use App\Support\CollectorReportBuilder;
use App\Support\DatePeriodFilter;
use App\Support\ProfileImage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ExpenseController extends Controller
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

        $category = $request->string('category')->toString();
        $validCategories = array_map(fn (ExpenseCategory $c) => $c->value, ExpenseCategory::cases());
        if (! in_array($category, $validCategories, true)) {
            $category = '';
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

        $filtered = Expense::query()
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
                $category !== '',
                fn ($q) => $q->where('category', $category),
            )
            ->tap(fn ($q) => DatePeriodFilter::apply($q, $from, $to, 'spent_at', true));

        $count = (clone $filtered)->count();
        $total = (float) (clone $filtered)->sum('amount');

        $stats = [
            'count' => $count,
            'total' => $total,
            'average' => $count > 0 ? $total / $count : 0.0,
        ];

        $expenses = (clone $filtered)
            ->with('collector')
            ->latest('spent_at')
            ->latest('id')
            ->paginate(30)
            ->withQueryString();

        return view('expenses.index', [
            'expenses' => $expenses,
            'stats' => $stats,
            'canCreate' => $user->canAccess(PagePermission::Expenses),
            'canReview' => $canReview,
            'collectors' => $collectors,
            'selectedCollectorId' => $selectedCollectorId,
            'period' => $period,
            'from' => ($from ?? now()->startOfMonth())->toDateString(),
            'to' => ($to ?? now())->toDateString(),
            'channel' => $channel,
            'category' => $category,
            'categories' => ExpenseCategory::cases(),
        ]);
    }

    public function create(Request $request): View
    {
        return view('expenses.form', [
            'expense' => new Expense([
                'spent_at' => now()->toDateString(),
                'category' => ExpenseCategory::Food,
            ]),
            'categories' => ExpenseCategory::cases(),
        ]);
    }

    public function store(StoreExpenseRequest $request): RedirectResponse
    {
        $data = $request->safe()->except(['receipt']);
        $data['collector_id'] = $request->user()->id;

        if ($request->hasFile('receipt')) {
            $data['receipt_path'] = ProfileImage::store($request->file('receipt'), 'expenses');
        }

        $expense = Expense::query()->create($data);

        return redirect()
            ->route('expenses.index')
            ->with('success', __('ui.expense_saved', ['amount' => number_format((float) $expense->amount, 0)]));
    }

    public function destroy(Request $request, Expense $expense): RedirectResponse
    {
        $user = $request->user();
        $canReview = $user->canAccess(PagePermission::ReportsReview);

        if (! $canReview && (int) $expense->collector_id !== (int) $user->id) {
            abort(403);
        }

        if (! $user->canAccess(PagePermission::Expenses) && ! $canReview) {
            abort(403);
        }

        ProfileImage::delete($expense->receipt_path);
        $expense->delete();

        return redirect()
            ->route('expenses.index')
            ->with('success', __('ui.expense_deleted'));
    }
}
