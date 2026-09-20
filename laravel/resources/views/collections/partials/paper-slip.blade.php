@php
    use App\Support\MoneyWords;

    $phones = $company['phones'] ?? [];
    $date = $collection->collected_at?->format('Y-m-d') ?? '';
    $respect = $collection->store?->owner_name ?: $collection->store?->name;
    $amount = (float) $collection->amount;
    $remaining = (float) ($collection->store?->current_debt ?? 0);
@endphp

<article class="paper-slip" dir="rtl">
    <p class="paper-slip__company">{{ $company['legal_name'] ?: __('ui.company_legal_name') }}</p>
    @if ($phones)
        <p class="paper-slip__phone" dir="ltr">{{ implode(' · ', $phones) }}</p>
    @endif
    <p class="paper-slip__title">{{ __('ui.collection_voucher_title') }}</p>

    <p>{{ __('ui.collection_receipt_no') }}: <strong dir="ltr">{{ $collection->receipt_number }}</strong></p>
    <p>{{ __('ui.invoice_date') }}: <strong dir="ltr">{{ $date }}</strong></p>
    <p>{{ __('ui.received_from_dear') }}: <strong>{{ $respect }}</strong></p>
    <p>{{ __('ui.invoice_store') }}: <strong>{{ $collection->store?->name }}</strong></p>
    <p>{{ __('ui.invoice_delegate') }}: <strong>{{ $collection->collector?->name }}</strong></p>
    <p class="paper-slip__total">
        {{ __('ui.amount_of') }}:
        <strong dir="ltr">{{ number_format($amount, 0) }} IQD</strong>
    </p>
    <p>{{ __('ui.amount_words_dinar') }}: {{ MoneyWords::dinar($amount) }}</p>
    <p>
        {{ __('ui.amount_remaining') }}:
        <strong dir="ltr">{{ number_format($remaining, 0) }}</strong>
    </p>
    @if ($collection->note)
        <p>{{ __('ui.notes') }}: {{ $collection->note }}</p>
    @endif

    <div class="paper-slip__signs">
        <span>{{ __('ui.collector_money_sign') }}</span>
        <span>{{ __('ui.payer_sign') }}</span>
    </div>
</article>
