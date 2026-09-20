<?php

namespace App\Enums;

enum CollectorChannel: string
{
    case Wholesale = 'wholesale';
    case Retail = 'retail';

    public function label(): string
    {
        return match ($this) {
            self::Wholesale => __('ui.channel_wholesale'),
            self::Retail => __('ui.channel_retail'),
        };
    }

    public function mandubLabel(): string
    {
        return match ($this) {
            self::Wholesale => __('ui.channel_wholesale_mandub'),
            self::Retail => __('ui.channel_retail_mandub'),
        };
    }
}
