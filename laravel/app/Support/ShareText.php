<?php

namespace App\Support;

use App\Models\Collection;
use App\Models\Invoice;
use App\Models\Purchase;

final class ShareText
{
    /**
     * Plain-text invoice summary for WhatsApp / social share (no system URL).
     */
    public static function invoice(Invoice $invoice, ?array $company = null): string
    {
        $company ??= config('judi.company', []);
        $lines = [];

        $lines[] = ($company['name'] ?? 'JUDI');
        if (! empty($company['tagline'])) {
            $lines[] = (string) $company['tagline'];
        }
        $lines[] = '';
        $lines[] = __('ui.invoice_no').': '.$invoice->invoice_number;
        $lines[] = __('ui.invoice_date').': '.($invoice->created_at?->timezone(config('app.timezone'))->format('Y-m-d') ?? '—');
        $lines[] = __('ui.invoice_type').': '.$invoice->invoice_type->label();
        $lines[] = __('ui.invoice_store').': '.($invoice->store?->name ?? '—');
        if ($invoice->store?->owner_name) {
            $lines[] = __('ui.invoice_respect').': '.$invoice->store->owner_name;
        }
        if ($invoice->collector) {
            $lines[] = __('ui.invoice_delegate').': '.$invoice->collector->name;
        }
        $lines[] = '';

        foreach ($invoice->items as $item) {
            $qty = rtrim(rtrim(number_format((float) $item->quantity, 2, '.', ''), '0'), '.') ?: '0';
            $gift = (float) $item->gift_quantity;
            $giftPart = $gift > 0
                ? ' + '.__('ui.invoice_gift').' '.rtrim(rtrim(number_format($gift, 2, '.', ''), '0'), '.')
                : '';
            $lines[] = '• '.$item->product_name
                .' — '.$qty.$giftPart.' '.$item->unitLabel()
                .' × '.number_format((float) $item->unit_price, 0)
                .' = '.number_format((float) $item->line_total, 0);
        }

        $lines[] = '';
        $lines[] = __('ui.invoice_grand_total').': '.number_format((float) $invoice->subtotal, 0);
        if ((float) $invoice->discount_percent > 0) {
            $pct = rtrim(rtrim(number_format((float) $invoice->discount_percent, 2, '.', ''), '0'), '.');
            $lines[] = __('ui.invoice_discount').': '.$pct.'%';
            $lines[] = __('ui.invoice_net_total').': '.number_format((float) $invoice->total_amount, 0);
        }
        if ((float) $invoice->paid_amount > 0) {
            $lines[] = __('ui.invoice_paid_now').': '.number_format((float) $invoice->paid_amount, 0);
        }
        if ((float) $invoice->debt_amount > 0) {
            $lines[] = __('ui.invoice_remaining').': '.number_format((float) $invoice->debt_amount, 0);
        }

        if (! empty($company['phones'])) {
            $lines[] = '';
            $lines[] = __('ui.phone').': '.implode(' · ', $company['phones']);
        }

        return implode("\n", $lines);
    }

    /**
     * Plain-text collection receipt (no system URL).
     */
    public static function collection(Collection $collection, ?array $company = null): string
    {
        $company ??= config('judi.company', []);
        $lines = [];

        $lines[] = ($company['name'] ?? 'JUDI');
        if (! empty($company['tagline'])) {
            $lines[] = (string) $company['tagline'];
        }
        $lines[] = '';
        $lines[] = __('ui.collection_receipt_no').': '.$collection->receipt_number;
        $lines[] = __('ui.invoice_date').': '.($collection->collected_at?->format('Y-m-d') ?? '—');
        $lines[] = __('ui.collection_debt_payment');
        $lines[] = __('ui.invoice_store').': '.($collection->store?->name ?? '—');
        if ($collection->collector) {
            $lines[] = __('ui.invoice_delegate').': '.$collection->collector->name;
        }
        $lines[] = '';
        $lines[] = __('ui.collection_amount').': '.number_format((float) $collection->amount, 0).' '.($collection->currency ?: 'IQD');
        $lines[] = __('ui.current_debt').': '.number_format((float) ($collection->store?->current_debt ?? 0), 0);
        if ($collection->note) {
            $lines[] = __('ui.notes').': '.$collection->note;
        }

        if (! empty($company['phones'])) {
            $lines[] = '';
            $lines[] = __('ui.phone').': '.implode(' · ', $company['phones']);
        }

        return implode("\n", $lines);
    }

    /**
     * Plain-text purchase summary (no system URL).
     */
    public static function purchase(Purchase $purchase, ?array $company = null): string
    {
        $company ??= config('judi.company', []);
        $lines = [];

        $lines[] = ($company['name'] ?? 'JUDI');
        $lines[] = '';
        $lines[] = __('ui.purchase_no').': '.$purchase->purchase_number;
        $lines[] = __('ui.invoice_date').': '.($purchase->purchased_at?->format('Y-m-d') ?? '—');
        $lines[] = __('ui.supplier').': '.($purchase->supplier?->name ?: '—');
        if ($purchase->warehouse) {
            $lines[] = __('ui.stock').': '.$purchase->warehouse->displayName();
        }
        $lines[] = '';

        foreach ($purchase->items as $item) {
            $qty = rtrim(rtrim(number_format((float) $item->quantity, 2, '.', ''), '0'), '.') ?: '0';
            $lines[] = '• '.$item->product_name
                .' — '.$qty.' '.$item->unit->label()
                .' × '.number_format((float) $item->unit_cost, 0)
                .' = '.number_format((float) $item->line_total, 0);
        }

        $lines[] = '';
        $lines[] = __('ui.invoice_grand_total').': '.number_format((float) $purchase->total_cost, 0);

        return implode("\n", $lines);
    }
}
