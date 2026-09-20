@php
    $phones = $company['phones'] ?? [];
    $date = $invoice->created_at?->timezone(config('app.timezone'))->format('Y-m-d') ?? '';
    $printedAt = now()->timezone(config('app.timezone'))->format('Y-m-d H:i');
    $respect = $invoice->store?->owner_name ?: $invoice->store?->name;
    $fmtQty = static fn (float $n): string => rtrim(rtrim(number_format($n, 2, '.', ','), '0'), '.') ?: '0';
    $hasDiscount = (float) $invoice->discount_percent > 0;
    $paid = (float) $invoice->paid_amount;
    $debt = (float) $invoice->debt_amount;
    $discountPct = rtrim(rtrim(number_format((float) $invoice->discount_percent, 2, '.', ''), '0'), '.');
@endphp

<article class="paper-invoice" dir="rtl">
    <header class="paper-invoice__header">
        <div class="paper-invoice__brand">
            <img
                src="{{ $judiLogoUrl }}"
                alt="JUDI"
                class="paper-invoice__logo"
            >
            <div class="paper-invoice__brand-text">
                <p class="paper-invoice__name">{{ $company['name'] ?? 'JUDI' }}</p>
                @if (! empty($company['tagline']))
                    <p class="paper-invoice__tagline">{{ $company['tagline'] }}</p>
                @endif
                @if ($phones)
                    <p class="paper-invoice__phones" dir="ltr">{{ implode(' · ', $phones) }}</p>
                @endif
                @if (! empty($company['address']))
                    <p class="paper-invoice__address">{{ $company['address'] }}</p>
                @endif
            </div>
        </div>
        <div class="paper-invoice__meta">
            <p class="paper-invoice__no">
                <span>{{ __('ui.invoice_no') }}</span>
                <strong dir="ltr">{{ $invoice->invoice_number }}</strong>
            </p>
            <p>
                <span>{{ __('ui.invoice_date') }}</span>
                <strong dir="ltr">{{ $date }}</strong>
            </p>
            <p>
                <span>{{ __('ui.invoice_type') }}</span>
                <strong>{{ $invoice->invoice_type->label() }}</strong>
            </p>
            @if ($invoice->warehouse)
                <p>
                    <span>{{ __('ui.warehouses') }}</span>
                    <strong>{{ $invoice->warehouse->displayName() }}</strong>
                </p>
            @endif
            <p class="paper-invoice__printed">
                <span>{{ __('ui.print') }}</span>
                <strong dir="ltr">{{ $printedAt }}</strong>
            </p>
        </div>
    </header>

    <div class="paper-invoice__party">
        <div class="paper-invoice__party-col">
            <p>
                <span class="paper-invoice__label">{{ __('ui.invoice_respect') }}</span>
                <strong>{{ $respect }}</strong>
            </p>
            <p>
                <span class="paper-invoice__label">{{ __('ui.invoice_delegate') }}</span>
                <strong>{{ $invoice->collector?->name }}</strong>
            </p>
            <p>
                <span class="paper-invoice__label">{{ __('ui.phone') }}</span>
                <strong dir="ltr">{{ $invoice->store?->phone ?: '—' }}</strong>
            </p>
        </div>
        <div class="paper-invoice__party-col">
            <p>
                <span class="paper-invoice__label">{{ __('ui.invoice_store') }}</span>
                <strong>{{ $invoice->store?->name }}</strong>
            </p>
            <p>
                <span class="paper-invoice__label">{{ __('ui.address') }}</span>
                <strong>{{ $invoice->store?->address ?: '—' }}</strong>
            </p>
        </div>
    </div>

    <table class="paper-invoice__table">
        <thead>
            <tr>
                <th class="col-name">{{ __('ui.invoice_item_name') }}</th>
                <th class="col-qty">{{ __('ui.invoice_qty') }}</th>
                <th class="col-price">{{ __('ui.invoice_unit_price') }}</th>
                <th class="col-gift">{{ __('ui.invoice_gift') }}</th>
                <th class="col-disc">{{ __('ui.invoice_discount') }}</th>
                <th class="col-total">{{ __('ui.invoice_line_total') }}</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($invoice->items as $item)
                @php
                    $gift = (float) $item->gift_quantity;
                @endphp
                <tr>
                    <td class="col-name">{{ $item->product_name }}</td>
                    <td class="col-qty col-emph">
                        <strong dir="ltr">{{ $fmtQty((float) $item->quantity) }}</strong>
                        <span class="paper-invoice__unit">{{ $item->unitLabel() }}</span>
                    </td>
                    <td class="col-price" dir="ltr">{{ number_format((float) $item->unit_price, 0) }}</td>
                    <td @class(['col-gift', 'col-emph', 'is-gift' => $gift > 0]) dir="ltr">
                        @if ($gift > 0)
                            <strong>{{ $fmtQty($gift) }}</strong>
                        @else
                            —
                        @endif
                    </td>
                    <td @class(['col-disc', 'col-emph', 'is-disc' => $hasDiscount]) dir="ltr">
                        @if ($hasDiscount)
                            <strong>{{ $discountPct }}%</strong>
                        @else
                            —
                        @endif
                    </td>
                    <td class="col-total" dir="ltr">{{ number_format((float) $item->line_total, 0) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <footer class="paper-invoice__footer">
        <div class="paper-invoice__sign">
            <div class="paper-invoice__sign-box">
                <p>{{ __('ui.invoice_receiver_sign') }}</p>
                <div class="paper-invoice__sign-line"></div>
            </div>
            <div class="paper-invoice__sign-box">
                <p>{{ __('ui.invoice_delegate') }}</p>
                <div class="paper-invoice__sign-line"></div>
            </div>
        </div>
        <div class="paper-invoice__totals">
            <p @class(['is-total' => ! $hasDiscount])>
                <span>{{ __('ui.invoice_grand_total') }}</span>
                <strong dir="ltr">{{ number_format((float) $invoice->subtotal, 0) }}</strong>
            </p>
            @if ($hasDiscount)
                <p class="is-discount">
                    <span>{{ __('ui.invoice_discount') }}</span>
                    <strong dir="ltr">{{ $discountPct }}%</strong>
                </p>
                <p class="is-total">
                    <span>{{ __('ui.invoice_net_total') }}</span>
                    <strong dir="ltr">{{ number_format((float) $invoice->total_amount, 0) }}</strong>
                </p>
            @endif
            @if ($paid > 0)
                <p>
                    <span>{{ $debt > 0 ? __('ui.invoice_paid_now') : __('ui.invoice_cash') }}</span>
                    <strong dir="ltr">{{ number_format($paid, 0) }}</strong>
                </p>
            @endif
            @if ($debt > 0)
                <p class="is-remain">
                    <span>{{ __('ui.invoice_remaining') }}</span>
                    <strong dir="ltr">{{ number_format($debt, 0) }}</strong>
                </p>
            @endif
        </div>
    </footer>

    <div class="paper-invoice__band">
        <div class="paper-invoice__band-contacts">
            @if ($phones)
                <span dir="ltr">{{ implode(' · ', $phones) }}</span>
            @endif
            @if (! empty($company['address']))
                <span>{{ $company['address'] }}</span>
            @endif
        </div>
        <p class="paper-invoice__pages" aria-hidden="true"></p>
    </div>
</article>
