<?php

namespace App\Enums;

enum ExpenseCategory: string
{
    case Food = 'food';
    case Transport = 'transport';
    case Phone = 'phone';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Food => __('ui.expense_food'),
            self::Transport => __('ui.expense_transport'),
            self::Phone => __('ui.expense_phone'),
            self::Other => __('ui.expense_other'),
        };
    }
}
