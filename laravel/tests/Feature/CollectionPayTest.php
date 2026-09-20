<?php

namespace Tests\Feature;

use App\Enums\CollectionStatus;
use App\Enums\InvoiceType;
use App\Models\Collection;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CollectionPayTest extends TestCase
{
    use RefreshDatabase;

    public function test_collector_records_pending_receipt_without_reducing_debt(): void
    {
        $this->seed();

        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $store = Store::query()->firstOrFail();
        $warehouse = Warehouse::primary();
        $product = Product::query()->with('units')->firstOrFail();
        $unit = $product->units->first();

        $invoice = Invoice::createSale(
            $collector,
            $store,
            $warehouse,
            InvoiceType::Debt,
            [['product_unit_id' => $unit->id, 'quantity' => 2]],
        );

        $store->refresh();
        $debtBefore = (float) $store->current_debt;
        $this->assertGreaterThan(0, $debtBefore);
        $this->assertEquals((float) $invoice->debt_amount, $debtBefore);

        $pay = round($debtBefore / 2, 0);
        $this->assertGreaterThan(0, $pay);

        $response = $this->actingAs($collector)->post(route('collections.store'), [
            'store_id' => $store->id,
            'amount' => $pay,
            'collected_at' => now()->toDateString(),
            'note' => 'قسط',
        ]);

        $collection = Collection::query()->latest('id')->first();
        $this->assertNotNull($collection);
        $response->assertRedirect(route('collections.show', $collection));

        $store->refresh();
        $this->assertEquals(
            number_format($debtBefore, 2, '.', ''),
            number_format((float) $store->current_debt, 2, '.', ''),
        );

        $this->assertDatabaseHas('collections', [
            'store_id' => $store->id,
            'collector_id' => $collector->id,
            'note' => 'قسط',
            'status' => CollectionStatus::Pending->value,
        ]);
    }

    public function test_accountant_confirm_reduces_store_debt(): void
    {
        $this->seed();

        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $accountant = User::query()->where('email', 'accountant@judi.local')->firstOrFail();
        $store = Store::query()->firstOrFail();
        $warehouse = Warehouse::primary();
        $product = Product::query()->with('units')->firstOrFail();
        $unit = $product->units->first();

        Invoice::createSale(
            $collector,
            $store,
            $warehouse,
            InvoiceType::Debt,
            [['product_unit_id' => $unit->id, 'quantity' => 2]],
        );

        $store->refresh();
        $debtBefore = (float) $store->current_debt;
        $pay = round($debtBefore / 2, 0);

        $collection = Collection::recordPayment(
            $collector,
            $store,
            $pay,
            now()->toDateString(),
            'قسط',
        );

        $store->refresh();
        $this->assertEquals(
            number_format($debtBefore, 2, '.', ''),
            number_format((float) $store->current_debt, 2, '.', ''),
        );

        $this->actingAs($accountant)
            ->post(route('collections.confirm', $collection))
            ->assertRedirect(route('collections.show', $collection));

        $collection->refresh();
        $store->refresh();

        $this->assertTrue($collection->isConfirmed());
        $this->assertEquals(
            number_format($debtBefore - $pay, 2, '.', ''),
            number_format((float) $store->current_debt, 2, '.', ''),
        );
    }

    public function test_collection_cannot_exceed_store_debt(): void
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
            InvoiceType::Debt,
            [['product_unit_id' => $unit->id, 'quantity' => 1]],
        );

        $store->refresh();
        $debt = (float) $store->current_debt;

        $this->actingAs($collector)->post(route('collections.store'), [
            'store_id' => $store->id,
            'amount' => $debt + 1000,
            'collected_at' => now()->toDateString(),
        ])->assertSessionHasErrors('amount');

        $store->refresh();
        $this->assertEquals(
            number_format($debt, 2, '.', ''),
            number_format((float) $store->current_debt, 2, '.', ''),
        );
    }

    public function test_pending_collection_blocks_over_collect_of_available_debt(): void
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
            InvoiceType::Debt,
            [['product_unit_id' => $unit->id, 'quantity' => 2]],
        );

        $store->refresh();
        $debt = (float) $store->current_debt;
        $firstPay = round($debt / 2, 0);
        $this->assertGreaterThan(0, $firstPay);

        Collection::recordPayment(
            $collector,
            $store,
            $firstPay,
            now()->toDateString(),
            'pending half',
        );

        $available = Collection::availableDebtForStore($store->fresh());
        $this->assertEquals(
            number_format($debt - $firstPay, 2, '.', ''),
            number_format($available, 2, '.', ''),
        );

        $this->actingAs($collector)->post(route('collections.store'), [
            'store_id' => $store->id,
            'amount' => $available + 1000,
            'collected_at' => now()->toDateString(),
        ])->assertSessionHasErrors('amount');

        $this->assertEquals(1, Collection::query()->where('store_id', $store->id)->count());
        $store->refresh();
        $this->assertEquals(
            number_format($debt, 2, '.', ''),
            number_format((float) $store->current_debt, 2, '.', ''),
        );
    }

    public function test_report_includes_confirmed_collections_in_net_cash(): void
    {
        $this->seed();

        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $accountant = User::query()->where('email', 'accountant@judi.local')->firstOrFail();
        $store = Store::query()->firstOrFail();
        $warehouse = Warehouse::primary();
        $product = Product::query()->with('units')->firstOrFail();
        $unit = $product->units->first();

        Invoice::createSale(
            $collector,
            $store,
            $warehouse,
            InvoiceType::Debt,
            [['product_unit_id' => $unit->id, 'quantity' => 1]],
        );

        $store->refresh();
        $collection = Collection::recordPayment(
            $collector,
            $store,
            (float) $store->current_debt,
            now()->toDateString(),
            'full',
        );

        $pendingResponse = $this->actingAs($collector)->get(route('reports.index'));
        $pendingResponse->assertOk();
        $pendingResponse->assertSee(__('ui.report_collections'), false);
        $pendingResponse->assertSee($collection->receipt_number, false);

        $collection->confirm($accountant);

        $response = $this->actingAs($collector)->get(route('reports.index'));
        $response->assertOk();
        $response->assertSee(__('ui.report_collections'), false);
        $response->assertSee($collection->receipt_number, false);
    }

    public function test_accountant_can_review_collections(): void
    {
        $this->seed();

        $accountant = User::query()->where('email', 'accountant@judi.local')->firstOrFail();
        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $store = Store::query()->firstOrFail();
        $warehouse = Warehouse::primary();
        $product = Product::query()->with('units')->firstOrFail();
        $unit = $product->units->first();

        Invoice::createSale(
            $collector,
            $store,
            $warehouse,
            InvoiceType::Debt,
            [['product_unit_id' => $unit->id, 'quantity' => 1]],
        );
        $store->refresh();
        $collection = Collection::recordPayment(
            $collector,
            $store,
            (float) $store->current_debt,
        );

        $this->actingAs($accountant)
            ->get(route('collections.index'))
            ->assertOk()
            ->assertSee($collection->receipt_number, false);

        $this->actingAs($accountant)
            ->get(route('collections.show', $collection))
            ->assertOk()
            ->assertSee(__('ui.collection_voucher_title'), false)
            ->assertSee(__('ui.collection_confirm'), false);
    }

    public function test_deleting_pending_collection_does_not_change_debt(): void
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
            InvoiceType::Debt,
            [['product_unit_id' => $unit->id, 'quantity' => 1]],
        );
        $store->refresh();
        $originalDebt = (float) $store->current_debt;

        $collection = Collection::recordPayment(
            $collector,
            $store,
            $originalDebt,
        );

        $store->refresh();
        $this->assertEquals(
            number_format($originalDebt, 2, '.', ''),
            number_format((float) $store->current_debt, 2, '.', ''),
        );

        $this->actingAs($collector)
            ->delete(route('collections.destroy', $collection))
            ->assertRedirect(route('collections.index'));

        $store->refresh();
        $this->assertEquals(
            number_format($originalDebt, 2, '.', ''),
            number_format((float) $store->current_debt, 2, '.', ''),
        );
        $this->assertDatabaseMissing('collections', ['id' => $collection->id]);
    }

    public function test_deleting_confirmed_collection_restores_debt(): void
    {
        $this->seed();

        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $accountant = User::query()->where('email', 'accountant@judi.local')->firstOrFail();
        $store = Store::query()->firstOrFail();
        $warehouse = Warehouse::primary();
        $product = Product::query()->with('units')->firstOrFail();
        $unit = $product->units->first();

        Invoice::createSale(
            $collector,
            $store,
            $warehouse,
            InvoiceType::Debt,
            [['product_unit_id' => $unit->id, 'quantity' => 1]],
        );
        $store->refresh();
        $originalDebt = (float) $store->current_debt;

        $collection = Collection::recordPayment(
            $collector,
            $store,
            $originalDebt,
        );
        $collection->confirm($accountant);

        $store->refresh();
        $this->assertEquals(0.0, (float) $store->current_debt);

        $this->actingAs($collector)
            ->delete(route('collections.destroy', $collection))
            ->assertRedirect(route('collections.index'));

        $store->refresh();
        $this->assertEquals(
            number_format($originalDebt, 2, '.', ''),
            number_format((float) $store->current_debt, 2, '.', ''),
        );
        $this->assertDatabaseMissing('collections', ['id' => $collection->id]);
    }
}
