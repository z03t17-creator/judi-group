<?php

namespace App\Enums;

enum CollectionStatus: string
{
    case Pending = 'pending';
    case Confirmed = 'confirmed';

    public function label(): string
    {
        return match ($this) {
            self::Pending => __('ui.collection_status_pending'),
            self::Confirmed => __('ui.collection_status_confirmed'),
        };
    }
}
