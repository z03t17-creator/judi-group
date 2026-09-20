<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['is_active', 'sort_order']);
        });

        Schema::create('subcategories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['category_id', 'is_active', 'sort_order']);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->foreignId('category_id')->nullable()->after('id')->constrained()->nullOnDelete();
            $table->foreignId('subcategory_id')->nullable()->after('category_id')->constrained()->nullOnDelete();
            $table->string('image_path')->nullable()->after('is_active');
        });

        Schema::table('stores', function (Blueprint $table) {
            $table->string('image_path')->nullable()->after('is_active');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('image_path')->nullable()->after('is_active');
            $table->decimal('max_discount_percent', 5, 2)->default(0)->after('image_path');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->decimal('discount_percent', 5, 2)->default(0)->after('subtotal');
            $table->decimal('discount_amount', 14, 2)->default(0)->after('discount_percent');
        });

        Schema::table('invoice_items', function (Blueprint $table) {
            $table->decimal('gift_quantity', 12, 2)->default(0)->after('quantity');
            $table->boolean('is_gift')->default(false)->after('gift_quantity');
        });
    }

    public function down(): void
    {
        Schema::table('invoice_items', function (Blueprint $table) {
            $table->dropColumn(['gift_quantity', 'is_gift']);
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn(['discount_percent', 'discount_amount']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['image_path', 'max_discount_percent']);
        });

        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn('image_path');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropConstrainedForeignId('subcategory_id');
            $table->dropConstrainedForeignId('category_id');
            $table->dropColumn('image_path');
        });

        Schema::dropIfExists('subcategories');
        Schema::dropIfExists('categories');
    }
};
