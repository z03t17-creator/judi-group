@php
    $phones = $company['phones'] ?? [];
    $date = $invoice->created_at?->timezone(config('app.timezone'))->format('Y-m-d') ?? '';
    $respect = $invoice->store?->owner_name ?: $invoice->store?->name;
    $fmtQty = static fn (float $n): string => rtrim(rtrim(number_format($n, 2, '.', ','), '0'), '.') ?: '0';
    $hasDiscount = (float) $invoice->discount_percent > 0;
@endphp

<article class="paper-slip" dir="rtl">
    <p class="paper-slip__company">{{ $company['name'] ?? 'JUDI' }}</p>
    @if ($phones)
        <p class="paper-slip__phone" dir="ltr">{{ implode(' · ', $phones) }}</p>
    @endif
    <p class="paper-slip__title">{{ __('ui.visit_slip_title') }}</p>

    <p>{{ __('ui.invoice_no') }}: <strong dir="ltr">{{ $invoice->invoice_number }}</strong></p>
    <p>{{ __('ui.invoice_date') }}: <strong dir="ltr">{{ $date }}</strong></p>
    <p>{{ __('ui.invoice_store') }}: <strong>{{ $invoice->store?->name }}</strong></p>
    <p>{{ __('ui.invoice_respect') }}: <strong>{{ $respect }}</strong></p>
    <p>{{ __('ui.invoice_delegate') }}: <strong>{{ $invoice->collector?->name }}</strong></p>
    @if ($invoice->store?->address)
        <p>{{ __('ui.address') }}: {{ $invoice->store->address }}</p>
    @endif

    <table class="paper-slip__table">
        <thead>
            <tr>
                <th>{{ __('ui.invoice_item_name') }}</th>
                <th>{{ __('ui.invoice_qty') }}</th>
                <th>{{ __('ui.invoice_gift') }}</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($invoice->items as $item)
                <tr>
                    <td>{{ $item->product_name }}</td>
                    <td>
                        <span dir="ltr">{{ $fmtQty((float) $item->quantity) }}</span>
                        {{ $item->unitLabel() }}
                    </td>
                    <td dir="ltr">{{ (float) $item->gift_quantity > 0 ? $fmtQty((float) $item->gift_quantity) : '—' }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <p class="paper-slip__total">
        {{ __('ui.invoice_grand_total') }}:
        <strong dir="ltr">{{ number_format((float) $invoice->subtotal, 0) }}</strong>
    </p>
    @if ($hasDiscount)
        <p class="paper-slip__total">
            {{ __('ui.invoice_net_total') }}:
            <strong dir="ltr">{{ number_format((float) $invoice->total_amount, 0) }}</strong>
        </p>
    @endif
    @if ((float) $invoice->paid_amount > 0)
        <p class="paper-slip__total">
            {{ (float) $invoice->debt_amount > 0 ? __('ui.invoice_paid_now') : __('ui.invoice_cash') }}:
            <strong dir="ltr">{{ number_format((float) $invoice->paid_amount, 0) }}</strong>
        </p>
    @endif
    @if ((float) $invoice->debt_amount > 0)
        <p class="paper-slip__total paper-slip__remain">
            {{ __('ui.invoice_remaining') }}:
            <strong dir="ltr">{{ number_format((float) $invoice->debt_amount, 0) }}</strong>
        </p>
    @endif

    <p class="paper-slip__note">{{ __('ui.visit_slip_note') }}</p>

    <div class="paper-slip__signs">
        <span>{{ __('ui.receiver_name') }}</span>
        <span>{{ __('ui.invoice_receiver_sign') }}</span>
    </div>
</article>
