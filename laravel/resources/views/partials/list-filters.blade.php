@php
    $period = $period ?? 'month';
    $from = $from ?? now()->startOfMonth()->toDateString();
    $to = $to ?? now()->toDateString();
    $channel = $channel ?? '';
    $invoiceType = $invoiceType ?? '';
    $status = $status ?? '';
    $category = $category ?? '';
    $selectedCollectorId = (int) ($selectedCollectorId ?? 0);
    $selectedStoreId = (int) ($selectedStoreId ?? 0);
    $supplierId = (int) ($supplierId ?? 0);
    $q = $q ?? '';
    $showAllPeriod = $showAllPeriod ?? true;
    $showChannel = $showChannel ?? false;
    $showInvoiceType = $showInvoiceType ?? false;
    $showStatus = $showStatus ?? false;
    $showCollector = $showCollector ?? false;
    $showStore = $showStore ?? false;
    $showCategory = $showCategory ?? false;
    $showSupplier = $showSupplier ?? false;
    $showSearch = $showSearch ?? false;
    $collectors = $collectors ?? collect();
    $stores = $stores ?? collect();
    $suppliers = $suppliers ?? collect();
    $categories = $categories ?? [];
    $statusOptions = $statusOptions ?? [];
    $searchPlaceholder = $searchPlaceholder ?? __('ui.search');
    $routeParams = $routeParams ?? [];
    $periodId = 'list-period-'.md5($action);

    $periodPills = [
        'today' => __('ui.period_today'),
        '7d' => __('ui.period_7d'),
        'month' => __('ui.period_month'),
        'last_month' => __('ui.period_last_month'),
    ];
    if ($showAllPeriod) {
        $periodPills = ['all' => __('ui.period_all')] + $periodPills;
    }

    $baseQuery = array_filter([
        'q' => $q !== '' ? $q : null,
        'collector_id' => $selectedCollectorId ?: null,
        'store_id' => $selectedStoreId ?: null,
        'supplier_id' => $supplierId ?: null,
        'channel' => $channel ?: null,
        'type' => $invoiceType ?: null,
        'status' => $status ?: null,
        'category' => $category ?: null,
        'from' => $period === 'custom' ? $from : null,
        'to' => $period === 'custom' ? $to : null,
    ], fn ($v) => $v !== null && $v !== '');

    $filterRoute = static function (array $extra) use ($routeParams, $baseQuery) {
        return route(Route::currentRouteName(), array_merge($routeParams, $baseQuery, $extra));
    };
@endphp

