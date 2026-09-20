@extends('layouts.app')

@section('title', $invoice->invoice_number.' — JUDI')

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
                @if ((float) $invoice->debt_amount > 0)
                    · {{ __('ui.invoice_remaining') }}
                    <span class="ltr-inline">{{ number_format((float) $invoice->debt_amount, 0) }}</span>
                @endif
                · {{ $invoice->status->label() }}
            </p>
        </div>
        <div class="page__actions">
            <a href="{{ route('invoices.index') }}" class="btn btn--regular">
                @include('partials.icons.arrow-back', ['class' => 'btn__icon'])
                {{ __('ui.back') }}
            </a>
            @if (auth()->user()->canAccess('invoices.sell'))
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

    {{-- Paper first so accountant can print before send --}}
    @include('invoices.partials.paper-form', [
        'invoice' => $invoice,
        'company' => $company,
    ])
    @include('invoices.partials.paper-slip', [
        'invoice' => $invoice,
        'company' => $company,
    ])

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
            class="sticky-cta no-print sticky-cta--invoice sticky-cta--release"
            onsubmit="return confirm(@json(__('ui.release_confirm')));"
        >
            @csrf
            <div class="sticky-cta__meta">
                <span>{{ __('ui.invoice_grand_total') }}</span>
                <strong class="ltr-inline">{{ number_format((float) $invoice->total_amount, 0) }}</strong>
            </div>
            <button type="button" class="btn btn--regular" data-print="slip" title="{{ __('ui.print_slip') }}">
                @include('partials.icons.print', ['class' => 'btn__icon'])
                <span class="sticky-cta__label">{{ __('ui.print_slip') }}</span>
            </button>
            <button type="button" class="btn btn--regular" data-print="a4" title="{{ __('ui.print_a4') }}">
                @include('partials.icons.print', ['class' => 'btn__icon'])
                <span class="sticky-cta__label">{{ __('ui.print_a4') }}</span>
            </button>
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
        <div class="sticky-cta no-print sticky-cta--invoice">
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
            <button type="button" class="btn btn--regular" data-print="slip" title="{{ __('ui.print_slip') }}">
                @include('partials.icons.print', ['class' => 'btn__icon'])
                <span class="sticky-cta__label">{{ __('ui.print_slip') }}</span>
            </button>
            <button type="button" class="btn btn--primary" data-print="a4">
                @include('partials.icons.print', ['class' => 'btn__icon'])
                {{ __('ui.print_a4') }}
            </button>
        </div>
    @endif
</section>

<div class="print-gate no-print" data-print-gate @if (empty($autoPrint)) hidden @endif>
    <div class="print-gate__card">
        <p class="print-gate__title">{{ __('ui.invoice_saved_print') }}</p>
        <button type="button" class="btn btn--primary print-gate__print" data-print="{{ ($autoPrint ?? 'a4') === 'slip' ? 'slip' : 'a4' }}">
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
