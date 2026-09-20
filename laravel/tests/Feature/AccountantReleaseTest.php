<?php

namespace Tests\Feature;

use App\Enums\InvoiceStatus;
use App\Enums\InvoiceType;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\StockInventory;
use App\Models\Store;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountantReleaseTest extends TestCase
{
    use RefreshDatabase;

    public function test_accountant_can_send_invoice_and_deduct_koga_stock(): void
    {
        $this->seed();

        $accountant = User::query()->where('email', 'accountant@judi.local')->firstOrFail();
        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $warehouse = Warehouse::primary();
        $store = Store::query()->firstOrFail();
        $product = Product::query()->with('units')->firstOrFail();
        $carton = $product->units->firstWhere('unit', 'carton') ?? $product->units->first();

        StockInventory::addPieces($warehouse, $product, 5 * (int) $carton->conversion_to_piece);

        $invoice = Invoice::createSale(
            $collector,
            $store,
            $warehouse,
            InvoiceType::Cash,
            [
                [
                    'product_unit_id' => $carton->id,
                    'quantity' => 2,
                    'gift_quantity' => 1,
                ],
            ],
        );

        $this->assertSame(InvoiceStatus::PendingSend, $invoice->status);

        $response = $this->actingAs($accountant)
            ->post(route('releases.send', $invoice), [
                'printed_confirmed' => '1',
            ]);

        $response->assertRedirect(route('invoices.show', $invoice));

        $invoice->refresh();
        $this->assertSame(InvoiceStatus::Sent, $invoice->status);
        $this->assertNotNull($invoice->sent_at);
        $this->assertSame($accountant->id, (int) $invoice->sent_by_id);

        $expectedDeduct = 3 * (int) $carton->conversion_to_piece;
        $remaining = 5 * (int) $carton->conversion_to_piece - $expectedDeduct;

        $stock = StockInventory::query()
            ->where('warehouse_id', $warehouse->id)
            ->where('product_id', $product->id)
            ->first();

        $this->assertSame($remaining, (int) $stock->qty_pieces);
    }

    public function test_send_fails_when_stock_insufficient(): void
    {
        $this->seed();

        $accountant = User::query()->where('email', 'accountant@judi.local')->firstOrFail();
        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $warehouse = Warehouse::primary();
        $store = Store::query()->firstOrFail();
        $product = Product::query()->with('units')->firstOrFail();
        $carton = $product->units->firstWhere('unit', 'carton') ?? $product->units->first();

        StockInventory::addPieces($warehouse, $product, (int) $carton->conversion_to_piece);

        $invoice = Invoice::createSale(
            $collector,
            $store,
            $warehouse,
            InvoiceType::Cash,
            [['product_unit_id' => $carton->id, 'quantity' => 2]],
        );

        $this->actingAs($accountant)
            ->post(route('releases.send', $invoice), [
                'printed_confirmed' => '1',
            ])
            ->assertRedirect(route('invoices.show', $invoice))
            ->assertSessionHasErrors('release');

        $invoice->refresh();
        $this->assertSame(InvoiceStatus::PendingSend, $invoice->status);

        $stock = StockInventory::query()
            ->where('warehouse_id', $warehouse->id)
            ->where('product_id', $product->id)
            ->first();

        $this->assertSame((int) $carton->conversion_to_piece, (int) $stock->qty_pieces);
    }

    public function test_cannot_send_twice(): void
    {
        $this->seed();

        $admin = User::query()->where('email', 'admin@judi.local')->firstOrFail();
        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $warehouse = Warehouse::primary();
        $store = Store::query()->firstOrFail();
        $product = Product::query()->with('units')->firstOrFail();
        $piece = $product->units->firstWhere('unit', 'piece') ?? $product->units->first();

        StockInventory::addPieces($warehouse, $product, 10);

        $invoice = Invoice::createSale(
            $collector,
            $store,
            $warehouse,
            InvoiceType::Cash,
            [['product_unit_id' => $piece->id, 'quantity' => 4]],
        );

        $this->actingAs($admin)->post(route('releases.send', $invoice), [
            'printed_confirmed' => '1',
        ])->assertRedirect();
        $this->actingAs($admin)
            ->post(route('releases.send', $invoice), [
                'printed_confirmed' => '1',
            ])
            ->assertSessionHasErrors('release');

        $stock = StockInventory::query()
            ->where('warehouse_id', $warehouse->id)
            ->where('product_id', $product->id)
            ->first();

        $this->assertSame(6, (int) $stock->qty_pieces);
    }

    public function test_collector_cannot_access_releases(): void
    {
        $this->seed();

        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();

        $this->actingAs($collector)->get(route('releases.index'))->assertForbidden();
    }

    public function test_releases_index_lists_pending_only(): void
    {
        $this->seed();

        $accountant = User::query()->where('email', 'accountant@judi.local')->firstOrFail();
        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $warehouse = Warehouse::primary();
        $store = Store::query()->firstOrFail();
        $product = Product::query()->with('units')->firstOrFail();
        $piece = $product->units->firstWhere('unit', 'piece') ?? $product->units->first();

        StockInventory::addPieces($warehouse, $product, 20);

        $pending = Invoice::createSale(
            $collector,
            $store,
            $warehouse,
            InvoiceType::Cash,
            [['product_unit_id' => $piece->id, 'quantity' => 1]],
        );

        $sent = Invoice::createSale(
            $collector,
            $store,
            $warehouse,
            InvoiceType::Cash,
            [['product_unit_id' => $piece->id, 'quantity' => 1]],
        );
        $sent->sendFromWarehouse($accountant);

        $response = $this->actingAs($accountant)->get(route('releases.index'));
        $response->assertOk();
        $response->assertSee($pending->invoice_number, false);
        $response->assertDontSee($sent->invoice_number, false);
    }

    public function test_invoice_show_has_send_button_for_accountant(): void
    {
        $this->seed();

        $accountant = User::query()->where('email', 'accountant@judi.local')->firstOrFail();
        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $warehouse = Warehouse::primary();
        $store = Store::query()->firstOrFail();
        $product = Product::query()->with('units')->firstOrFail();
        $piece = $product->units->firstWhere('unit', 'piece') ?? $product->units->first();

        $invoice = Invoice::createSale(
            $collector,
            $store,
            $warehouse,
            InvoiceType::Cash,
            [['product_unit_id' => $piece->id, 'quantity' => 1]],
        );

        $this->actingAs($accountant)
            ->get(route('invoices.show', $invoice))
            ->assertOk()
            ->assertSee(__('ui.release_send'), false)
            ->assertSee(__('ui.release_printed_confirm'), false);
    }

    public function test_send_requires_printed_confirmation(): void
    {
        $this->seed();

        $accountant = User::query()->where('email', 'accountant@judi.local')->firstOrFail();
        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $warehouse = Warehouse::primary();
        $store = Store::query()->firstOrFail();
        $product = Product::query()->with('units')->firstOrFail();
        $piece = $product->units->firstWhere('unit', 'piece') ?? $product->units->first();

        StockInventory::addPieces($warehouse, $product, 10);

        $invoice = Invoice::createSale(
            $collector,
            $store,
            $warehouse,
            InvoiceType::Cash,
            [['product_unit_id' => $piece->id, 'quantity' => 1]],
        );

        $this->actingAs($accountant)
            ->post(route('releases.send', $invoice))
            ->assertSessionHasErrors('printed_confirmed');

        $invoice->refresh();
        $this->assertSame(InvoiceStatus::PendingSend, $invoice->status);
    }
}
