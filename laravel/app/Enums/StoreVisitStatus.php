<?php

namespace App\Enums;

enum StoreVisitStatus: string
{
    case Open = 'open';
    case Closed = 'closed';

    public function label(): string
    {
        return match ($this) {
            self::Open => __('ui.visit_status_open'),
            self::Closed => __('ui.visit_status_closed'),
        };
    }
}
