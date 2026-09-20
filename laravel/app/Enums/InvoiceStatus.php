<?php

namespace App\Enums;

enum InvoiceStatus: string
{
    /** Sold & printable; goods not yet sent from warehouse. */
    case PendingSend = 'pending_send';
    case Sent = 'sent';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::PendingSend => __('ui.status_pending_send'),
            self::Sent => __('ui.status_sent'),
            self::Cancelled => __('ui.status_cancelled'),
        };
    }
}
