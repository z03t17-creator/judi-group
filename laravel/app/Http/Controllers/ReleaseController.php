<?php

namespace App\Http\Controllers;

use App\Enums\CollectorChannel;
use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Support\CollectorReportBuilder;
use App\Support\DatePeriodFilter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;
use InvalidArgumentException;

class ReleaseController extends Controller
{
    public function index(Request $request): View
    {
        [$from, $to, $period] = DatePeriodFilter::resolve($request, 'all');

        $channel = $request->string('channel')->toString();
        if (! in_array($channel, [CollectorChannel::Wholesale->value, CollectorChannel::Retail->value], true)) {
            $channel = '';
        }

        $collectors = CollectorReportBuilder::collectors($channel !== '' ? $channel : null);
        $selectedCollectorId = (int) $request->input('collector_id', 0);
        if ($selectedCollectorId > 0 && ! $collectors->contains('id', $selectedCollectorId)) {
            $selectedCollectorId = 0;
        }

        $invoices = Invoice::query()
            ->with(['store', 'collector', 'items'])
            ->where('status', InvoiceStatus::PendingSend)
            ->when(
                $selectedCollectorId > 0,
                fn ($q) => $q->where('collector_id', $selectedCollectorId),
            )
            ->when(
                $selectedCollectorId === 0 && $channel !== '',
                fn ($q) => $q->whereIn('collector_id', $collectors->pluck('id')->all() ?: [0]),
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
                        })
                        ->orWhereHas('collector', function ($collector) use ($q) {
                            $collector->where('name', 'like', $q);
                        });
                });
            })
            ->latest('id')
            ->paginate(20)
            ->withQueryString();

        return view('releases.index', [
            'invoices' => $invoices,
            'collectors' => $collectors,
            'selectedCollectorId' => $selectedCollectorId,
            'period' => $period,
            'from' => ($from ?? now()->startOfMonth())->toDateString(),
            'to' => ($to ?? now())->toDateString(),
            'channel' => $channel,
            'q' => $request->string('q')->toString(),
        ]);
    }

    public function send(Request $request, Invoice $invoice): RedirectResponse
    {
        $request->validate([
            'printed_confirmed' => ['accepted'],
        ], [
            'printed_confirmed.accepted' => __('ui.release_printed_required'),
        ]);

        try {
            $invoice->sendFromWarehouse($request->user());
        } catch (InvalidArgumentException $e) {
            return redirect()
                ->route('invoices.show', $invoice)
                ->withErrors(['release' => $e->getMessage()]);
        }

        return redirect()
            ->route('invoices.show', $invoice)
            ->with('success', __('ui.release_sent', ['number' => $invoice->invoice_number]));
    }
}
