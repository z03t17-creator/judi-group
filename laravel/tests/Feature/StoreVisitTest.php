<?php

namespace Tests\Feature;

use App\Enums\StoreVisitStatus;
use App\Models\Product;
use App\Models\StockInventory;
use App\Models\Store;
use App\Models\StoreReject;
use App\Models\StoreVisit;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StoreVisitTest extends TestCase
{
    use RefreshDatabase;

    public function test_collector_starts_visit_and_sees_hub(): void
    {
        $this->seed();

        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $store = Store::query()->firstOrFail();

        $response = $this->actingAs($collector)->post(route('visits.store'), [
            'store_id' => $store->id,
        ]);

        $visit = StoreVisit::query()->latest('id')->first();
        $this->assertNotNull($visit);
        $response->assertRedirect(route('visits.show', $visit));
        $this->assertSame(StoreVisitStatus::Open, $visit->status);
        $this->assertSame((int) $store->id, (int) $visit->store_id);

        $hub = $this->actingAs($collector)->get(route('visits.show', $visit));
        $hub->assertOk();
        $hub->assertSee(__('ui.visit_action_order'), false);
        $hub->assertSee(__('ui.visit_action_reject'), false);
        $hub->assertSee($store->name, false);
    }

    public function test_cannot_start_second_open_visit(): void
    {
        $this->seed();

        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $stores = Store::query()->where('is_active', true)->orderBy('id')->take(2)->get();
        $this->assertGreaterThanOrEqual(2, $stores->count());

        $this->actingAs($collector)->post(route('visits.store'), [
            'store_id' => $stores[0]->id,
        ])->assertRedirect();

        $this->actingAs($collector)->post(route('visits.store'), [
            'store_id' => $stores[1]->id,
        ])->assertSessionHasErrors('store_id');

        $this->assertSame(1, StoreVisit::query()->where('status', StoreVisitStatus::Open)->count());
    }

    public function test_order_during_visit_locks_store_and_attaches_visit(): void
    {
        $this->seed();

        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $store = Store::query()->firstOrFail();
        $product = Product::query()->with('units')->firstOrFail();
        $unit = $product->units->firstWhere('unit', 'carton') ?? $product->units->first();

        $visit = StoreVisit::start($collector, $store);

        $create = $this->actingAs($collector)->get(route('invoices.create', ['visit' => $visit->id]));
        $create->assertOk();
        $create->assertSee($store->name, false);

        $this->actingAs($collector)->post(route('invoices.store'), [
            'store_id' => $store->id,
            'lines' => [
                ['product_unit_id' => $unit->id, 'quantity' => 1],
            ],
        ])->assertRedirect(route('visits.show', $visit));

        $invoice = \App\Models\Invoice::query()->latest('id')->firstOrFail();
        $this->assertSame((int) $visit->id, (int) $invoice->store_visit_id);

        $show = $this->actingAs($collector)->get(route('invoices.show', [$invoice, 'print' => 1]));
        $show->assertOk();
        $show->assertSee(route('visits.show', $visit), false);
        $show->assertSee(__('ui.visit_hub'), false);
    }

    public function test_reject_catalog_only_lists_warehouse_sent_products(): void
    {
        $this->seed();

        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $accountant = User::query()->where('email', 'accountant@judi.local')->firstOrFail();
        $store = Store::query()->firstOrFail();
        $warehouse = Warehouse::primary();
        $products = Product::query()->with('units')->take(2)->get();
        $this->assertGreaterThanOrEqual(2, $products->count());

        $soldUnit = $products[0]->units->first();
        $otherUnit = $products[1]->units->first();
        $pendingUnit = $products[1]->units->first();

        $soldPieces = (int) round(2 * max(1, (int) $soldUnit->conversion_to_piece));
        StockInventory::addPieces($warehouse, $products[0], $soldPieces + 10);
        StockInventory::addPieces(
            $warehouse,
            $products[1],
            (int) round(3 * max(1, (int) $pendingUnit->conversion_to_piece)) + 10,
        );

        $sent = \App\Models\Invoice::createSale(
            $collector,
            $store,
            $warehouse,
            [['product_unit_id' => $soldUnit->id, 'quantity' => 2]],
        );
        $sent->sendFromWarehouse($accountant);

        // Pending (unsent) order must not appear in return catalog.
        \App\Models\Invoice::createSale(
            $collector,
            $store,
            $warehouse,
            [['product_unit_id' => $pendingUnit->id, 'quantity' => 3]],
        );

        $visit = StoreVisit::start($collector, $store);
        $page = $this->actingAs($collector)->get(route('visits.reject', $visit));
        $page->assertOk();
        $page->assertSee(__('ui.reject_sold_only_hint'), false);
        $page->assertSee('confirmSubmit', false);
        $page->assertSee('data-reject-sheet', false);
        $page->assertSee((string) $soldUnit->id, false);
        $page->assertSee('"available":2', false);
        $page->assertDontSee('"id":'.$otherUnit->id.',', false);

        $this->actingAs($collector)->post(route('visits.reject.store', $visit), [
            'lines' => [
                ['product_unit_id' => $otherUnit->id, 'quantity' => 1],
            ],
        ])->assertSessionHasErrors('reject');
    }

    public function test_reject_restocks_koga_and_credits_store_debt(): void
    {
        $this->seed();

        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $accountant = User::query()->where('email', 'accountant@judi.local')->firstOrFail();
        $store = Store::query()->firstOrFail();
        $warehouse = Warehouse::primary();
        $product = Product::query()->with('units')->firstOrFail();
        $unit = $product->units->firstWhere('unit', 'carton') ?? $product->units->first();

        StockInventory::addPieces(
            $warehouse,
            $product,
            (int) round(4 * max(1, (int) $unit->conversion_to_piece)) + 10,
        );

        // Sent sale only — pending orders are not returnable.
        $invoice = \App\Models\Invoice::createSale(
            $collector,
            $store,
            $warehouse,
            [['product_unit_id' => $unit->id, 'quantity' => 4]],
        );
        $invoice->sendFromWarehouse($accountant);
        $store->refresh();
        $debtBefore = (float) $store->current_debt;
        $this->assertGreaterThan(0, $debtBefore);

        $stockBefore = (int) (StockInventory::query()
            ->where('warehouse_id', $warehouse->id)
            ->where('product_id', $product->id)
            ->value('qty_pieces') ?? 0);

        $visit = StoreVisit::start($collector, $store);

        $qty = 1;
        $expectedCredit = round((float) $unit->price_wholesale * $qty, 2);
        $expectedPieces = (int) round($qty * max(1, (int) $unit->conversion_to_piece));

        $this->actingAs($collector)->post(route('visits.reject.store', $visit), [
            'lines' => [
                ['product_unit_id' => $unit->id, 'quantity' => $qty],
            ],
            'note' => 'گەڕاوە',
        ])->assertRedirect(route('visits.show', $visit));

        $reject = StoreReject::query()->latest('id')->firstOrFail();
        $this->assertSame(number_format($expectedCredit, 2, '.', ''), (string) $reject->credit_amount);
        $this->assertNull($reject->reviewed_at);
        $this->assertCount(1, $reject->items);

        $store->refresh();
        $this->assertSame(
            number_format($debtBefore - $expectedCredit, 2, '.', ''),
            (string) $store->current_debt,
        );

        $stockAfter = (int) StockInventory::query()
            ->where('warehouse_id', $warehouse->id)
            ->where('product_id', $product->id)
            ->value('qty_pieces');
        $this->assertSame($stockBefore + $expectedPieces, $stockAfter);
    }

    public function test_end_visit_and_accountant_sees_open_visits_and_rejects(): void
    {
        $this->seed();

        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $accountant = User::query()->where('email', 'accountant@judi.local')->firstOrFail();
        $store = Store::query()->firstOrFail();
        $warehouse = Warehouse::primary();
        $product = Product::query()->with('units')->firstOrFail();
        $unit = $product->units->first();

        StockInventory::addPieces(
            $warehouse,
            $product,
            (int) round(2 * max(1, (int) $unit->conversion_to_piece)) + 5,
        );

        $invoice = \App\Models\Invoice::createSale(
            $collector,
            $store,
            $warehouse,
            [['product_unit_id' => $unit->id, 'quantity' => 2]],
        );
        $invoice->sendFromWarehouse($accountant);

        $visit = StoreVisit::start($collector, $store);
        StoreReject::recordReturn($visit, $collector, [
            ['product_unit_id' => $unit->id, 'quantity' => 1],
        ]);

        $desk = $this->actingAs($accountant)->get(route('approvals.index', ['tab' => 'visits']));
        $desk->assertOk();
        $desk->assertSee($store->name, false);
        $desk->assertSee(__('ui.reject_pending_review'), false);

        $reject = StoreReject::query()->latest('id')->firstOrFail();
        $this->actingAs($accountant)->post(route('approvals.rejects'), [
            'ids' => [$reject->id],
            'approve_all' => '0',
        ])->assertRedirect(route('approvals.index', ['tab' => 'visits']));

        $this->assertNotNull($reject->fresh()->reviewed_at);

        $this->actingAs($collector)->post(route('visits.end', $visit))->assertRedirect();
        $this->assertSame(StoreVisitStatus::Closed, $visit->fresh()->status);
    }

    public function test_visit_report_shows_sections_and_print_controls(): void
    {
        $this->seed();

        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $store = Store::query()->firstOrFail();
        $visit = StoreVisit::start($collector, $store);

        $page = $this->actingAs($collector)->get(route('visits.report', $visit));
        $page->assertOk();
        $page->assertSee(__('ui.visit_action_report'), false);
        $page->assertSee(__('ui.invoices'), false);
        $page->assertSee(__('ui.collections'), false);
        $page->assertSee(__('ui.visit_action_reject'), false);
        $page->assertSee(__('ui.invoice_empty'), false);
        $page->assertSee(__('ui.collections_empty'), false);
        $page->assertSee(__('ui.rejects_empty'), false);
        $page->assertSee('data-print-section="#visit-report-invoices"', false);
        $page->assertSee('data-print-section="#visit-report-collections"', false);
        $page->assertSee('data-print-section="#visit-report-rejects"', false);
    }

    public function test_bottom_nav_visit_entry_for_collector(): void
    {
        $this->seed();

        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();

        $html = $this->actingAs($collector)
            ->get(route('home'))
            ->assertOk()
            ->getContent();

        $this->assertNotFalse(preg_match('/class="field-bottom-nav".*?<\/nav>/s', $html, $match));
        $nav = $match[0];
        $this->assertStringContainsString(__('ui.visit'), $nav);
        $this->assertStringContainsString('visits', $nav);
    }
}
