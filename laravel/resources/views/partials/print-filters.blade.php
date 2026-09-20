@php
    /**
     * Build human-readable filter chips for print.
     * Expects the same variables as list-filters (or pass $printFilters ready-made).
     */
    $printFilters = $printFilters ?? null;

    if ($printFilters === null) {
        $period = $period ?? null;
        $from = $from ?? null;
        $to = $to ?? null;
        $channel = $channel ?? '';
        $invoiceType = $invoiceType ?? '';
        $status = $status ?? '';
        $category = $category ?? '';
        $selectedCollectorId = (int) ($selectedCollectorId ?? 0);
        $selectedStoreId = (int) ($selectedStoreId ?? 0);
        $supplierId = (int) ($supplierId ?? 0);
        $q = $q ?? '';
        $collectors = $collectors ?? collect();
        $stores = $stores ?? collect();
        $suppliers = $suppliers ?? collect();
        $categories = $categories ?? [];
        $statusOptions = $statusOptions ?? [];

        $periodLabels = [
            'all' => __('ui.period_all'),
            'today' => __('ui.period_today'),
            '7d' => __('ui.period_7d'),
            'month' => __('ui.period_month'),
            'last_month' => __('ui.period_last_month'),
            'custom' => __('ui.period_custom'),
        ];

        $printFilters = [];

        if ($period) {
            $printFilters[] = [
                'label' => __('ui.print_filter_period'),
                'value' => $periodLabels[$period] ?? $period,
            ];
        }

        if ($from || $to) {
            $printFilters[] = [
                'label' => __('ui.print_filter_dates'),
                'value' => trim(($from ?: '…').' – '.($to ?: '…')),
                'ltr' => true,
            ];
        }

        if ($channel !== '') {
            $printFilters[] = [
                'label' => __('ui.collector_channel'),
                'value' => $channel === 'wholesale'
                    ? __('ui.channel_wholesale_mandub')
                    : ($channel === 'retail' ? __('ui.channel_retail_mandub') : $channel),
            ];
        }

        if ($invoiceType !== '') {
            $printFilters[] = [
                'label' => __('ui.invoice_type'),
                'value' => $invoiceType === 'cash'
                    ? __('ui.invoice_cash')
                    : ($invoiceType === 'debt' ? __('ui.invoice_debt') : $invoiceType),
            ];
        }

        if ($status !== '') {
            $printFilters[] = [
                'label' => __('ui.invoice_status'),
                'value' => $statusOptions[$status] ?? $status,
            ];
        }

        if ($category !== '') {
            $catLabel = $category;
            foreach ($categories as $cat) {
                if ((is_object($cat) && ($cat->value ?? null) === $category) || (is_string($cat) && $cat === $category)) {
                    $catLabel = is_object($cat) ? $cat->label() : $cat;
                    break;
                }
            }
            $printFilters[] = [
                'label' => __('ui.expense_category'),
                'value' => $catLabel,
            ];
        }

        if ($selectedCollectorId > 0) {
            $collector = $collectors->firstWhere('id', $selectedCollectorId);
            $collectorName = $collector?->name ?? ('#'.$selectedCollectorId);
            if ($collector?->collector_channel) {
                $collectorName .= ' · '.$collector->collector_channel->mandubLabel();
            }
            $printFilters[] = [
                'label' => __('ui.invoice_delegate'),
                'value' => $collectorName,
            ];
        }

        if ($selectedStoreId > 0) {
            $storeName = $stores->firstWhere('id', $selectedStoreId)?->name
                ?? ('#'.$selectedStoreId);
            $printFilters[] = [
                'label' => __('ui.invoice_store'),
                'value' => $storeName,
            ];
        }

        if ($supplierId > 0) {
            $supplierName = $suppliers->firstWhere('id', $supplierId)?->name
                ?? ('#'.$supplierId);
            $printFilters[] = [
                'label' => __('ui.supplier'),
                'value' => $supplierName,
            ];
        }

        if ($q !== '') {
            $printFilters[] = [
                'label' => __('ui.search'),
                'value' => $q,
            ];
        }
    }
@endphp

@if (! empty($printFilters))
    <div class="print-filters print-only" aria-hidden="true">
        <p class="print-filters__label">{{ __('ui.print_filters') }}</p>
        <ul class="print-filters__list">
            @foreach ($printFilters as $filter)
                <li class="print-filters__item">
                    <span class="print-filters__key">{{ $filter['label'] }}</span>
                    <strong class="print-filters__val" @if (! empty($filter['ltr'])) dir="ltr" @endif>{{ $filter['value'] }}</strong>
                </li>
            @endforeach
        </ul>
    </div>
@endif
