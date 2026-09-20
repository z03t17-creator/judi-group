<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\StockInventory;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Warehouse;
use App\Support\PurchaseNumber;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StockBuyTest extends TestCase
{
    use RefreshDatabase;

    public function test_purchase_number_increments(): void
    {
        $this->assertSame('PUR-000001', PurchaseNumber::next(null));
        $this->assertSame('PUR-000002', PurchaseNumber::next('PUR-000001'));
        $this->assertSame('PUR-000010', PurchaseNumber::next('PUR-000009'));
    }

    public function test_admin_can_create_supplier(): void
    {
        $admin = User::factory()->create([
            'role' => Role::Admin,
            'collector_channel' => null,
        ]);

        $response = $this->actingAs($admin)->post(route('suppliers.store'), [
            'name' => 'کۆمپانیای تاقیکردنەوە',
            'phone' => '07509998877',
            'is_active' => '1',
        ]);

        $response->assertRedirect(route('suppliers.index'));
        $this->assertDatabaseHas('suppliers', [
            'name' => 'کۆمپانیای تاقیکردنەوە',
            'phone' => '07509998877',
        ]);
    }

    public function test_accountant_can_receive_purchase_into_koga_stock(): void
    {
        $this->seed();

        $accountant = User::query()->where('email', 'accountant@judi.local')->firstOrFail();
        $warehouse = Warehouse::primary();
        $this->assertNotNull($warehouse);

        $product = Product::query()->with('units')->firstOrFail();
        $carton = $product->units->firstWhere('unit', 'carton') ?? $product->units->first();
        $supplier = Supplier::query()->first();

        $response = $this->actingAs($accountant)->post(route('purchases.store'), [
            'supplier_id' => $supplier?->id,
            'purchased_at' => '2026-09-19',
            'notes' => 'تاقیکردنەوە',
            'lines' => [
                [
                    'product_unit_id' => $carton->id,
                    'quantity' => 2,
                    'unit_cost' => 5000,
                ],
            ],
        ]);

        $purchase = Purchase::query()->with('items')->first();
        $this->assertNotNull($purchase);
        $response->assertRedirect(route('purchases.show', $purchase));

        $this->assertSame('PUR-000001', $purchase->purchase_number);
        $this->assertSame('10000.00', (string) $purchase->total_cost);
        $this->assertCount(1, $purchase->items);

        $expectedPieces = 2 * (int) $carton->conversion_to_piece;
        $this->assertSame($expectedPieces, (int) $purchase->items->first()->qty_pieces);

        $stock = StockInventory::query()
            ->where('warehouse_id', $warehouse->id)
            ->where('product_id', $product->id)
            ->first();

        $this->assertNotNull($stock);
        $this->assertSame($expectedPieces, (int) $stock->qty_pieces);

        $breakdown = $product->breakdownPieces($expectedPieces);
        $this->assertSame(2, $breakdown['carton']);
        $this->assertSame(0, $breakdown['packet']);
        $this->assertSame(0, $breakdown['piece']);
    }

    public function test_purchase_can_type_a_new_supplier_name(): void
    {
        $this->seed();

        $accountant = User::query()->where('email', 'accountant@judi.local')->firstOrFail();
        $product = Product::query()->with('units')->firstOrFail();
        $carton = $product->units->firstWhere('unit', 'carton') ?? $product->units->first();

        $response = $this->actingAs($accountant)->post(route('purchases.store'), [
            'supplier_name' => 'دابینکەری نووسین',
            'purchased_at' => '2026-09-19',
            'lines' => [
                [
                    'product_unit_id' => $carton->id,
                    'quantity' => 1,
                    'unit_cost' => 1000,
                ],
            ],
        ]);

        $this->assertDatabaseHas('suppliers', ['name' => 'دابینکەری نووسین']);
        $supplier = Supplier::query()->where('name', 'دابینکەری نووسین')->first();
        $purchase = Purchase::query()->latest('id')->first();
        $this->assertNotNull($purchase);
        $this->assertSame($supplier?->id, $purchase->supplier_id);
        $response->assertRedirect(route('purchases.show', $purchase));
    }

    public function test_second_purchase_adds_to_existing_stock(): void
    {
        $this->seed();

        $admin = User::query()->where('email', 'admin@judi.local')->firstOrFail();
        $warehouse = Warehouse::primary();
        $product = Product::query()->with('units')->firstOrFail();
        $piece = $product->units->firstWhere('unit', 'piece') ?? $product->units->first();

        $this->actingAs($admin)->post(route('purchases.store'), [
            'purchased_at' => now()->toDateString(),
            'lines' => [
                ['product_unit_id' => $piece->id, 'quantity' => 10, 'unit_cost' => 100],
            ],
        ])->assertRedirect();

        $this->actingAs($admin)->post(route('purchases.store'), [
            'purchased_at' => now()->toDateString(),
            'lines' => [
                ['product_unit_id' => $piece->id, 'quantity' => 5, 'unit_cost' => 100],
            ],
        ])->assertRedirect();

        $stock = StockInventory::query()
            ->where('warehouse_id', $warehouse->id)
            ->where('product_id', $product->id)
            ->first();

        $this->assertSame(15, (int) $stock->qty_pieces);
        $this->assertSame(2, Purchase::query()->count());
    }

    public function test_collector_cannot_access_stock_buy(): void
    {
        $this->seed();

        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();

        $this->actingAs($collector)->get(route('stock.index'))->assertForbidden();
        $this->actingAs($collector)->get(route('purchases.create'))->assertForbidden();
        $this->actingAs($collector)->get(route('suppliers.index'))->assertForbidden();
    }

    public function test_purchase_form_lists_product_categories_for_filter(): void
    {
        $this->seed();

        $accountant = User::query()->where('email', 'accountant@judi.local')->firstOrFail();
        $response = $this->actingAs($accountant)->get(route('purchases.create'));
        $response->assertOk();
        $response->assertSee(__('ui.products'), false);
        $response->assertSee('چاودێری منداڵ', false);
        $response->assertSee('پاکوخاوێنی', false);
    }

    public function test_stock_index_shows_breakdown(): void
    {
        $this->seed();

        $admin = User::query()->where('email', 'admin@judi.local')->firstOrFail();
        $product = Product::query()->with('units')->firstOrFail();
        $carton = $product->units->firstWhere('unit', 'carton') ?? $product->units->first();

        $this->actingAs($admin)->post(route('purchases.store'), [
            'purchased_at' => now()->toDateString(),
            'lines' => [
                ['product_unit_id' => $carton->id, 'quantity' => 1, 'unit_cost' => 1000],
            ],
        ]);

        $response = $this->actingAs($admin)->get(route('stock.index'));
        $response->assertOk();
        $response->assertSee($product->displayName(), false);
        $response->assertSee('کارتۆن', false);
        $response->assertSee(__('ui.invoice_grand_total'), false);
    }
}
