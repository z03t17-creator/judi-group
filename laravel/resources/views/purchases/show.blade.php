@extends('layouts.app')

@section('title', $purchase->purchase_number.' — JUDI')

@section('content')
<section class="page">
    <header class="page__header page__header--iconed">
        @include('partials.icon-badge', ['icon' => 'package', 'tone' => 'emerald', 'size' => 'lg'])
        <div class="page__header-text">
            <h1 class="page__title" dir="ltr">{{ $purchase->purchase_number }}</h1>
            <p class="page__lead">
                {{ __('ui.purchase_posted') }}
                · {{ $purchase->warehouse?->displayName() }}
                · <span dir="ltr">{{ $purchase->purchased_at?->format('Y-m-d') }}</span>
            </p>
        </div>
        <div class="page__actions">
            <a href="{{ route('stock.index') }}" class="btn btn--regular">
                @include('partials.icons.warehouse', ['class' => 'btn__icon'])
                {{ __('ui.stock') }}
            </a>
            @include('partials.share-button', [
                'shareTitle' => $purchase->purchase_number,
                'shareText' => \App\Support\ShareText::purchase($purchase, config('judi.company')),
            ])
            <a href="{{ route('purchases.create') }}" class="btn btn--primary">
                @include('partials.icons.plus', ['class' => 'btn__icon'])
                {{ __('ui.purchase_another') }}
            </a>
        </div>
    </header>

    @include('partials.flash')

    <div class="surface-panel form-panel">
        <p>
            <strong>{{ __('ui.supplier') }}:</strong>
            {{ $purchase->supplier?->name ?: '—' }}
            @if ($purchase->createdBy)
                · {{ $purchase->createdBy->name }}
            @endif
        </p>
        @if ($purchase->notes)
            <p class="muted">{{ $purchase->notes }}</p>
        @endif

        <div class="table-wrap" style="margin-top:1rem">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>{{ __('ui.invoice_item_name') }}</th>
                        <th>{{ __('ui.unit') }}</th>
                        <th>{{ __('ui.invoice_qty') }}</th>
                        <th>{{ __('ui.stock_pieces') }}</th>
                        <th>{{ __('ui.unit_cost') }}</th>
                        <th>{{ __('ui.invoice_line_total') }}</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($purchase->items as $item)
                        <tr>
                            <td>{{ $item->product_name }}</td>
                            <td>{{ $item->unit->label() }}</td>
                            <td dir="ltr">{{ rtrim(rtrim(number_format((float) $item->quantity, 2, '.', ''), '0'), '.') }}</td>
                            <td dir="ltr">{{ number_format((int) $item->qty_pieces) }}</td>
                            <td dir="ltr">{{ number_format((float) $item->unit_cost, 0) }}</td>
                            <td dir="ltr">{{ number_format((float) $item->line_total, 0) }}</td>
                        </tr>
                    @endforeach
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="5"><strong>{{ __('ui.invoice_grand_total') }}</strong></td>
                        <td dir="ltr"><strong>{{ number_format((float) $purchase->total_cost, 0) }}</strong></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>
</section>
@endsection
