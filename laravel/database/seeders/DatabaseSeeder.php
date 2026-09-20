<?php

namespace Database\Seeders;

use App\Enums\CollectorChannel;
use App\Enums\InvoiceType;
use App\Enums\ProductUnitKind;
use App\Enums\Role;
use App\Models\Category;
use App\Models\Collection;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\StockInventory;
use App\Models\Store;
use App\Models\Subcategory;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Warehouse;
use App\Support\Barcode;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /** Marker so demo print rows are seeded once (idempotent). */
    private const DEMO_PRINT_NOTE = 'DEMO_PRINT_SEED';

    public function run(): void
    {
        Warehouse::query()->updateOrCreate(
            ['code' => 'MAIN'],
            [
                'name' => 'Main warehouse',
                'name_ckb' => 'کۆگای سەرەکی',
                'is_primary' => true,
                'is_active' => true,
            ],
        );

        $password = 'JudiAdmin!26';

        User::query()->updateOrCreate(
            ['email' => 'admin@judi.local'],
            [
                'name' => 'بەڕێوەبەر',
                'password' => $password,
                'role' => Role::Admin,
                'collector_channel' => null,
                'is_active' => true,
                'image_path' => 'images/placeholders/person.svg',
                'max_discount_percent' => 100,
                'max_gift_percent' => 100,
                'email_verified_at' => now(),
            ],
        );

        User::query()->updateOrCreate(
            ['email' => 'accountant@judi.local'],
            [
                'name' => 'ژمێریار',
                'password' => $password,
                'role' => Role::Accountant,
                'collector_channel' => null,
                'is_active' => true,
                'image_path' => 'images/placeholders/person.svg',
                'max_discount_percent' => 0,
                'max_gift_percent' => 0,
                'email_verified_at' => now(),
            ],
        );

        User::query()->updateOrCreate(
            ['email' => 'wholesale@judi.local'],
            [
                'name' => 'سۆران ئەحمەد',
                'password' => $password,
                'role' => Role::Collector,
                'collector_channel' => CollectorChannel::Wholesale,
                'is_active' => true,
                'image_path' => 'images/placeholders/wholesale.svg',
                'max_discount_percent' => 10,
                'max_gift_percent' => 50,
                'email_verified_at' => now(),
            ],
        );

        User::query()->updateOrCreate(
            ['email' => 'retail@judi.local'],
            [
                'name' => 'ئازاد محەمەد',
                'password' => $password,
                'role' => Role::Collector,
                'collector_channel' => CollectorChannel::Retail,
                'is_active' => true,
                'image_path' => 'images/placeholders/retail.svg',
                'max_discount_percent' => 5,
                'max_gift_percent' => 20,
                'email_verified_at' => now(),
            ],
        );

        $this->seedCategoriesAndProducts();
        $this->seedStores();
        $this->seedDemoPrintData();
    }

    private function seedCategoriesAndProducts(): void
    {
        $baby = Category::query()->updateOrCreate(
            ['name' => 'چاودێری منداڵ'],
            ['sort_order' => 1, 'is_active' => true],
        );
        $hygiene = Category::query()->updateOrCreate(
            ['name' => 'پاکوخاوێنی'],
            ['sort_order' => 2, 'is_active' => true],
        );
        $food = Category::query()->updateOrCreate(
            ['name' => 'خواردن و خواردنەوە'],
            ['sort_order' => 3, 'is_active' => true],
        );
        $home = Category::query()->updateOrCreate(
            ['name' => 'ماڵ و چێشتخانە'],
            ['sort_order' => 4, 'is_active' => true],
        );

        $diapers = Subcategory::query()->updateOrCreate(
            ['category_id' => $baby->id, 'name' => 'پامپەرس'],
            ['sort_order' => 1, 'is_active' => true],
        );
        $babyWipes = Subcategory::query()->updateOrCreate(
            ['category_id' => $baby->id, 'name' => 'دەستمالى منداڵ'],
            ['sort_order' => 2, 'is_active' => true],
        );
        $babyFood = Subcategory::query()->updateOrCreate(
            ['category_id' => $baby->id, 'name' => 'خۆراکی منداڵ'],
            ['sort_order' => 3, 'is_active' => true],
        );

        $tissue = Subcategory::query()->updateOrCreate(
            ['category_id' => $hygiene->id, 'name' => 'کلینێکس'],
            ['sort_order' => 1, 'is_active' => true],
        );
        $soap = Subcategory::query()->updateOrCreate(
            ['category_id' => $hygiene->id, 'name' => 'سابوون'],
            ['sort_order' => 2, 'is_active' => true],
        );
        $shampoo = Subcategory::query()->updateOrCreate(
            ['category_id' => $hygiene->id, 'name' => 'شامپۆ'],
            ['sort_order' => 3, 'is_active' => true],
        );
        $toothpaste = Subcategory::query()->updateOrCreate(
            ['category_id' => $hygiene->id, 'name' => 'ددانپاککەر'],
            ['sort_order' => 4, 'is_active' => true],
        );

        $oil = Subcategory::query()->updateOrCreate(
            ['category_id' => $food->id, 'name' => 'ڕۆن و زەیت'],
            ['sort_order' => 1, 'is_active' => true],
        );
        $staples = Subcategory::query()->updateOrCreate(
            ['category_id' => $food->id, 'name' => 'برنج و شەکر'],
            ['sort_order' => 2, 'is_active' => true],
        );
        $drinks = Subcategory::query()->updateOrCreate(
            ['category_id' => $food->id, 'name' => 'خواردنەوە'],
            ['sort_order' => 3, 'is_active' => true],
        );
        $snacks = Subcategory::query()->updateOrCreate(
            ['category_id' => $food->id, 'name' => 'چێشت و شیرینی'],
            ['sort_order' => 4, 'is_active' => true],
        );

        $cleaners = Subcategory::query()->updateOrCreate(
            ['category_id' => $home->id, 'name' => 'پاککەرەوە'],
            ['sort_order' => 1, 'is_active' => true],
        );
        $bags = Subcategory::query()->updateOrCreate(
            ['category_id' => $home->id, 'name' => 'کیسە و فۆیل'],
            ['sort_order' => 2, 'is_active' => true],
        );

        $samples = [
            // Baby — diapers
            $this->demoProduct($baby->id, $diapers->id, 'DIAPER-M-25', 'پامپەرس مامناوەند', '25x24x1', 24, 600, 'diaper', 450, 500, 10000, 11000, 240000, 260000),
            $this->demoProduct($baby->id, $diapers->id, 'DIAPER-S-30', 'پامپەرس بچووک', '30x24x1', 24, 720, 'diaper', 400, 450, 9000, 10000, 210000, 230000),
            $this->demoProduct($baby->id, $diapers->id, 'DIAPER-L-20', 'پامپەرس گەورە', '20x20x1', 20, 400, 'diaper', 500, 550, 9500, 10500, 185000, 200000),
            // Baby — wipes & food
            $this->demoProduct($baby->id, $babyWipes->id, 'WIPE-80', 'دەستمالى منداڵ ٨٠', '12x80', 80, 960, 'tissue', 15, 20, 1200, 1400, 14000, 16000),
            $this->demoProduct($baby->id, $babyFood->id, 'BABY-MILK-400', 'شیری منداڵ ٤٠٠گم', '12x1', 1, 12, 'product', 4500, 5000, 4500, 5000, 52000, 58000),
            // Hygiene — tissue & soap
            $this->demoProduct($hygiene->id, $tissue->id, 'TISSUE-20P1', 'کلینێکس', '20+1', 1, 21, 'tissue', 1200, 1500, 1200, 1500, 23000, 28000),
            $this->demoProduct($hygiene->id, $tissue->id, 'TISSUE-SOFT-100', 'کلینێکس نەرم ١٠٠', '10x100', 100, 1000, 'tissue', 8, 10, 750, 900, 7200, 8500),
            $this->demoProduct($hygiene->id, $soap->id, 'SOAP-6X12', 'سابوون', '6x12', 6, 72, 'soap', 350, 400, 2000, 2300, 22000, 25000),
            $this->demoProduct($hygiene->id, $soap->id, 'SOAP-LIQUID-1L', 'سابوونی شل ١ لیتر', '12x1', 1, 12, 'soap', 1800, 2200, 1800, 2200, 20000, 24000),
            // Hygiene — shampoo & toothpaste
            $this->demoProduct($hygiene->id, $shampoo->id, 'SHAMPOO-400', 'شامپۆ ٤٠٠مل', '12x1', 1, 12, 'product', 2200, 2700, 2200, 2700, 25000, 30000),
            $this->demoProduct($hygiene->id, $shampoo->id, 'COND-400', 'کۆندیشنەر ٤٠٠مل', '12x1', 1, 12, 'product', 2400, 2900, 2400, 2900, 27000, 32000),
            $this->demoProduct($hygiene->id, $toothpaste->id, 'PASTE-100', 'ددانپاککەر ١٠٠گم', '48x1', 1, 48, 'product', 900, 1100, 900, 1100, 40000, 48000),
            // Food — oil & staples
            $this->demoProduct($food->id, $oil->id, 'OIL-SUN-1L', 'زەیتی گوڵی ڕۆژ ١ لیتر', '12x1', 1, 12, 'product', 2500, 3000, 2500, 3000, 28000, 34000),
            $this->demoProduct($food->id, $oil->id, 'OIL-OLIVE-500', 'زەیتی زەیتوون ٥٠٠مل', '12x1', 1, 12, 'product', 4500, 5200, 4500, 5200, 50000, 58000),
            $this->demoProduct($food->id, $staples->id, 'RICE-5KG', 'برنجی بەسمەتی ٥ کگم', '4x5', 1, 4, 'product', 12000, 14000, 12000, 14000, 45000, 52000),
            $this->demoProduct($food->id, $staples->id, 'SUGAR-1KG', 'شەکر ١ کگم', '10x1', 1, 10, 'product', 1500, 1800, 1500, 1800, 14000, 17000),
            // Food — drinks & snacks
            $this->demoProduct($food->id, $drinks->id, 'WATER-1.5L', 'ئاو ١٫٥ لیتر', '6x1.5', 1, 6, 'product', 500, 650, 500, 650, 2800, 3600),
            $this->demoProduct($food->id, $drinks->id, 'JUICE-1L', 'شەربەتی پرتەقاڵ ١ لیتر', '12x1', 1, 12, 'product', 1200, 1500, 1200, 1500, 13500, 16500),
            $this->demoProduct($food->id, $snacks->id, 'BISCUIT-200', 'بیسکویت ٢٠٠گم', '24x1', 1, 24, 'product', 750, 900, 750, 900, 17000, 20000),
            // Home
            $this->demoProduct($home->id, $cleaners->id, 'CLEAN-DISH-1L', 'پاککەری قاپی ١ لیتر', '12x1', 1, 12, 'product', 1600, 2000, 1600, 2000, 18000, 22000),
            $this->demoProduct($home->id, $cleaners->id, 'CLEAN-FLOOR-2L', 'پاککەری زەوی ٢ لیتر', '6x1', 1, 6, 'product', 2800, 3400, 2800, 3400, 15500, 19000),
            $this->demoProduct($home->id, $bags->id, 'BAG-GARBAGE-30', 'کیسەی زبڵ ٣٠ دانە', '20x30', 30, 600, 'product', 25, 35, 700, 900, 13000, 16000),
        ];

        foreach ($samples as $sample) {
            $existing = Product::query()->where('sku', $sample['sku'])->first();
            if ($existing) {
                $existing->updateWithUnits($sample);
            } else {
                Product::createWithUnits($sample);
            }
        }

        $this->seedMissingProductStock();
    }

    /**
     * @return array{
     *   category_id: int,
     *   subcategory_id: int,
     *   sku: string,
     *   barcode: string,
     *   name: string,
     *   pack_spec: string,
     *   pieces_per_packet: int,
     *   pieces_per_carton: int,
     *   image_path: string,
     *   prices: array<string, array{wholesale: int, retail: int, barcode: string}>
     * }
     */
    private function demoProduct(
        int $categoryId,
        int $subcategoryId,
        string $sku,
        string $name,
        string $packSpec,
        int $piecesPerPacket,
        int $piecesPerCarton,
        string $image,
        int $pieceWholesale,
        int $pieceRetail,
        int $packetWholesale,
        int $packetRetail,
        int $cartonWholesale,
        int $cartonRetail,
    ): array {
        $imagePath = match ($image) {
            'diaper' => 'images/placeholders/diaper.svg',
            'tissue' => 'images/placeholders/tissue.svg',
            'soap' => 'images/placeholders/soap.svg',
            default => 'images/placeholders/product.svg',
        };

        return [
            'category_id' => $categoryId,
            'subcategory_id' => $subcategoryId,
            'sku' => $sku,
            'barcode' => Barcode::generateEan13FromSku($sku),
            'name' => $name,
            'pack_spec' => $packSpec,
            'pieces_per_packet' => $piecesPerPacket,
            'pieces_per_carton' => $piecesPerCarton,
            'image_path' => $imagePath,
            'prices' => [
                'piece' => [
                    'wholesale' => $pieceWholesale,
                    'retail' => $pieceRetail,
                    'barcode' => Barcode::generateEan13FromSku($sku.'-PIECE'),
                ],
                'packet' => [
                    'wholesale' => $packetWholesale,
                    'retail' => $packetRetail,
                    'barcode' => Barcode::generateEan13FromSku($sku.'-PACKET'),
                ],
                'carton' => [
                    'wholesale' => $cartonWholesale,
                    'retail' => $cartonRetail,
                    'barcode' => Barcode::generateEan13FromSku($sku.'-CARTON'),
                ],
            ],
        ];
    }

    /** Give every demo product some warehouse stock if it has none yet. */
    private function seedMissingProductStock(): void
    {
        if (app()->runningUnitTests()) {
            return;
        }

        $warehouse = Warehouse::primary();
        if (! $warehouse) {
            return;
        }

        $products = Product::query()->where('is_active', true)->with('units')->get();
        foreach ($products as $product) {
            $existing = StockInventory::query()
                ->where('warehouse_id', $warehouse->id)
                ->where('product_id', $product->id)
                ->value('qty_pieces');

            if ((int) $existing > 0) {
                continue;
            }

            $cartonPieces = max(1, (int) $product->pieces_per_carton);
            StockInventory::addPieces($warehouse, $product, $cartonPieces * 10);
        }
    }

    private function seedStores(): void
    {
        $stores = [
            [
                'name' => 'سوپەرمارکێتی نەورۆز',
                'owner_name' => 'ئەحمەد محەمەد',
                'phone' => '07501234567',
                'address' => 'هەولێر — شەقامی ١٠٠ مەتری',
                'credit_limit' => 500000,
                'current_debt' => 0,
                'is_active' => true,
                'image_path' => 'images/placeholders/store-nawroz.svg',
            ],
            [
                'name' => 'فرۆشگای ڕۆژهەڵات',
                'owner_name' => 'سارا عەلی',
                'phone' => '07709876543',
                'address' => 'سلێمانی — بەکرەجۆ',
                'credit_limit' => 250000,
                'current_debt' => 0,
                'is_active' => true,
                'image_path' => 'images/placeholders/store-east.svg',
            ],
            [
                'name' => 'کۆگای جاران',
                'owner_name' => null,
                'phone' => '07505551234',
                'address' => 'دهۆک — ناوەند',
                'credit_limit' => 1000000,
                'current_debt' => 0,
                'is_active' => true,
                'image_path' => 'images/placeholders/store-jaran.svg',
            ],
        ];

        foreach ($stores as $store) {
            Store::query()->updateOrCreate(
                ['phone' => $store['phone']],
                $store,
            );
        }

        Supplier::query()->updateOrCreate(
            ['name' => 'دابینکەری نموونە'],
            [
                'phone' => '07501110000',
                'is_active' => true,
            ],
        );
    }

    /**
     * Warehouse stock + cash/credit wholesale invoices + one collection for print QA.
     * Skipped in PHPUnit so tests that assume empty transactional tables stay green.
     */
    private function seedDemoPrintData(): void
    {
        if (app()->runningUnitTests()) {
            return;
        }

        if (Purchase::query()->where('notes', self::DEMO_PRINT_NOTE)->exists()) {
            return;
        }

        $admin = User::query()->where('email', 'admin@judi.local')->firstOrFail();
        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $warehouse = Warehouse::primary();
        if (! $warehouse) {
            return;
        }

        $supplier = Supplier::query()->where('name', 'دابینکەری نموونە')->first();
        $cashStore = Store::query()->where('phone', '07501234567')->firstOrFail();
        $creditStore = Store::query()->where('phone', '07709876543')->firstOrFail();

        $products = Product::query()
            ->whereIn('sku', ['DIAPER-M-25', 'TISSUE-20P1', 'SOAP-6X12'])
            ->with('units')
            ->get()
            ->keyBy('sku');

        if ($products->count() < 3) {
            return;
        }

        $diaperCarton = $products['DIAPER-M-25']->unit(ProductUnitKind::Carton);
        $tissueCarton = $products['TISSUE-20P1']->unit(ProductUnitKind::Carton);
        $soapPacket = $products['SOAP-6X12']->unit(ProductUnitKind::Packet);
        $soapCarton = $products['SOAP-6X12']->unit(ProductUnitKind::Carton);

        if (! $diaperCarton || ! $tissueCarton || ! $soapPacket || ! $soapCarton) {
            return;
        }

        Purchase::receiveIntoWarehouse(
            $admin,
            $warehouse,
            [
                ['product_unit_id' => $diaperCarton->id, 'quantity' => 20, 'unit_cost' => 200000],
                ['product_unit_id' => $tissueCarton->id, 'quantity' => 40, 'unit_cost' => 18000],
                ['product_unit_id' => $soapCarton->id, 'quantity' => 30, 'unit_cost' => 16000],
            ],
            $supplier,
            now()->toDateString(),
            self::DEMO_PRINT_NOTE,
        );

        $saleLines = [
            ['product_unit_id' => $diaperCarton->id, 'quantity' => 2, 'gift_quantity' => 1],
            ['product_unit_id' => $tissueCarton->id, 'quantity' => 5, 'gift_quantity' => 0],
            ['product_unit_id' => $soapPacket->id, 'quantity' => 12, 'gift_quantity' => 3],
        ];

        Invoice::createSale(
            $collector,
            $cashStore,
            $warehouse,
            InvoiceType::Cash,
            $saleLines,
            5.0,
        );

        $creditInvoice = Invoice::createSale(
            $collector,
            $creditStore,
            $warehouse,
            InvoiceType::Debt,
            $saleLines,
            8.0,
        );

        $creditStore->refresh();
        $partial = round((float) $creditInvoice->debt_amount / 2, 0);
        if ($partial >= 1) {
            $collection = Collection::recordPayment(
                $collector,
                $creditStore,
                $partial,
                now()->toDateString(),
                self::DEMO_PRINT_NOTE,
            );

            $accountant = User::query()->where('email', 'accountant@judi.local')->first();
            if ($accountant) {
                $collection->confirm($accountant);
            }
        }
    }
}
