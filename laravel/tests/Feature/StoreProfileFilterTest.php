<?php

namespace Tests\Feature;

use App\Enums\InvoiceType;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StoreProfileFilterTest extends TestCase
{
    use RefreshDatabase;

    public function test_store_profile_filters_invoices_by_date_range(): void
    {
        $this->seed();

        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $store = Store::query()->firstOrFail();
        $warehouse = Warehouse::primary();
        $product = Product::query()->with('units')->firstOrFail();
        $unit = $product->units->first();

        $old = Invoice::createSale(
            $collector,
            $store,
            $warehouse,
            InvoiceType::Cash,
            [['product_unit_id' => $unit->id, 'quantity' => 1]],
        );
        $old->forceFill(['created_at' => now()->subDays(40)])->save();

        $recent = Invoice::createSale(
            $collector,
            $store,
            $warehouse,
            InvoiceType::Cash,
            [['product_unit_id' => $unit->id, 'quantity' => 1]],
        );

        $from = now()->subDays(7)->toDateString();
        $to = now()->toDateString();

        $this->actingAs($collector)
            ->get(route('stores.show', [
                'store' => $store,
                'period' => 'custom',
                'from' => $from,
                'to' => $to,
            ]))
            ->assertOk()
            ->assertSee($recent->invoice_number, false)
            ->assertDontSee($old->invoice_number, false)
            ->assertSee(__('ui.from_date'), false);
    }
}