<form method="GET" action="{{ $action }}" class="report-filters no-print" id="list-filters">
    <div class="report-filters__row">
        <div class="filter-pills" role="group" aria-label="{{ __('ui.from_date') }}">
            @foreach ($periodPills as $key => $label)
                <a
                    href="{{ $filterRoute(['period' => $key]) }}"
                    class="filter-pill {{ $period === $key ? 'is-active' : '' }}"
                >{{ $label }}</a>
            @endforeach
        </div>

        @if ($showInvoiceType)
            <div class="filter-pills" role="group" aria-label="{{ __('ui.invoice_type') }}">
                <a href="{{ $filterRoute(['period' => $period, 'type' => null]) }}" class="filter-pill {{ $invoiceType === '' ? 'is-active' : '' }}">{{ __('ui.all') }}</a>
                <a href="{{ $filterRoute(['period' => $period, 'type' => 'cash']) }}" class="filter-pill {{ $invoiceType === 'cash' ? 'is-active' : '' }}">{{ __('ui.invoice_cash') }}</a>
                <a href="{{ $filterRoute(['period' => $period, 'type' => 'debt']) }}" class="filter-pill {{ $invoiceType === 'debt' ? 'is-active' : '' }}">{{ __('ui.invoice_debt') }}</a>
            </div>
        @endif

        @if ($showStatus && count($statusOptions))
            <div class="filter-pills" role="group" aria-label="{{ __('ui.invoice_status') }}">
                <a href="{{ $filterRoute(['period' => $period, 'status' => null]) }}" class="filter-pill {{ $status === '' ? 'is-active' : '' }}">{{ __('ui.all') }}</a>
                @foreach ($statusOptions as $key => $label)
                    <a href="{{ $filterRoute(['period' => $period, 'status' => $key]) }}" class="filter-pill {{ $status === $key ? 'is-active' : '' }}">{{ $label }}</a>
                @endforeach
            </div>
        @endif

        @if ($showCategory && count($categories))
            <div class="filter-pills" role="group" aria-label="{{ __('ui.expense_category') }}">
                <a href="{{ $filterRoute(['period' => $period, 'category' => null]) }}" class="filter-pill {{ $category === '' ? 'is-active' : '' }}">{{ __('ui.all') }}</a>
                @foreach ($categories as $cat)
                    <a href="{{ $filterRoute(['period' => $period, 'category' => $cat->value]) }}" class="filter-pill {{ $category === $cat->value ? 'is-active' : '' }}">{{ $cat->label() }}</a>
                @endforeach
            </div>
        @endif
    </div>

    <div class="filters-more no-print">
        <input type="checkbox" id="{{ $periodId }}-more" class="filters-more__toggle visually-hidden">
        <label for="{{ $periodId }}-more" class="filters-more__summary">{{ __('ui.filters_more') }}</label>
        <div class="report-filters__row report-filters__row--controls filters-more__panel">
        <input type="hidden" name="period" id="{{ $periodId }}" value="{{ $period }}">
        @if ($invoiceType !== '')
            <input type="hidden" name="type" value="{{ $invoiceType }}">
        @endif
        @if ($status !== '')
            <input type="hidden" name="status" value="{{ $status }}">
        @endif
        @if ($category !== '')
            <input type="hidden" name="category" value="{{ $category }}">
        @endif

        @if ($showChannel)
            <select
                class="field__input field__input--compact field__input--filter"
                name="channel"
                aria-label="{{ __('ui.collector_channel') }}"
                onchange="var c=this.form.querySelector('[name=collector_id]'); if(c) c.value='0'; this.form.submit()"
            >
                <option value="">{{ __('ui.collector_channel') }} — {{ __('ui.all') }}</option>
                <option value="wholesale" @selected($channel === 'wholesale')>{{ __('ui.channel_wholesale_mandub') }}</option>
                <option value="retail" @selected($channel === 'retail')>{{ __('ui.channel_retail_mandub') }}</option>
            </select>
        @endif

        @if ($showCollector)
            <select class="field__input field__input--compact field__input--filter" name="collector_id" aria-label="{{ __('ui.collectors') }}" onchange="this.form.submit()">
                <option value="0">{{ __('ui.report_all_collectors') }}</option>
                @php
                    $collectorsByChannel = $collectors->groupBy(fn ($c) => $c->collector_channel?->value ?? '');
                    $collectorGroups = [
                        'wholesale' => __('ui.channel_wholesale_mandub'),
                        'retail' => __('ui.channel_retail_mandub'),
                    ];
                @endphp
                @foreach ($collectorGroups as $groupKey => $groupLabel)
                    @if ($collectorsByChannel->has($groupKey) && $collectorsByChannel[$groupKey]->isNotEmpty())
                        <optgroup label="{{ $groupLabel }}">
                            @foreach ($collectorsByChannel[$groupKey] as $c)
                                <option value="{{ $c->id }}" @selected($selectedCollectorId === (int) $c->id)>
                                    {{ $c->name }}
                                </option>
                            @endforeach
                        </optgroup>
                    @endif
                @endforeach
                @foreach ($collectorsByChannel->get('', collect()) as $c)
                    <option value="{{ $c->id }}" @selected($selectedCollectorId === (int) $c->id)>
                        {{ $c->name }}
                    </option>
                @endforeach
            </select>
        @endif

        @if ($showStore)
            <select class="field__input field__input--compact" name="store_id" onchange="this.form.submit()">
                <option value="0">{{ __('ui.all_stores') }}</option>
                @foreach ($stores as $store)
                    <option value="{{ $store->id }}" @selected($selectedStoreId === (int) $store->id)>
                        {{ $store->name }}
                    </option>
                @endforeach
            </select>
        @endif

        @if ($showSupplier)
            <select class="field__input field__input--compact" name="supplier_id" onchange="this.form.submit()">
                <option value="0">{{ __('ui.all_suppliers') }}</option>
                @foreach ($suppliers as $s)
                    <option value="{{ $s->id }}" @selected($supplierId === (int) $s->id)>{{ $s->name }}</option>
                @endforeach
            </select>
        @endif

        @if ($showSearch)
            <input class="field__input field__input--compact field__input--search-inline" type="search" name="q" value="{{ $q }}" placeholder="{{ $searchPlaceholder }}" enterkeyhint="search">
        @endif

        <input class="field__input field__input--compact field__input--date" type="date" name="from" value="{{ $from }}" title="{{ __('ui.from_date') }}" onchange="document.getElementById(@json($periodId)).value='custom'">
        <span class="report-filters__sep">–</span>
        <input class="field__input field__input--compact field__input--date" type="date" name="to" value="{{ $to }}" title="{{ __('ui.to_date') }}" onchange="document.getElementById(@json($periodId)).value='custom'">
        <button type="submit" class="btn btn--primary btn--sm">{{ __('ui.search') }}</button>
        </div>
    </div>
</form>

@include('partials.print-filters', [
    'period' => $period,
    'from' => $from,
    'to' => $to,
    'channel' => $channel,
    'invoiceType' => $invoiceType,
    'status' => $status,
    'category' => $category,
    'selectedCollectorId' => $selectedCollectorId,
    'selectedStoreId' => $selectedStoreId,
    'supplierId' => $supplierId,
    'q' => $q,
    'collectors' => $collectors,
    'stores' => $stores,
    'suppliers' => $suppliers,
    'categories' => $categories,
    'statusOptions' => $statusOptions,
])
