<?php

namespace Tests\Unit;

use App\Support\MoneyWords;
use Tests\TestCase;

class MoneyWordsTest extends TestCase
{
    public function test_kurdish_dinar_words(): void
    {
        app()->setLocale('ckb');
        $this->assertSame('سفر دینار', MoneyWords::dinar(0, 'ckb'));
        $this->assertSame('پەنجا و سێ هەزار دینار', MoneyWords::dinar(53000, 'ckb'));
    }

    public function test_english_dinar_words(): void
    {
        app()->setLocale('en');
        $this->assertStringContainsString('fifty-three thousand', MoneyWords::dinar(53000, 'en'));
        $this->assertStringContainsString('dinar', MoneyWords::dinar(53000, 'en'));
    }
}
