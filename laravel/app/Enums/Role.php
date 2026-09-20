<?php

namespace App\Enums;

enum Role: string
{
    case Admin = 'admin';
    case Accountant = 'accountant';
    case Collector = 'collector';

    public function label(): string
    {
        return match ($this) {
            self::Admin => __('ui.role_admin'),
            self::Accountant => __('ui.role_accountant'),
            self::Collector => __('ui.role_collector'),
        };
    }
}
