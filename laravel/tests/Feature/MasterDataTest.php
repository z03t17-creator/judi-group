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
                'packet' => ['wholesale' => 550, 'retail' => 650, 'barcode' => '6282222222220'],
                'carton' => ['wholesale' => 6000, 'retail' => 7200],
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
        $this->assertSame('6282222222220', $product->unit(\App\Enums\ProductUnitKind::Packet)?->barcode);
        $this->assertSame('6281234567890', $product->unit(\App\Enums\ProductUnitKind::Carton)?->barcode);
    }

    public function test_product_requires_company_barcode(): void
    {
        $admin = User::factory()->create([
            'role' => Role::Admin,
            'collector_channel' => null,
        ]);

        $category = Category::query()->create(['name' => 'تاقیکردنەوە', 'sort_order' => 1, 'is_active' => true]);

        $response = $this->actingAs($admin)->post(route('products.store'), [
            'sku' => 'TEST-NO-BAR',
            'name' => 'بێ بارکۆد',
            'pieces_per_packet' => 1,
            'pieces_per_carton' => 1,
            'category_id' => $category->id,
            'is_active' => '1',
            'prices' => [
                'piece' => ['wholesale' => 100, 'retail' => 120],
                'packet' => ['wholesale' => 100, 'retail' => 120],
                'carton' => ['wholesale' => 100, 'retail' => 120],
            ],
        ]);

        $response->assertSessionHasErrors('barcode');
        $this->assertDatabaseMissing('products', ['sku' => 'TEST-NO-BAR']);
    }

    public function test_company_barcode_must_be_unique(): void
    {
        $admin = User::factory()->create([
            'role' => Role::Admin,
            'collector_channel' => null,
        ]);

        $category = Category::query()->create(['name' => 'تاقیکردنەوە', 'sort_order' => 1, 'is_active' => true]);

        Product::query()->create([
            'sku' => 'EXISTING-001',
            'barcode' => '6289999888777',
            'name' => 'کاڵای هەبوو',
            'pieces_per_packet' => 1,
            'pieces_per_carton' => 1,
            'category_id' => $category->id,
            'is_active' => true,
        ]);

        $response = $this->actingAs($admin)->post(route('products.store'), [
            'sku' => 'DUP-BAR',
            'barcode' => '6289999888777',
            'name' => 'دووبارە',
            'pieces_per_packet' => 1,
            'pieces_per_carton' => 1,
            'category_id' => $category->id,
            'is_active' => '1',
            'prices' => [
                'piece' => ['wholesale' => 100, 'retail' => 120],
                'packet' => ['wholesale' => 100, 'retail' => 120],
                'carton' => ['wholesale' => 100, 'retail' => 120],
            ],
        ]);

        $response->assertSessionHasErrors('barcode');
        $this->assertDatabaseMissing('products', ['sku' => 'DUP-BAR']);
    }

    public function test_product_form_requires_carton_barcode_and_unit_scan_buttons(): void
    {
        $admin = User::factory()->create([
            'role' => Role::Admin,
            'collector_channel' => null,
        ]);

        $this->actingAs($admin)
            ->get(route('products.create'))
            ->assertOk()
            ->assertSee(__('ui.barcode_carton'), false)
            ->assertSee('name="barcode"', false)
            ->assertSee('data-scan-into="#product-barcode"', false)
            ->assertSee('data-scan-into="#unit-barcode-carton"', false)
            ->assertSee('data-scan-into="#unit-barcode-piece"', false)
            ->assertSee('data-scan-into="#unit-barcode-packet"', false)
            ->assertSee(__('ui.barcode_hardware_hint'), false)
            ->assertDontSee('data-generate-barcode', false)
            ->assertDontSee('data-barcode-preview', false);
    }

    public function test_lookup_barcode_returns_found_product_and_create_prefills_unknown(): void
    {
        $admin = User::factory()->create([
            'role' => Role::Admin,
            'collector_channel' => null,
        ]);

        $category = Category::query()->create(['name' => 'تاقیکردنەوە', 'sort_order' => 1, 'is_active' => true]);
        $product = Product::query()->create([
            'sku' => 'LOOK-001',
            'barcode' => '6285555444333',
            'name' => 'کاڵای ناسنامە',
            'pieces_per_packet' => 1,
            'pieces_per_carton' => 1,
            'category_id' => $category->id,
            'is_active' => true,
        ]);

        $this->actingAs($admin)
            ->getJson(route('products.lookup-barcode', ['barcode' => '6285555444333']))
            ->assertOk()
            ->assertJson([
                'found' => true,
                'id' => $product->id,
                'name' => 'کاڵای ناسنامە',
                'barcode' => '6285555444333',
            ])
            ->assertJsonPath('edit_url', route('products.edit', $product));

        $this->actingAs($admin)
            ->getJson(route('products.lookup-barcode', ['barcode' => '9990001112223']))
            ->assertOk()
            ->assertJson([
                'found' => false,
                'barcode' => '9990001112223',
            ]);

        $this->actingAs($admin)
            ->get(route('products.create', ['barcode' => '9990001112223']))
            ->assertOk()
            ->assertSee('value="9990001112223"', false);
    }

    public function test_office_nav_includes_barcode_scan_shortcut(): void
    {
        $admin = User::factory()->create([
            'role' => Role::Admin,
            'collector_channel' => null,
        ]);

        $this->actingAs($admin)
            ->get(route('home'))
            ->assertOk()
            ->assertSee('data-open-product-barcode-scan', false)
            ->assertSee('data-product-barcode-scan', false)
            ->assertSee('product-barcode-scan.js', false);
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
