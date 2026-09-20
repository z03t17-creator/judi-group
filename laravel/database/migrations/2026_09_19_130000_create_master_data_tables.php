<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('sku', 64)->unique();
            $table->string('name');
            $table->string('name_ckb')->nullable();
            $table->string('pack_spec', 64)->nullable();
            $table->unsignedInteger('pieces_per_packet')->default(1);
            $table->unsignedInteger('pieces_per_carton')->default(1);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('is_active');
            $table->index('name');
        });

        Schema::create('product_units', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('unit', 16);
            $table->unsignedInteger('conversion_to_piece')->default(1);
            $table->decimal('price_wholesale', 14, 2)->default(0);
            $table->decimal('price_retail', 14, 2)->default(0);
            $table->timestamps();

            $table->unique(['product_id', 'unit']);
            $table->index('unit');
        });

        Schema::create('stores', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('owner_name')->nullable();
            $table->string('phone', 40);
            $table->string('address')->nullable();
            $table->decimal('credit_limit', 14, 2)->default(0);
            $table->decimal('current_debt', 14, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('name');
            $table->index('phone');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_units');
        Schema::dropIfExists('products');
        Schema::dropIfExists('stores');
    }
};
