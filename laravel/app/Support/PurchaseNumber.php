<?php

namespace App\Support;

final class PurchaseNumber
{
    public static function next(?string $last): string
    {
        if ($last && preg_match('/^PUR-(\d+)$/', $last, $matches)) {
            return sprintf('PUR-%06d', ((int) $matches[1]) + 1);
        }

        return 'PUR-000001';
    }
}
