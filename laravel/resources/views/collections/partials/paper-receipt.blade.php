@php
    use App\Support\MoneyWords;

    $phones = $company['phones'] ?? [];
    $date = $collection->collected_at?->format('Y-m-d') ?? '';
    $respect = $collection->store?->owner_name ?: $collection->store?->name;
    $storeName = $collection->store?->name;
    $fromLine = $respect;
    if ($storeName && $storeName !== $respect) {
        $fromLine .= ' — '.$storeName;
    }
    $amount = (float) $collection->amount;
    $pending = $collection->isPending();
    // Pending: debt not yet reduced — remaining = debt minus all pending holds.
    // Confirmed: current_debt is already after this payment.
    $remaining = $pending
        ? \App\Models\Collection::availableDebtForStore($collection->store)
        : (float) ($collection->store?->current_debt ?? 0);
    $legal = $company['legal_name'] ?: __('ui.company_legal_name');
    $branch = $company['branch'] ?: __('ui.company_branch');
    $brand = $company['name'] ?? 'JUDI';
    $tagline = $company['tagline'] ?? '';
    $words = MoneyWords::dinar($amount);
    $no = $collection->receipt_number;
@endphp

<article class="paper-voucher{{ $pending ? ' paper-voucher--pending' : '' }}" dir="rtl">
    <img class="paper-voucher__mark" src="{{ $judiLogoUrl }}" alt="">

    <header class="paper-voucher__head">
        <div class="paper-voucher__titles">
            <p class="paper-voucher__company">{{ $legal }}</p>
            <p class="paper-voucher__title">{{ __('ui.collection_voucher_title') }}</p>
            <p class="paper-voucher__branch">{{ $branch }}</p>
        </div>

        <div class="paper-voucher__ids">
            <p>
                <span>{{ __('ui.invoice_date') }}:</span>
                <strong dir="ltr">{{ $date }}</strong>
            </p>
            <p>
                <span class="paper-voucher__no-lab">No.</span>
                <strong dir="ltr">{{ $no }}</strong>
            </p>
        </div>

        <div class="paper-voucher__brand">
            <img class="paper-voucher__logo" src="{{ $judiLogoUrl }}" alt="JUDI">
            <p class="paper-voucher__brand-name">{{ $brand }}</p>
            @if ($tagline !== '')
                <p class="paper-voucher__brand-tag">{{ $tagline }}</p>
            @endif
        </div>
    </header>

    @if ($pending)
        <p class="paper-voucher__pending">{{ __('ui.collection_awaiting_confirm') }}</p>
    @endif

    <div class="paper-voucher__body">
        <div class="paper-voucher__row paper-voucher__row--with-chip">
            <div class="paper-voucher__line">
                <span class="paper-voucher__lab">{{ __('ui.received_from_dear') }}</span>
                <span class="paper-voucher__val">{{ $fromLine }}</span>
            </div>
            <span class="paper-voucher__iqd">
                <em>IQD</em>
                <strong dir="ltr">{{ number_format($amount, 0) }}</strong>
                <span>{{ __('ui.amount_in_dinar') }}</span>
            </span>
        </div>

        <div class="paper-voucher__row">
            <div class="paper-voucher__line">
                <span class="paper-voucher__lab">{{ __('ui.amount_words_dinar') }}</span>
                <span class="paper-voucher__val paper-voucher__val--words">{{ $words }}</span>
            </div>
        </div>

        <div class="paper-voucher__row">
            <div class="paper-voucher__line">
                <span class="paper-voucher__lab paper-voucher__lab--dark">{{ __('ui.notes') }}</span>
                <span class="paper-voucher__val">{{ $collection->note ?: '—' }}</span>
            </div>
        </div>

        <div class="paper-voucher__boxes">
            <div class="paper-voucher__box">
                <em>IQD</em>
                <strong dir="ltr">{{ number_format($amount, 0) }}</strong>
                <span>{{ __('ui.amount_received') }}</span>
            </div>
            <div class="paper-voucher__box">
                <em>IQD</em>
                <strong dir="ltr">{{ number_format($remaining, 0) }}</strong>
                <span>{{ __('ui.amount_remaining') }}</span>
            </div>
        </div>
    </div>

    <footer class="paper-voucher__foot">
        <div class="paper-voucher__phones">
            @foreach ($phones as $phone)
                <span dir="ltr">{{ $phone }}</span>
            @endforeach
        </div>
        <div class="paper-voucher__sign">
            <span>{{ __('ui.collector_money_sign') }}</span>
            <span class="paper-voucher__sign-line" aria-hidden="true"></span>
        </div>
        <div class="paper-voucher__sign">
            <span>{{ __('ui.payer_sign') }}</span>
            <span class="paper-voucher__sign-line" aria-hidden="true"></span>
        </div>
    </footer>
</article>
