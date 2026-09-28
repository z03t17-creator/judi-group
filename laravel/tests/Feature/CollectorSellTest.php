<?php

namespace Tests\Feature;

use App\Enums\CollectorChannel;
use App\Enums\InvoiceStatus;
use App\Enums\InvoiceType;
use App\Enums\Role;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Models\Warehouse;
use App\Support\InvoiceNumber;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CollectorSellTest extends TestCase
{
    use RefreshDatabase;

    public function test_invoice_number_increments(): void
    {
        $this->assertSame('INV-000001', InvoiceNumber::next(null));
        $this->assertSame('INV-000002', InvoiceNumber::next('INV-000001'));
        $this->assertSame('INV-000010', InvoiceNumber::next('INV-000009'));
    }

    public function test_collector_creates_debt_only_invoice_and_sees_print_form(): void
    {
        $this->seed();

        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $store = Store::query()->firstOrFail();
        $product = Product::query()->with('units')->firstOrFail();
        $unit = $product->units->firstWhere('unit', 'carton') ?? $product->units->first();

        $response = $this->actingAs($collector)->post(route('invoices.store'), [
            'store_id' => $store->id,
            'lines' => [
                ['product_unit_id' => $unit->id, 'quantity' => 2],
            ],
        ]);

        $invoice = Invoice::query()->with('items')->first();
        $this->assertNotNull($invoice);
        $response->assertRedirect(route('invoices.show', [$invoice, 'print' => 1]));

        $this->assertSame('INV-000001', $invoice->invoice_number);
        $this->assertSame(InvoiceType::Debt, $invoice->invoice_type);
        $this->assertSame(InvoiceStatus::PendingSend, $invoice->status);
        $this->assertSame(CollectorChannel::Wholesale, $invoice->channel);
        $this->assertCount(1, $invoice->items);
        $this->assertSame((string) $invoice->total_amount, (string) $invoice->debt_amount);
        $this->assertSame('0.00', (string) $invoice->paid_amount);

        $store->refresh();
        $this->assertSame((string) $invoice->total_amount, (string) $store->current_debt);

        $this->assertNull(
            \App\Models\Collection::query()->where('invoice_id', $invoice->id)->first(),
        );

        $expected = number_format((float) $unit->price_wholesale * 2, 2, '.', '');
        $this->assertSame($expected, (string) $invoice->total_amount);

        $print = $this->actingAs($collector)->get(route('invoices.show', $invoice));
        $print->assertOk();
        $print->assertSee('judi-logo.jpg', false);
        $print->assertSee($invoice->invoice_number, false);
        $print->assertSee('ن.تاک', false);
        $print->assertSee('ن.کۆ', false);
        $print->assertSee('کۆی گشتی', false);
        $print->assertSee('قەرز', false);
        $print->assertDontSee('<span>نەقد</span>', false);
        $print->assertSee('بەڕێز', false);
        $print->assertSee('مەندوب', false);
        $print->assertSee('ئیمزای وەرگر', false);
        $print->assertSee($store->name, false);
        $print->assertSee(__('ui.visit_slip_title'), false);
        $print->assertSee(__('ui.print_slip'), false);
    }

    public function test_debt_invoice_increases_store_debt(): void
    {
        $this->seed();

        $collector = User::query()->where('email', 'retail@judi.local')->firstOrFail();
        $store = Store::query()->firstOrFail();
        $store->update(['current_debt' => 1000]);

        $product = Product::query()->with('units')->firstOrFail();
        $unit = $product->units->firstWhere('unit', 'piece') ?? $product->units->first();

        $this->actingAs($collector)->post(route('invoices.store'), [
            'store_id' => $store->id,
            'lines' => [
                ['product_unit_id' => $unit->id, 'quantity' => 3],
            ],
        ])->assertRedirect();

        $invoice = Invoice::query()->latest('id')->firstOrFail();
        $lineTotal = (float) $unit->price_retail * 3;

        $this->assertSame(InvoiceType::Debt, $invoice->invoice_type);
        $this->assertSame(number_format($lineTotal, 2, '.', ''), (string) $invoice->debt_amount);
        $this->assertSame('0.00', (string) $invoice->paid_amount);

        $store->refresh();
        $this->assertSame(number_format(1000 + $lineTotal, 2, '.', ''), (string) $store->current_debt);

        $print = $this->actingAs($collector)->get(route('invoices.show', $invoice));
        $print->assertOk();
        $print->assertSee(__('ui.invoice_grand_total'), false);
        $print->assertSee(__('ui.invoice_debt'), false); // type label
        $print->assertDontSee('<span>نەقد</span>', false);
        $print->assertDontSee('is-remain', false);
    }

    public function test_collector_cannot_view_another_collectors_invoice(): void
    {
        $this->seed();

        $wholesale = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $retail = User::query()->where('email', 'retail@judi.local')->firstOrFail();
        $store = Store::query()->firstOrFail();
        $warehouse = Warehouse::primary();
        $product = Product::query()->with('units')->firstOrFail();
        $unit = $product->units->first();

        $invoice = Invoice::createSale(
            $wholesale,
            $store,
            $warehouse,
            [['product_unit_id' => $unit->id, 'quantity' => 1]],
        );

        $this->actingAs($retail)
            ->get(route('invoices.show', $invoice))
            ->assertForbidden();
    }

    public function test_collector_discount_invoice_and_line_and_gifts(): void
    {
        $this->seed();

        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $collector->update(['max_discount_percent' => 10, 'max_gift_percent' => 50]);
        $store = Store::query()->firstOrFail();
        $product = Product::query()->with('units')->firstOrFail();
        $unit = $product->units->firstWhere('unit', 'carton') ?? $product->units->first();

        $this->actingAs($collector)->post(route('invoices.store'), [
            'store_id' => $store->id,
            'discount_percent' => 50,
            'lines' => [
                ['product_unit_id' => $unit->id, 'quantity' => 2, 'gift_quantity' => 1],
            ],
        ])->assertSessionHasErrors('discount_percent');

        $this->actingAs($collector)->post(route('invoices.store'), [
            'store_id' => $store->id,
            'discount_percent' => 10,
            'lines' => [
                ['product_unit_id' => $unit->id, 'quantity' => 2, 'gift_quantity' => 2],
            ],
        ])->assertSessionHasErrors('lines');

        $this->actingAs($collector)->post(route('invoices.store'), [
            'store_id' => $store->id,
            'discount_percent' => 0,
            'lines' => [
                [
                    'product_unit_id' => $unit->id,
                    'quantity' => 2,
                    'gift_quantity' => 0,
                    'discount_percent' => 50,
                ],
            ],
        ])->assertSessionHasErrors('lines.0.discount_percent');

        $this->actingAs($collector)->post(route('invoices.store'), [
            'store_id' => $store->id,
            'discount_percent' => 10,
            'lines' => [
                [
                    'product_unit_id' => $unit->id,
                    'quantity' => 2,
                    'gift_quantity' => 1,
                    'discount_percent' => 10,
                ],
            ],
        ])->assertRedirect();

        $invoice = Invoice::query()->latest('id')->firstOrFail();
        $item = $invoice->items->first();
        $gross = (float) $unit->price_wholesale * 2;
        $lineDisc = round($gross * 0.1, 2);
        $lineNet = round($gross - $lineDisc, 2);
        $invoiceDisc = round($lineNet * 0.1, 2);
        $total = round($lineNet - $invoiceDisc, 2);

        $this->assertSame(number_format($lineNet, 2, '.', ''), (string) $invoice->subtotal);
        $this->assertSame(number_format($lineDisc, 2, '.', ''), (string) $item->discount_amount);
        $this->assertSame('10.00', (string) $item->discount_percent);
        $this->assertSame(number_format($invoiceDisc, 2, '.', ''), (string) $invoice->discount_amount);
        $this->assertSame(number_format($total, 2, '.', ''), (string) $invoice->total_amount);
        $this->assertSame(number_format($total, 2, '.', ''), (string) $invoice->debt_amount);
        $this->assertSame('1.00', (string) $item->gift_quantity);

        $print = $this->actingAs($collector)->get(route('invoices.show', $invoice));
        $print->assertOk();
        $print->assertSee('داشکاندن', false);
        $print->assertSee('10%', false);
        $print->assertSee('دیاری', false);
    }

    public function test_accountant_cannot_create_invoice_but_can_view(): void
    {
        $this->seed();

        $accountant = User::query()->where('email', 'accountant@judi.local')->firstOrFail();
        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $store = Store::query()->firstOrFail();
        $warehouse = Warehouse::primary();
        $product = Product::query()->with('units')->firstOrFail();
        $unit = $product->units->first();

        $invoice = Invoice::createSale(
            $collector,
            $store,
            $warehouse,
            [['product_unit_id' => $unit->id, 'quantity' => 1]],
        );

        $this->actingAs($accountant)
            ->get(route('invoices.create'))
            ->assertForbidden();

        $this->actingAs($accountant)
            ->get(route('invoices.show', $invoice))
            ->assertOk()
            ->assertSee($invoice->invoice_number, false);
    }

    public function test_admin_has_sell_access_by_default(): void
    {
        $admin = User::factory()->create([
            'role' => Role::Admin,
            'collector_channel' => null,
        ]);

        $this->actingAs($admin)
            ->get(route('invoices.create'))
            ->assertOk();
    }

    public function test_collector_bottom_nav_uses_stores_and_invoices(): void
    {
        $this->seed();

        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();

        $html = $this->actingAs($collector)
            ->get(route('home'))
            ->assertOk()
            ->getContent();

        $this->assertNotFalse(preg_match('/class="field-bottom-nav".*?<\/nav>/s', $html, $match));
        $nav = $match[0];

        $this->assertStringContainsString(__('ui.stores'), $nav);
        $this->assertStringContainsString(__('ui.invoices'), $nav);
        $this->assertStringContainsString('stores', $nav);
        $this->assertStringContainsString('invoices', $nav);
        $this->assertStringContainsString(__('ui.visit'), $nav);
        $this->assertStringNotContainsString(__('ui.reports'), $nav);
        $this->assertStringNotContainsString(__('ui.expenses'), $nav);
    }

    public function test_sale_ignores_paid_now_and_stays_full_debt(): void
    {
        $this->seed();

        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $store = Store::query()->firstOrFail();
        $store->update(['current_debt' => 0]);
        $product = Product::query()->with('units')->firstOrFail();
        $unit = $product->units->firstWhere('unit', 'carton') ?? $product->units->first();
        $total = (float) $unit->price_wholesale * 2;

        $this->actingAs($collector)->post(route('invoices.store'), [
            'store_id' => $store->id,
            'paid_now' => round($total / 2, 0),
            'invoice_type' => 'cash',
            'lines' => [
                ['product_unit_id' => $unit->id, 'quantity' => 2],
            ],
        ])->assertRedirect();

        $invoice = Invoice::query()->latest('id')->firstOrFail();

        $this->assertSame(InvoiceType::Debt, $invoice->invoice_type);
        $this->assertSame('0.00', (string) $invoice->paid_amount);
        $this->assertSame(number_format($total, 2, '.', ''), (string) $invoice->debt_amount);

        $store->refresh();
        $this->assertSame(number_format($total, 2, '.', ''), (string) $store->current_debt);
        $this->assertNull(
            \App\Models\Collection::query()->where('invoice_id', $invoice->id)->first(),
        );
    }
}
