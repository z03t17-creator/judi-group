<?php

namespace App\Support;

final class Brand
{
    public static function name(?string $locale = null): string
    {
        return (string) __('ui.brand_name', [], $locale);
    }

    public static function short(?string $locale = null): string
    {
        return (string) __('ui.brand_short', [], $locale);
    }

    public static function tagline(?string $locale = null): string
    {
        return (string) __('ui.brand_tagline', [], $locale);
    }

    /**
     * Company payload for invoices, slips, reports, and share text.
     *
     * @return array{name: string, tagline: string, phones: list<string>, address: string, legal_name: string, branch: string}
     */
    public static function company(?string $locale = null): array
    {
        $base = config('judi.company', []);

        return [
            'name' => self::name($locale),
            'tagline' => self::tagline($locale),
            'phones' => array_values($base['phones'] ?? []),
            'address' => (string) ($base['address'] ?? ''),
            'legal_name' => filled($base['legal_name'] ?? null)
                ? (string) $base['legal_name']
                : (string) __('ui.company_legal_name', [], $locale),
            'branch' => (string) ($base['branch'] ?? ''),
        ];
    }
}
