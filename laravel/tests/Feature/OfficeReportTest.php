<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Purchase;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OfficeReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_accountant_report_includes_stock_on_hand_and_purchases(): void
    {
        $this->seed();

        $accountant = User::query()->where('email', 'accountant@judi.local')->firstOrFail();
        $warehouse = Warehouse::primary();
        $product = Product::query()->with('units')->firstOrFail();
        $unit = $product->units->first();

        Purchase::receiveIntoWarehouse(
            $accountant,
            $warehouse,
            [['product_unit_id' => $unit->id, 'quantity' => 2, 'unit_cost' => 1000]],
        );

        $response = $this->actingAs($accountant)->get(route('reports.index'));
        $response->assertOk();
        $response->assertSee(__('ui.office_report_title'), false);
        $response->assertSee(__('ui.stock_on_hand'), false);
        $response->assertSee(__('ui.report_purchases'), false);
        $response->assertSee($product->displayName(), false);
    }

    public function test_collector_does_not_see_office_stock_purchase_section(): void
    {
        $this->seed();

        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();

        $this->actingAs($collector)
            ->get(route('reports.index'))
            ->assertOk()
            ->assertDontSee(__('ui.office_report_title'), false);
    }
}
