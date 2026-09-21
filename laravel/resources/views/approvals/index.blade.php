@extends('layouts.app')

@section('title', __('ui.approvals').' — JUDI')

@section('content')
<section class="page approvals-page" data-approvals>
    <header class="page__header page__header--iconed">
        @include('partials.icon-badge', ['icon' => 'clipboard', 'tone' => 'teal', 'size' => 'lg'])
        <div class="page__header-text">
            <h1 class="page__title">{{ __('ui.approvals') }}</h1>
            <p class="page__lead">{{ __('ui.approvals_lead') }}</p>
        </div>
        <div class="page__actions">
            <span class="approvals-total ltr-inline">{{ number_format($counts['all']) }}</span>
        </div>
    </header>

    @include('partials.flash')

    @if ($errors->has('approvals'))
        <div class="alert alert--danger" role="alert">{{ $errors->first('approvals') }}</div>
    @endif

    <nav class="approvals-tabs" aria-label="{{ __('ui.approvals') }}">
        <a href="{{ route('approvals.index', ['tab' => 'all']) }}" class="approvals-tabs__item {{ $tab === 'all' ? 'is-active' : '' }}">
            {{ __('ui.all') }}
            <em>{{ $counts['all'] }}</em>
        </a>
        @if ($canRelease)
            <a href="{{ route('approvals.index', ['tab' => 'releases']) }}" class="approvals-tabs__item {{ $tab === 'releases' ? 'is-active' : '' }}">
                {{ __('ui.releases') }}
                <em>{{ $counts['releases'] }}</em>
            </a>
        @endif
        @if ($canConfirmCollections)
            <a href="{{ route('approvals.index', ['tab' => 'collections']) }}" class="approvals-tabs__item {{ $tab === 'collections' ? 'is-active' : '' }}">
                {{ __('ui.collections') }}
                <em>{{ $counts['collections'] }}</em>
            </a>
        @endif
        @if ($canApproveDevices)
            <a href="{{ route('approvals.index', ['tab' => 'devices']) }}" class="approvals-tabs__item {{ $tab === 'devices' ? 'is-active' : '' }}">
                {{ __('ui.devices') }}
                <em>{{ $counts['devices'] }}</em>
            </a>
        @endif
    </nav>

    @if ($counts['all'] === 0)
        <div class="empty-state surface-panel">
            @include('partials.icon-badge', ['icon' => 'clipboard', 'tone' => 'slate', 'size' => 'lg'])
            <p class="empty-state__title">{{ __('ui.approvals_empty') }}</p>
            <p class="empty-state__hint">{{ __('ui.approvals_empty_hint') }}</p>
        </div>
    @endif

    @if ($canRelease && ($tab === 'all' || $tab === 'releases') && $releases->isNotEmpty())
        <form method="POST" action="{{ route('approvals.releases') }}" class="approvals-section" data-approval-section="releases">
            @csrf
            <input type="hidden" name="tab" value="{{ $tab }}">
            <div class="approvals-section__head">
                <div>
                    <h2 class="approvals-section__title">{{ __('ui.releases') }}</h2>
                    <p class="approvals-section__lead">{{ __('ui.releases_lead') }}</p>
                </div>
                <label class="check approvals-section__all">
                    <input type="checkbox" data-select-all>
                    <span>{{ __('ui.approvals_select_all') }}</span>
                </label>
            </div>

            <ul class="approvals-list" role="list">
                @foreach ($releases as $invoice)
                    <li class="approvals-row">
                        <label class="approvals-row__check">
                            <input type="checkbox" name="ids[]" value="{{ $invoice->id }}" data-row-check>
                            <span class="visually-hidden">{{ $invoice->invoice_number }}</span>
                        </label>
                        <a href="{{ route('invoices.show', $invoice) }}" class="approvals-row__body">
                            <strong class="approvals-row__code" dir="ltr">{{ $invoice->invoice_number }}</strong>
                            <span class="approvals-row__meta">
                                {{ $invoice->store?->name }}
                                · {{ $invoice->collector?->name }}
                                · {{ $invoice->items->count() }} {{ __('ui.invoice_lines') }}
                            </span>
                            <span class="approvals-row__amount ltr-inline">{{ number_format((float) $invoice->total_amount, 0) }}</span>
                        </a>
                    </li>
                @endforeach
            </ul>

            <div class="approvals-section__foot">
                <label class="check">
                    <input type="checkbox" name="printed_confirmed" value="1" required>
                    <span>{{ __('ui.release_printed_confirm') }}</span>
                </label>
                <div class="approvals-section__actions">
                    <button type="submit" class="btn btn--regular" name="approve_all" value="0" data-approve-selected>
                        {{ __('ui.approvals_approve_selected') }}
                        <span data-selected-count>0</span>
                    </button>
                    <button type="submit" class="btn btn--primary" name="approve_all" value="1" data-approve-all>
                        {{ __('ui.approvals_approve_all') }}
                        ({{ $releases->count() }})
                    </button>
                </div>
            </div>
        </form>
    @endif

    @if ($canConfirmCollections && ($tab === 'all' || $tab === 'collections') && $collections->isNotEmpty())
        <form method="POST" action="{{ route('approvals.collections') }}" class="approvals-section" data-approval-section="collections">
            @csrf
            <input type="hidden" name="tab" value="{{ $tab }}">
            <div class="approvals-section__head">
                <div>
                    <h2 class="approvals-section__title">{{ __('ui.collections') }}</h2>
                    <p class="approvals-section__lead">{{ __('ui.approvals_collections_lead') }}</p>
                </div>
                <label class="check approvals-section__all">
                    <input type="checkbox" data-select-all>
                    <span>{{ __('ui.approvals_select_all') }}</span>
                </label>
            </div>

            <ul class="approvals-list" role="list">
                @foreach ($collections as $collection)
                    <li class="approvals-row">
                        <label class="approvals-row__check">
                            <input type="checkbox" name="ids[]" value="{{ $collection->id }}" data-row-check>
                            <span class="visually-hidden">{{ $collection->receipt_number }}</span>
                        </label>
                        <a href="{{ route('collections.show', $collection) }}" class="approvals-row__body">
                            <strong class="approvals-row__code" dir="ltr">{{ $collection->receipt_number }}</strong>
                            <span class="approvals-row__meta">
                                {{ $collection->store?->name }}
                                · {{ $collection->collector?->name }}
                                @if ($collection->invoice)
                                    · {{ $collection->invoice->invoice_number }}
                                @endif
                                · {{ $collection->collected_at?->format('Y-m-d') }}
                            </span>
                            <span class="approvals-row__amount ltr-inline">{{ number_format((float) $collection->amount, 0) }}</span>
                        </a>
                    </li>
                @endforeach
            </ul>

            <div class="approvals-section__foot">
                <div class="approvals-section__actions">
                    <button type="submit" class="btn btn--regular" name="approve_all" value="0" data-approve-selected>
                        {{ __('ui.approvals_approve_selected') }}
                        <span data-selected-count>0</span>
                    </button>
                    <button type="submit" class="btn btn--primary" name="approve_all" value="1" data-approve-all>
                        {{ __('ui.approvals_approve_all') }}
                        ({{ $collections->count() }})
                    </button>
                </div>
            </div>
        </form>
    @endif

    @if ($canApproveDevices && ($tab === 'all' || $tab === 'devices') && $devices->isNotEmpty())
        <form method="POST" action="{{ route('approvals.devices') }}" class="approvals-section" data-approval-section="devices">
            @csrf
            <input type="hidden" name="tab" value="{{ $tab }}">
            <div class="approvals-section__head">
                <div>
                    <h2 class="approvals-section__title">{{ __('ui.devices') }}</h2>
                    <p class="approvals-section__lead">{{ __('ui.approvals_devices_lead') }}</p>
                </div>
                <label class="check approvals-section__all">
                    <input type="checkbox" data-select-all>
                    <span>{{ __('ui.approvals_select_all') }}</span>
                </label>
            </div>

            <ul class="approvals-list" role="list">
                @foreach ($devices as $device)
                    <li class="approvals-row">
                        <label class="approvals-row__check">
                            <input type="checkbox" name="ids[]" value="{{ $device->id }}" data-row-check>
                            <span class="visually-hidden">{{ $device->user?->name }}</span>
                        </label>
                        <div class="approvals-row__body">
                            <strong class="approvals-row__code">{{ $device->user?->name }}</strong>
                            <span class="approvals-row__meta">
                                {{ $device->user?->role?->label() }}
                                · <span class="ltr-inline">{{ $device->ip_address }}</span>
                                · {{ \Illuminate\Support\Str::limit($device->user_agent, 48) }}
                            </span>
                        </div>
                    </li>
                @endforeach
            </ul>

            <div class="approvals-section__foot">
                <div class="approvals-section__actions">
                    <button type="submit" class="btn btn--regular" name="approve_all" value="0" data-approve-selected>
                        {{ __('ui.approvals_approve_selected') }}
                        <span data-selected-count>0</span>
                    </button>
                    <button type="submit" class="btn btn--primary" name="approve_all" value="1" data-approve-all>
                        {{ __('ui.approvals_approve_all') }}
                        ({{ $devices->count() }})
                    </button>
                </div>
            </div>
        </form>
    @endif
</section>

<script src="{{ asset('js/approvals.js') }}?v=1" defer></script>
@endsection
