<?php

namespace App\Enums;

enum InvoiceType: string
{
    case Cash = 'cash';
    case Debt = 'debt';

    public function label(): string
    {
        return match ($this) {
            self::Cash => __('ui.invoice_cash'),
            self::Debt => __('ui.invoice_debt'),
        };
    }
}
