<?php

namespace App\Enums;

enum StoreRejectStatus: string
{
    case Posted = 'posted';
    case Voided = 'voided';

    public function label(): string
    {
        return match ($this) {
            self::Posted => __('ui.reject_status_posted'),
            self::Voided => __('ui.reject_status_voided'),
        };
    }
}
