@extends('layouts.app')

@section('title', $invoice->invoice_number. ' — '.__('ui.brand_short'))

@section('content')
<section class="page page--invoice-show">
    <header class="page__header page__header--iconed no-print">
        @include('partials.icon-badge', ['icon' => 'file', 'tone' => 'amber', 'size' => 'lg'])
        <div class="page__header-text">
            <p class="page__eyebrow">{{ __('ui.invoice_posted') }}</p>
            <h1 class="page__title" dir="ltr">{{ $invoice->invoice_number }}</h1>
            <p class="page__lead">
                {{ $invoice->store?->name }}
                · {{ $invoice->invoice_type->label() }}
                · {{ __('ui.invoice_grand_total') }}
                <span class="ltr-inline">{{ number_format((float) $invoice->total_amount, 0) }}</span>
                @if ((float) $invoice->discount_percent > 0)
                    · {{ __('ui.invoice_total_discount') }}
                    {{ rtrim(rtrim(number_format((float) $invoice->discount_percent, 2, '.', ''), '0'), '.') }}%
                @endif
                · {{ $invoice->status->label() }}
            </p>
        </div>
        <div class="page__actions">
            <a href="{{ $backUrl ?? route('invoices.index') }}" class="btn btn--regular">
                @include('partials.icons.arrow-back', ['class' => 'btn__icon'])
                {{ $backLabel ?? __('ui.back') }}
            </a>
            @if (auth()->user()->canAccess('invoices.sell') && ! auth()->user()->isCollector())
                <a href="{{ route('invoices.create') }}" class="btn btn--regular">
                    @include('partials.icons.plus', ['class' => 'btn__icon'])
                    {{ __('ui.invoice_another') }}
                </a>
            @endif
        </div>
    </header>

    @include('partials.flash')

    @if ($invoice->isCancelled())
        <div class="alert alert--danger no-print" role="status">
            {{ __('ui.invoice_cancelled_banner') }}
        </div>
    @endif

    @if ($invoice->isSent())
        <div class="alert alert--success no-print" role="status">
            {{ __('ui.release_already_sent') }}
            @if ($invoice->sent_at)
                · <span class="ltr-inline">{{ $invoice->sent_at->timezone(config('app.timezone'))->format('Y-m-d H:i') }}</span>
            @endif
            @if ($invoice->sentBy)
                · {{ $invoice->sentBy->name }}
            @endif
        </div>
    @endif

    @include('invoices.partials.paper-size-bar')

    <div class="invoice-preview-shell no-print-keep" data-invoice-preview>
        {{-- Paper first so accountant can print before send --}}
        @include('invoices.partials.paper-form', [
            'invoice' => $invoice,
            'company' => $company,
        ])
        @include('invoices.partials.paper-slip', [
            'invoice' => $invoice,
            'company' => $company,
        ])
    </div>

    @if (!empty($saleCollection))
        <div class="invoice-show__receipt no-print">
            <div class="alert alert--info" role="status">
                {{ __('ui.invoice_cash_in_collector_wallet', [
                    'amount' => number_format((float) $saleCollection->amount, 0),
                    'receipt' => $saleCollection->receipt_number,
                ]) }}
                @if ($saleCollection->isPending())
                    · {{ __('ui.collection_awaiting_confirm') }}
                @endif
            </div>
            <div class="page__actions" style="margin-bottom: 0.75rem">
                <a href="{{ route('collections.show', $saleCollection) }}" class="btn btn--regular">
                    @include('partials.icons.wallet', ['class' => 'btn__icon'])
                    {{ __('ui.collection_receipt_title') }}
                    <span class="ltr-inline">{{ $saleCollection->receipt_number }}</span>
                </a>
                <button type="button" class="btn btn--primary" data-print="voucher">
                    @include('partials.icons.print', ['class' => 'btn__icon'])
                    {{ __('ui.print_voucher') }}
                </button>
            </div>
        </div>
        @include('collections.partials.paper-receipt', [
            'collection' => $saleCollection,
            'company' => $company,
        ])
        @include('collections.partials.paper-slip', [
            'collection' => $saleCollection,
            'company' => $company,
        ])
    @endif

    @if (!empty($canCancel))
        <div class="invoice-show__secondary no-print">
            <form
                method="POST"
                action="{{ route('invoices.cancel', $invoice) }}"
                onsubmit="return confirm(@json(__('ui.confirm_cancel_invoice')));"
            >
                @csrf
                <button type="submit" class="btn btn--ghost btn--danger-text">
                    {{ __('ui.invoice_cancel') }}
                </button>
            </form>
        </div>
    @endif

    @if (!empty($canRelease))
        <form
            method="POST"
            action="{{ route('releases.send', $invoice) }}"
            class="sticky-cta no-print sticky-cta--invoice sticky-cta--release sticky-cta--paper"
            onsubmit="return confirm(@json(__('ui.release_confirm')));"
        >
            @csrf
            <div class="sticky-cta__meta">
                <span>{{ __('ui.invoice_grand_total') }}</span>
                <strong class="ltr-inline">{{ number_format((float) $invoice->total_amount, 0) }}</strong>
            </div>
            <div class="sticky-cta__prints" role="group" aria-label="{{ __('ui.paper_size') }}">
                <button type="button" class="btn btn--regular" data-print="a4" title="{{ __('ui.print_a4') }}">
                    @include('partials.icons.print', ['class' => 'btn__icon'])
                    <span>A4</span>
                </button>
                <button type="button" class="btn btn--regular" data-print="a5" title="{{ __('ui.print_a5') }}">
                    @include('partials.icons.print', ['class' => 'btn__icon'])
                    <span>A5</span>
                </button>
                <button type="button" class="btn btn--regular" data-print="slip" title="{{ __('ui.print_slip') }}">
                    @include('partials.icons.print', ['class' => 'btn__icon'])
                    <span>80mm</span>
                </button>
            </div>
            <label class="check sticky-cta__check" title="{{ __('ui.release_printed_confirm') }}">
                <input type="checkbox" name="printed_confirmed" value="1" required>
                <span>{{ __('ui.release_printed_confirm') }}</span>
            </label>
            <button type="submit" class="btn btn--primary">
                @include('partials.icons.warehouse', ['class' => 'btn__icon'])
                {{ __('ui.release_send') }}
            </button>
            @error('printed_confirmed')
                <p class="sticky-cta__error">{{ $message }}</p>
            @enderror
            @error('release')
                <p class="sticky-cta__error">{{ $message }}</p>
            @enderror
        </form>
    @else
        <div class="sticky-cta no-print sticky-cta--invoice sticky-cta--paper">
            <div class="sticky-cta__meta">
                <span>{{ __('ui.invoice_grand_total') }}</span>
                <strong class="ltr-inline">{{ number_format((float) $invoice->total_amount, 0) }}</strong>
            </div>
            @include('partials.share-button', [
                'shareTitle' => $invoice->invoice_number,
                'shareText' => \App\Support\ShareText::invoice($invoice, $company),
                'shareId' => 'share-invoice-'.$invoice->id,
                'compact' => true,
            ])
            <div class="sticky-cta__prints" role="group" aria-label="{{ __('ui.paper_size') }}">
                <button type="button" class="btn btn--regular" data-print="a4" title="{{ __('ui.print_a4') }}">
                    @include('partials.icons.print', ['class' => 'btn__icon'])
                    <span>A4</span>
                </button>
                <button type="button" class="btn btn--regular" data-print="a5" title="{{ __('ui.print_a5') }}">
                    @include('partials.icons.print', ['class' => 'btn__icon'])
                    <span>A5</span>
                </button>
                <button type="button" class="btn btn--primary" data-print="slip" title="{{ __('ui.print_slip') }}">
                    @include('partials.icons.print', ['class' => 'btn__icon'])
                    <span>80mm</span>
                </button>
            </div>
        </div>
    @endif
</section>

<div class="print-gate no-print" data-print-gate @if (empty($autoPrint) && empty($autoPrintReceipt)) hidden @endif>
    <div class="print-gate__card">
        <p class="print-gate__title">
            @if (!empty($saleCollection) && !empty($autoPrintReceipt))
                {{ __('ui.invoice_saved_print_both') }}
            @else
                {{ __('ui.invoice_saved_print') }}
            @endif
        </p>
        <button
            type="button"
            class="btn btn--primary print-gate__print"
            @if (!empty($saleCollection) && !empty($autoPrintReceipt))
                data-print-sequence="a4,voucher"
            @else
                data-print="{{ ($autoPrint ?? 'a4') === 'slip' ? 'slip' : 'a4' }}"
            @endif
        >
            {{ __('ui.print_now') }}
        </button>
        <button type="button" class="btn btn--ghost" data-print-gate-skip>{{ __('ui.print_later') }}</button>
    </div>
</div>
<script>
    (function () {
        var gate = document.querySelector('[data-print-gate]');
        try {
            if (sessionStorage.getItem('judiPrintAfterSave') && gate) {
                gate.hidden = false;
            }
        } catch (e) {}
    })();
</script>
@endsection
