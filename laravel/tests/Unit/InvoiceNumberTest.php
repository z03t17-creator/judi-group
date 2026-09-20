<?php

namespace Tests\Unit;

use App\Support\InvoiceNumber;
use PHPUnit\Framework\TestCase;

class InvoiceNumberTest extends TestCase
{
    public function test_starts_at_one_and_increments(): void
    {
        $this->assertSame('INV-000001', InvoiceNumber::next(null));
        $this->assertSame('INV-000001', InvoiceNumber::next('bad'));
        $this->assertSame('INV-000100', InvoiceNumber::next('INV-000099'));
    }
}
