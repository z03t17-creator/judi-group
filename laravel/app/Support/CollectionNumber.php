<?php

namespace App\Support;

final class CollectionNumber
{
    public static function next(?string $last): string
    {
        if ($last && preg_match('/^COL-(\d+)$/', $last, $matches)) {
            return sprintf('COL-%06d', ((int) $matches[1]) + 1);
        }

        return 'COL-000001';
    }
}
