<?php

namespace App\Support;

final class Barcode
{
    public static function ean13Checksum(string $digits12): int
    {
        if (! preg_match('/^\d{12}$/', $digits12)) {
            throw new \InvalidArgumentException('EAN-13 body must be 12 digits');
        }

        $sum = 0;
        for ($i = 0; $i < 12; $i++) {
            $n = (int) $digits12[$i];
            $sum += $i % 2 === 0 ? $n : $n * 3;
        }

        return (10 - ($sum % 10)) % 10;
    }

    public static function hashSeed(string $seed): int
    {
        $hash = 2166136261;
        $len = strlen($seed);
        for ($i = 0; $i < $len; $i++) {
            $hash ^= ord($seed[$i]);
            $hash = ($hash * 16777619) & 0xFFFFFFFF;
        }

        return $hash;
    }

    public static function generateEan13FromSku(string $sku): string
    {
        $seed = strtoupper(trim($sku)) ?: 'JUDI';
        $body = substr(str_pad((string) self::hashSeed($seed), 9, '0', STR_PAD_LEFT), -9);
        $twelve = '628'.$body;

        return $twelve.self::ean13Checksum($twelve);
    }

    public static function generateSkuFromName(string $name): string
    {
        $trimmed = trim($name);
        if ($trimmed === '') {
            return 'PRD-'.substr((string) time(), -6);
        }

        $latin = strtoupper(preg_replace('/[^A-Za-z0-9]+/', '-', $trimmed) ?? '');
        $latin = trim(preg_replace('/-+/', '-', $latin) ?? '', '-');

        if (strlen($latin) >= 2 && preg_match('/[A-Z]/', $latin)) {
            return substr($latin, 0, 28);
        }

        $suffix = strtoupper(substr(base_convert((string) self::hashSeed($trimmed), 10, 36), 0, 4));

        return substr('PRD-'.$suffix.'-'.substr((string) time(), -4), 0, 28);
    }
}
