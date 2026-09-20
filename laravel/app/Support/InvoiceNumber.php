<?php

namespace App\Support;

final class InvoiceNumber
{
    public static function next(?string $last): string
    {
        if ($last && preg_match('/^INV-(\d+)$/', $last, $matches)) {
            return sprintf('INV-%06d', ((int) $matches[1]) + 1);
        }

        return 'INV-000001';
    }
}
