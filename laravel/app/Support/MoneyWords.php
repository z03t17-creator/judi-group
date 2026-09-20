<?php

namespace App\Support;

final class MoneyWords
{
    /**
     * Spell an IQD amount in the current (or given) locale.
     */
    public static function dinar(int|float $amount, ?string $locale = null): string
    {
        $n = (int) round(abs((float) $amount));
        $locale ??= (string) app()->getLocale();
        $words = match ($locale) {
            'ar' => self::arabic($n),
            'en' => self::english($n),
            default => self::kurdish($n),
        };

        return trim($words.' '.__('ui.dinar'));
    }

    private static function kurdish(int $n): string
    {
        if ($n === 0) {
            return 'سفر';
        }

        return self::ckbChunk($n);
    }

    private static function ckbChunk(int $n): string
    {
        $ones = ['', 'یەک', 'دوو', 'سێ', 'چوار', 'پێنج', 'شەش', 'حەوت', 'هەشت', 'نۆ'];
        $teens = ['دە', 'یازدە', 'دوازدە', 'سێزدە', 'چواردە', 'پازدە', 'شازدە', 'حەڤدە', 'هەژدە', 'نۆزدە'];
        $tens = ['', '', 'بیست', 'سی', 'چل', 'پەنجا', 'شەست', 'حەفتا', 'هەشتا', 'نەوەد'];

        if ($n >= 1_000_000_000) {
            return self::joinCkb(self::ckbChunk(intdiv($n, 1_000_000_000)), 'ملیار', self::ckbChunk($n % 1_000_000_000));
        }
        if ($n >= 1_000_000) {
            return self::joinCkb(self::ckbChunk(intdiv($n, 1_000_000)), 'ملیۆن', self::ckbChunk($n % 1_000_000));
        }
        if ($n >= 1000) {
            $th = intdiv($n, 1000);
            $head = $th === 1 ? 'هەزار' : self::ckbChunk($th).' هەزار';

            return self::joinCkb($head, '', self::ckbChunk($n % 1000));
        }
        if ($n >= 100) {
            $h = intdiv($n, 100);
            $head = $h === 1 ? 'سەد' : $ones[$h].' سەد';

            return self::joinCkb($head, '', self::ckbChunk($n % 100));
        }
        if ($n >= 20) {
            $t = intdiv($n, 10);
            $o = $n % 10;

            return $o === 0 ? $tens[$t] : $tens[$t].' و '.$ones[$o];
        }
        if ($n >= 10) {
            return $teens[$n - 10];
        }

        return $ones[$n];
    }

    private static function joinCkb(string $left, string $unit, string $right): string
    {
        $head = trim($left.($unit !== '' ? ' '.$unit : ''));
        $right = trim($right);
        if ($right === '' || $right === 'سفر') {
            return $head;
        }

        return $head.' و '.$right;
    }

    private static function arabic(int $n): string
    {
        if ($n === 0) {
            return 'صفر';
        }

        return self::arChunk($n);
    }

    private static function arChunk(int $n): string
    {
        $ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
        $teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
        $tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];

        if ($n >= 1_000_000_000) {
            return self::joinAr(self::arChunk(intdiv($n, 1_000_000_000)), 'مليار', self::arChunk($n % 1_000_000_000));
        }
        if ($n >= 1_000_000) {
            return self::joinAr(self::arChunk(intdiv($n, 1_000_000)), 'مليون', self::arChunk($n % 1_000_000));
        }
        if ($n >= 1000) {
            $th = intdiv($n, 1000);
            $head = $th === 1 ? 'ألف' : ($th === 2 ? 'ألفان' : self::arChunk($th).' ألف');

            return self::joinAr($head, '', self::arChunk($n % 1000));
        }
        if ($n >= 100) {
            $h = intdiv($n, 100);
            $heads = [1 => 'مائة', 2 => 'مائتان'];
            $head = $heads[$h] ?? ($ones[$h].' مائة');

            return self::joinAr($head, '', self::arChunk($n % 100));
        }
        if ($n >= 20) {
            $t = intdiv($n, 10);
            $o = $n % 10;
            if ($o === 0) {
                return $tens[$t];
            }

            return $ones[$o].' و '.$tens[$t];
        }
        if ($n >= 10) {
            return $teens[$n - 10];
        }

        return $ones[$n];
    }

    private static function joinAr(string $left, string $unit, string $right): string
    {
        $head = trim($left.($unit !== '' ? ' '.$unit : ''));
        $right = trim($right);
        if ($right === '' || $right === 'صفر') {
            return $head;
        }

        return $head.' و '.$right;
    }

    private static function english(int $n): string
    {
        if (class_exists(\NumberFormatter::class)) {
            $fmt = new \NumberFormatter('en', \NumberFormatter::SPELLOUT);

            return (string) $fmt->format($n);
        }

        if ($n === 0) {
            return 'zero';
        }

        $ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
        $tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

        if ($n >= 1_000_000_000) {
            return trim(self::english(intdiv($n, 1_000_000_000)).' billion '.self::english($n % 1_000_000_000));
        }
        if ($n >= 1_000_000) {
            return trim(self::english(intdiv($n, 1_000_000)).' million '.self::english($n % 1_000_000));
        }
        if ($n >= 1000) {
            return trim(self::english(intdiv($n, 1000)).' thousand '.self::english($n % 1000));
        }
        if ($n >= 100) {
            return trim($ones[intdiv($n, 100)].' hundred '.self::english($n % 100));
        }
        if ($n >= 20) {
            $o = $n % 10;

            return $tens[intdiv($n, 10)].($o ? '-'.$ones[$o] : '');
        }

        return $ones[$n];
    }
}
