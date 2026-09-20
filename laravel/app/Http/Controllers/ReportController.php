<?php

namespace App\Http\Controllers;

use App\Enums\CollectorChannel;
use App\Enums\InvoiceType;
use App\Enums\PagePermission;
use App\Models\Store;
use App\Support\CollectorReportBuilder;
use App\Support\DatePeriodFilter;
use App\Support\OfficeReportBuilder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\View\View;

class ReportController extends Controller
{
    public function index(Request $request): View
    {
        $user = $request->user();
        $canReviewAll = $user->canAccess(PagePermission::ReportsReview);
        $showOffice = $canReviewAll
            && ($user->canAccess(PagePermission::Stock) || $user->canAccess(PagePermission::Purchases));

        [$from, $to, $period] = DatePeriodFilter::resolve($request, 'month');
        if ($period === 'all') {
            // Reports always need a bounded window — treat "all" as this month.
            $from = now()->startOfMonth()->startOfDay();
            $to = now()->startOfDay();
            $period = 'month';
        }

        $channel = $request->string('channel')->toString();
        if (! in_array($channel, [CollectorChannel::Wholesale->value, CollectorChannel::Retail->value], true)) {
            $channel = '';
        }

        $invoiceType = $request->string('type')->toString();
        if (! in_array($invoiceType, [InvoiceType::Cash->value, InvoiceType::Debt->value], true)) {
            $invoiceType = '';
        }

        /** @var Collection<int, \App\Models\User> $pool */
        $pool = $canReviewAll
            ? CollectorReportBuilder::collectors($channel !== '' ? $channel : null)
            : collect($user->isCollector() ? [$user] : []);

        $selectedCollectorId = $canReviewAll
            ? (int) $request->input('collector_id', 0)
            : (int) $user->id;

        $stores = Store::query()
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->get(['id', 'name', 'is_active']);
        $selectedStoreId = (int) $request->input('store_id', 0);
        if ($selectedStoreId > 0 && ! $stores->contains('id', $selectedStoreId)) {
            $selectedStoreId = 0;
        }

        if ($canReviewAll && $selectedCollectorId > 0) {
            $one = $pool->firstWhere('id', $selectedCollectorId);
            if (! $one) {
                $selectedCollectorId = 0;
                $targets = $pool;
            } else {
                $targets = collect([$one]);
            }
        } else {
            $targets = $pool;
            if (! $canReviewAll) {
                $selectedCollectorId = (int) $user->id;
            }
        }

        if (! $canReviewAll && $targets->isNotEmpty() && (int) $targets->first()->id !== (int) $user->id) {
            abort(403);
        }

        $report = $targets->isEmpty()
            ? null
            : CollectorReportBuilder::build(
                $targets,
                $from,
                $to,
                $invoiceType !== '' ? $invoiceType : null,
                $selectedStoreId > 0 ? $selectedStoreId : null,
            );

        $office = $showOffice
            ? OfficeReportBuilder::build($from, $to)
            : null;

        return view('reports.index', [
            'report' => $report,
            'office' => $office,
            'showOffice' => $showOffice,
            'collectors' => $pool,
            'canReviewAll' => $canReviewAll,
            'selectedCollectorId' => $selectedCollectorId,
            'stores' => $stores,
            'selectedStoreId' => $selectedStoreId,
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'period' => $period,
            'channel' => $channel,
            'invoiceType' => $invoiceType,
        ]);
    }
}
