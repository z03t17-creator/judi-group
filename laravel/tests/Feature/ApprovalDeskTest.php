<?php

namespace Tests\Feature;

use App\Enums\CollectionStatus;
use App\Enums\InvoiceStatus;
use App\Enums\InvoiceType;
use App\Models\Collection;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApprovalDeskTest extends TestCase
{
    use RefreshDatabase;

    public function test_accountant_sees_approvals_page_and_office_mobile_nav(): void
    {
        $this->seed();
        $accountant = User::query()->where('email', 'accountant@judi.local')->firstOrFail();

        $html = $this->actingAs($accountant)
            ->get(route('approvals.index'))
            ->assertOk()
            ->assertSee(__('ui.approvals'), false)
            ->getContent();

        $this->assertStringContainsString('office-bottom-nav', $html);
        $this->assertStringContainsString('office-topbar', $html);
        $this->assertStringContainsString('data-office-menu-open', $html);
    }

    public function test_collector_keeps_field_nav_and_cannot_open_approvals(): void
    {
        $this->seed();
        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();

        $home = $this->actingAs($collector)->get(route('home'))->assertOk()->getContent();
        $this->assertStringContainsString('field-bottom-nav', $home);
        $this->assertStringNotContainsString('office-bottom-nav', $home);

        $this->actingAs($collector)
            ->get(route('approvals.index'))
            ->assertForbidden();
    }

    public function test_accountant_can_bulk_confirm_collections(): void
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
            0,
            null,
        );

        $store->refresh();
        $pay = round((float) $store->current_debt / 2, 0);
        $one = Collection::recordPayment($collector, $store, $pay, now()->toDateString(), 'a');
        $two = Collection::recordPayment($collector, $store, $pay, now()->toDateString(), 'b');

        $this->actingAs($accountant)->post(route('approvals.collections'), [
            'ids' => [$one->id, $two->id],
            'approve_all' => '0',
            'tab' => 'collections',
        ])->assertRedirect(route('approvals.index', ['tab' => 'collections']));

        $this->assertTrue($one->fresh()->isConfirmed());
        $this->assertTrue($two->fresh()->isConfirmed());
        $this->assertSame(0, Collection::query()->where('status', CollectionStatus::Pending)->count());
    }

    public function test_admin_can_bulk_send_releases(): void
    {
        $this->seed();

        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $admin = User::query()->where('email', 'admin@judi.local')->firstOrFail();
        $store = Store::query()->firstOrFail();
        $warehouse = Warehouse::primary();
        $product = Product::query()->with('units')->firstOrFail();
        $unit = $product->units->first();

        $first = Invoice::createSale(
            $collector,
            $store,
            $warehouse,
            InvoiceType::Cash,
            [['product_unit_id' => $unit->id, 'quantity' => 1]],
        );
        $second = Invoice::createSale(
            $collector,
            $store,
            $warehouse,
            InvoiceType::Cash,
            [['product_unit_id' => $unit->id, 'quantity' => 1]],
        );

        $this->assertSame(InvoiceStatus::PendingSend, $first->status);

        \App\Models\StockInventory::addPieces(
            $warehouse,
            $product,
            20 * max(1, (int) $unit->conversion_to_piece),
        );

        $this->actingAs($admin)->post(route('approvals.releases'), [
            'ids' => [$first->id, $second->id],
            'approve_all' => '0',
            'printed_confirmed' => '1',
            'tab' => 'releases',
        ])->assertRedirect(route('approvals.index', ['tab' => 'releases']));

        $this->assertSame(InvoiceStatus::Sent, $first->fresh()->status);
        $this->assertSame(InvoiceStatus::Sent, $second->fresh()->status);
    }
}
