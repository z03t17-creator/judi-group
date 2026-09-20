<?php

namespace Tests\Feature;

use App\Enums\ExpenseCategory;
use App\Enums\InvoiceType;
use App\Enums\Role;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CollectorReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_collector_sees_own_report_with_stores_cash_and_expenses(): void
    {
        $this->seed();

        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $store = Store::query()->firstOrFail();
        $warehouse = Warehouse::primary();
        $product = Product::query()->with('units')->firstOrFail();
        $unit = $product->units->first();

        Invoice::createSale(
            $collector,
            $store,
            $warehouse,
            InvoiceType::Cash,
            [['product_unit_id' => $unit->id, 'quantity' => 2]],
        );

        Expense::query()->create([
            'collector_id' => $collector->id,
            'category' => ExpenseCategory::Food,
            'amount' => 5000,
            'note' => 'ناهار',
            'spent_at' => now()->toDateString(),
        ]);

        $response = $this->actingAs($collector)->get(route('reports.index'));
        $response->assertOk();
        $response->assertSee(__('ui.report_stores_visited'), false);
        $response->assertSee(__('ui.report_discount_vs_limit'), false);
        $response->assertSee(__('ui.report_gift_vs_limit'), false);
        $response->assertSee($store->name, false);
        $response->assertSee('ناهار', false);
    }

    public function test_report_shows_discount_and_gift_usage_against_limits(): void
    {
        $this->seed();

        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $collector->update(['max_discount_percent' => 10, 'max_gift_percent' => 50]);
        $store = Store::query()->firstOrFail();
        $warehouse = Warehouse::primary();
        $product = Product::query()->with('units')->firstOrFail();
        $unit = $product->units->first();

        Invoice::createSale(
            $collector,
            $store,
            $warehouse,
            InvoiceType::Cash,
            [['product_unit_id' => $unit->id, 'quantity' => 2, 'gift_quantity' => 1]],
            10,
        );

        $response = $this->actingAs($collector)->get(route('reports.index', ['period' => 'month']));
        $response->assertOk();
        $response->assertSee(__('ui.report_discount_vs_limit'), false);
        $response->assertSee('10%', false);
        $response->assertSee(__('ui.report_gift_vs_limit'), false);
        $response->assertSee('50%', false);
    }

    public function test_collector_sees_all_stores_in_report_filters_and_can_filter_one(): void
    {
        $this->seed();

        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $stores = Store::query()->orderBy('name')->get();
        $this->assertGreaterThanOrEqual(2, $stores->count());
        $warehouse = Warehouse::primary();
        $product = Product::query()->with('units')->firstOrFail();
        $unit = $product->units->first();

        $first = $stores[0];
        $second = $stores[1];

        Invoice::createSale(
            $collector,
            $first,
            $warehouse,
            InvoiceType::Cash,
            [['product_unit_id' => $unit->id, 'quantity' => 1]],
        );
        Invoice::createSale(
            $collector,
            $second,
            $warehouse,
            InvoiceType::Cash,
            [['product_unit_id' => $unit->id, 'quantity' => 1]],
        );

        $filters = $this->actingAs($collector)->get(route('reports.index'));
        $filters->assertOk();
        $filters->assertSee(__('ui.all_stores'), false);
        foreach ($stores as $store) {
            $filters->assertSee($store->name, false);
        }

        $filtered = $this->actingAs($collector)->get(route('reports.index', [
            'store_id' => $first->id,
            'period' => 'month',
        ]));
        $filtered->assertOk();
        $filtered->assertSee($first->name, false);
        $this->assertEquals(1, substr_count($filtered->getContent(), 'name="store_id"'));
        $filtered->assertSee('value="'.$first->id.'"', false);
    }

    public function test_accountant_can_review_collector_report(): void
    {
        $this->seed();

        $accountant = User::query()->where('email', 'accountant@judi.local')->firstOrFail();
        $collector = User::query()->where('email', 'retail@judi.local')->firstOrFail();

        $response = $this->actingAs($accountant)->get(route('reports.index', [
            'collector_id' => $collector->id,
        ]));

        $response->assertOk();
        $response->assertSee($collector->name, false);
    }

    public function test_collector_can_log_expense(): void
    {
        $this->seed();

        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();

        $this->actingAs($collector)->post(route('expenses.store'), [
            'category' => ExpenseCategory::Transport->value,
            'amount' => 12000,
            'spent_at' => now()->toDateString(),
            'note' => 'تەکسی',
        ])->assertRedirect(route('expenses.index'));

        $this->assertDatabaseHas('expenses', [
            'collector_id' => $collector->id,
            'amount' => '12000.00',
            'note' => 'تەکسی',
        ]);
    }

    public function test_collector_cannot_open_another_collectors_report(): void
    {
        $this->seed();

        $wholesale = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $retail = User::query()->where('email', 'retail@judi.local')->firstOrFail();

        $this->actingAs($wholesale)
            ->get(route('reports.index', ['collector_id' => $retail->id]))
            ->assertOk()
            ->assertSee($wholesale->name, false);
    }

    public function test_accountant_can_filter_by_channel_period_and_type(): void
    {
        $this->seed();

        $accountant = User::query()->where('email', 'accountant@judi.local')->firstOrFail();
        $wholesale = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $retail = User::query()->where('email', 'retail@judi.local')->firstOrFail();
        $store = Store::query()->firstOrFail();
        $warehouse = Warehouse::primary();
        $product = Product::query()->with('units')->firstOrFail();
        $unit = $product->units->first();

        Invoice::createSale(
            $wholesale,
            $store,
            $warehouse,
            InvoiceType::Cash,
            [['product_unit_id' => $unit->id, 'quantity' => 1]],
        );
        Invoice::createSale(
            $retail,
            $store,
            $warehouse,
            InvoiceType::Debt,
            [['product_unit_id' => $unit->id, 'quantity' => 1]],
        );

        $this->actingAs($accountant)
            ->get(route('reports.index', [
                'channel' => 'wholesale',
                'period' => 'month',
                'type' => 'cash',
            ]))
            ->assertOk()
            ->assertSee(__('ui.channel_wholesale'), false)
            ->assertSee(__('ui.period_month'), false)
            ->assertSee(__('ui.invoice_cash'), false)
            ->assertSee($wholesale->name, false)
            ->assertDontSee('value="'.$retail->id.'"', false);
    }
}
