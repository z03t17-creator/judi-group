<?php

namespace Tests\Feature;

use App\Enums\CollectorChannel;
use App\Enums\Role;
use App\Models\Category;
use App\Models\Product;
use App\Models\Store;
use App\Models\Subcategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MasterDataTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_product_with_three_units_and_dual_prices(): void
    {
        $admin = User::factory()->create([
            'role' => Role::Admin,
            'collector_channel' => null,
        ]);

        $category = Category::query()->create(['name' => 'تاقیکردنەوە', 'sort_order' => 1, 'is_active' => true]);
        $sub = Subcategory::query()->create([
            'category_id' => $category->id,
            'name' => 'ژێر',
            'sort_order' => 1,
            'is_active' => true,
        ]);

        $response = $this->actingAs($admin)->post(route('products.store'), [
            'sku' => 'TEST-001',
            'barcode' => '6281234567890',
            'name' => 'سابوونی تاقیکردنەوە',
            'pack_spec' => '6x12',
            'pieces_per_packet' => 6,
            'pieces_per_carton' => 72,
            'category_id' => $category->id,
            'subcategory_id' => $sub->id,
            'is_active' => '1',
            'prices' => [
                'piece' => ['wholesale' => 100, 'retail' => 120, 'barcode' => '6281111111116'],
                'packet' => ['wholesale' => 550, 'retail' => 650, 'barcode' => null],
                'carton' => ['wholesale' => 6000, 'retail' => 7200, 'barcode' => null],
            ],
        ]);

        $response->assertRedirect(route('products.index'));

        $product = Product::query()->where('sku', 'TEST-001')->with('units')->first();
        $this->assertNotNull($product);
        $this->assertSame('سابوونی تاقیکردنەوە', $product->name);
        $this->assertSame('6281234567890', $product->barcode);
        $this->assertSame('6x12', $product->pack_spec);
        $this->assertCount(3, $product->units);
        $this->assertSame(6, $product->unit(\App\Enums\ProductUnitKind::Packet)?->conversion_to_piece);
        $this->assertSame('100.00', (string) $product->unit(\App\Enums\ProductUnitKind::Piece)?->price_wholesale);
        $this->assertSame('120.00', (string) $product->unit(\App\Enums\ProductUnitKind::Piece)?->price_retail);
        $this->assertSame('6281111111116', $product->unit(\App\Enums\ProductUnitKind::Piece)?->barcode);
    }

    public function test_accountant_can_create_store(): void
    {
        $accountant = User::factory()->create([
            'role' => Role::Accountant,
            'collector_channel' => null,
        ]);

        $response = $this->actingAs($accountant)->post(route('stores.store'), [
            'name' => 'فرۆشگای تاقیکردنەوە',
            'owner_name' => 'خاوەن',
            'phone' => '07501112233',
            'address' => 'هەولێر',
            'credit_limit' => 100000,
            'is_active' => '1',
        ]);

        $response->assertRedirect(route('stores.index'));
        $this->assertDatabaseHas('stores', [
            'phone' => '07501112233',
            'name' => 'فرۆشگای تاقیکردنەوە',
        ]);
    }

    public function test_admin_can_create_collector(): void
    {
        $admin = User::factory()->create([
            'role' => Role::Admin,
            'collector_channel' => null,
        ]);

        $response = $this->actingAs($admin)->post(route('collectors.store'), [
            'name' => 'مەندوبی نوێ',
            'email' => 'new.collector@judi.local',
            'password' => 'JudiCollector!26',
            'password_confirmation' => 'JudiCollector!26',
            'collector_channel' => CollectorChannel::Retail->value,
            'max_discount_percent' => 7.5,
            'max_gift_percent' => 15,
            'is_active' => '1',
        ]);

        $response->assertRedirect(route('users.index', ['role' => 'collector']));
        $this->assertDatabaseHas('users', [
            'email' => 'new.collector@judi.local',
            'role' => Role::Collector->value,
            'collector_channel' => CollectorChannel::Retail->value,
            'max_discount_percent' => 7.5,
            'max_gift_percent' => 15,
        ]);
    }

    public function test_collector_cannot_manage_products(): void
    {
        $collector = User::factory()->create([
            'role' => Role::Collector,
            'collector_channel' => CollectorChannel::Wholesale,
        ]);

        $this->actingAs($collector)
            ->get(route('products.create'))
            ->assertForbidden();

        $this->actingAs($collector)
            ->get(route('products.index'))
            ->assertOk();
    }

    public function test_collector_cannot_open_collectors_index(): void
    {
        $collector = User::factory()->create([
            'role' => Role::Collector,
            'collector_channel' => CollectorChannel::Retail,
        ]);

        $this->actingAs($collector)
            ->get(route('collectors.index'))
            ->assertForbidden();
    }

    public function test_seeded_master_data_shapes_match_face_l1(): void
    {
        $this->seed();

        $this->assertGreaterThanOrEqual(3, Product::query()->count());
        $this->assertGreaterThanOrEqual(3, Store::query()->count());
        $this->assertTrue(
            User::query()->where('role', Role::Collector)->whereNotNull('collector_channel')->exists(),
        );
        $this->assertTrue(Category::query()->exists());
        $this->assertTrue(Subcategory::query()->exists());

        $product = Product::query()->with('units')->first();
        $this->assertCount(3, $product->units);
        $this->assertNotNull($product->image_path);
        $this->assertNotNull($product->category_id);
    }
}
