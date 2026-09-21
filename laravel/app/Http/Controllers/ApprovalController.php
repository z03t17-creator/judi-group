<?php

namespace App\Http\Controllers;

use App\Enums\CollectionStatus;
use App\Enums\InvoiceStatus;
use App\Enums\PagePermission;
use App\Models\Collection;
use App\Models\DeviceLoginRequest;
use App\Models\Invoice;
use App\Support\DeviceGuard;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;
use InvalidArgumentException;

class ApprovalController extends Controller
{
    public function index(Request $request): View
    {
        $this->authorizeApprovals($request);
        $user = $request->user();

        $tab = $request->string('tab')->toString();
        if (! in_array($tab, ['all', 'releases', 'collections', 'devices'], true)) {
            $tab = 'all';
        }

        $releases = collect();
        if ($user->canAccess(PagePermission::Releases)) {
            $releases = Invoice::query()
                ->with(['store', 'collector', 'items'])
                ->where('status', InvoiceStatus::PendingSend)
                ->latest('id')
                ->limit(100)
                ->get();
        }

        $collections = collect();
        if ($user->canAccess(PagePermission::ReportsReview)) {
            $collections = Collection::query()
                ->with(['store', 'collector', 'invoice'])
                ->where('status', CollectionStatus::Pending)
                ->latest('id')
                ->limit(100)
                ->get();
        }

        $devices = collect();
        if ($user->canApproveDevices()) {
            $devices = DeviceLoginRequest::query()
                ->with('user')
                ->where('status', 'pending')
                ->where('expires_at', '>', now())
                ->latest('id')
                ->limit(100)
                ->get();
        }

        $counts = [
            'releases' => $releases->count(),
            'collections' => $collections->count(),
            'devices' => $devices->count(),
        ];
        $counts['all'] = $counts['releases'] + $counts['collections'] + $counts['devices'];

        return view('approvals.index', [
            'tab' => $tab,
            'releases' => $releases,
            'collections' => $collections,
            'devices' => $devices,
            'counts' => $counts,
            'canRelease' => $user->canAccess(PagePermission::Releases),
            'canConfirmCollections' => $user->canAccess(PagePermission::ReportsReview),
            'canApproveDevices' => $user->canApproveDevices(),
        ]);
    }

    public function sendReleases(Request $request): RedirectResponse
    {
        $this->authorizeReleases($request);

        $data = $request->validate([
            'ids' => ['required_without:approve_all', 'array', 'min:1'],
            'ids.*' => ['integer', 'distinct'],
            'printed_confirmed' => ['accepted'],
            'approve_all' => ['sometimes', 'boolean'],
        ], [
            'printed_confirmed.accepted' => __('ui.release_printed_required'),
            'ids.required' => __('ui.approvals_select_one'),
            'ids.required_without' => __('ui.approvals_select_one'),
        ]);

        $query = Invoice::query()->where('status', InvoiceStatus::PendingSend);
        if (! $request->boolean('approve_all')) {
            $query->whereIn('id', $data['ids'] ?? []);
        }

        $invoices = $query->orderBy('id')->get();
        $ok = 0;
        $errors = [];

        foreach ($invoices as $invoice) {
            try {
                $invoice->sendFromWarehouse($request->user());
                $ok++;
            } catch (InvalidArgumentException $e) {
                $errors[] = $invoice->invoice_number.': '.$e->getMessage();
            }
        }

        return $this->finishBulk(
            $request,
            $ok,
            $errors,
            __('ui.approvals_releases_done', ['count' => $ok]),
        );
    }

    public function confirmCollections(Request $request): RedirectResponse
    {
        $this->authorizeCollections($request);

        $data = $request->validate([
            'ids' => ['required_without:approve_all', 'array', 'min:1'],
            'ids.*' => ['integer', 'distinct'],
            'approve_all' => ['sometimes', 'boolean'],
        ], [
            'ids.required' => __('ui.approvals_select_one'),
            'ids.required_without' => __('ui.approvals_select_one'),
        ]);

        $query = Collection::query()->where('status', CollectionStatus::Pending);
        if (! $request->boolean('approve_all')) {
            $query->whereIn('id', $data['ids'] ?? []);
        }

        $rows = $query->orderBy('id')->get();
        $ok = 0;
        $errors = [];

        foreach ($rows as $collection) {
            try {
                $collection->confirm($request->user());
                $ok++;
            } catch (InvalidArgumentException $e) {
                $errors[] = $collection->receipt_number.': '.$e->getMessage();
            }
        }

        return $this->finishBulk(
            $request,
            $ok,
            $errors,
            __('ui.approvals_collections_done', ['count' => $ok]),
        );
    }

    public function approveDevices(Request $request): RedirectResponse
    {
        $user = $request->user();
        if (! $user?->canApproveDevices()) {
            abort(403);
        }

        $data = $request->validate([
            'ids' => ['required_without:approve_all', 'array', 'min:1'],
            'ids.*' => ['integer', 'distinct'],
            'approve_all' => ['sometimes', 'boolean'],
        ], [
            'ids.required' => __('ui.approvals_select_one'),
            'ids.required_without' => __('ui.approvals_select_one'),
        ]);

        $query = DeviceLoginRequest::query()
            ->where('status', 'pending')
            ->where('expires_at', '>', now());
        if (! $request->boolean('approve_all')) {
            $query->whereIn('id', $data['ids'] ?? []);
        }

        $ok = 0;
        foreach ($query->orderBy('id')->get() as $pending) {
            if (DeviceGuard::approve($pending, $user)) {
                $ok++;
            }
        }

        return redirect()
            ->route('approvals.index', ['tab' => 'devices'])
            ->with('success', __('ui.approvals_devices_done', ['count' => $ok]));
    }

    private function finishBulk(Request $request, int $ok, array $errors, string $success): RedirectResponse
    {
        $redirect = redirect()->route('approvals.index', [
            'tab' => $request->string('tab')->toString() ?: 'all',
        ]);

        if ($ok > 0) {
            $redirect->with('success', $success);
        }

        if ($errors !== []) {
            $redirect->withErrors(['approvals' => implode(' · ', array_slice($errors, 0, 5))]);
        } elseif ($ok === 0) {
            $redirect->withErrors(['approvals' => __('ui.approvals_select_one')]);
        }

        return $redirect;
    }

    private function authorizeApprovals(Request $request): void
    {
        $user = $request->user();
        if (
            ! $user?->canAccess(PagePermission::Releases)
            && ! $user?->canAccess(PagePermission::ReportsReview)
            && ! $user?->canApproveDevices()
        ) {
            abort(403);
        }
    }

    private function authorizeReleases(Request $request): void
    {
        if (! $request->user()?->canAccess(PagePermission::Releases)) {
            abort(403);
        }
    }

    private function authorizeCollections(Request $request): void
    {
        if (! $request->user()?->canAccess(PagePermission::ReportsReview)) {
            abort(403);
        }
    }
}
