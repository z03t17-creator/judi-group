<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_visits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('collector_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('status', 20)->default('open')->index();
            $table->timestamp('started_at');
            $table->timestamp('ended_at')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();

            $table->index(['collector_id', 'status']);
            $table->index(['store_id', 'started_at']);
        });

        Schema::create('store_rejects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_visit_id')->constrained('store_visits')->cascadeOnDelete();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('collector_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('warehouse_id')->constrained('warehouses')->restrictOnDelete();
            $table->string('status', 20)->default('posted')->index();
            $table->decimal('credit_amount', 14, 2)->default(0);
            $table->text('note')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('reviewed_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['store_id', 'created_at']);
            $table->index(['status', 'reviewed_at']);
        });

        Schema::create('store_reject_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_reject_id')->constrained('store_rejects')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->foreignId('product_unit_id')->constrained('product_units')->restrictOnDelete();
            $table->string('product_name');
            $table->string('unit', 20);
            $table->decimal('quantity', 12, 2);
            $table->unsignedInteger('conversion_to_piece')->default(1);
            $table->unsignedInteger('pieces')->default(0);
            $table->decimal('unit_price', 14, 2)->default(0);
            $table->decimal('line_credit', 14, 2)->default(0);
            $table->timestamps();
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->foreignId('store_visit_id')
                ->nullable()
                ->after('warehouse_id')
                ->constrained('store_visits')
                ->nullOnDelete();
        });

        Schema::table('collections', function (Blueprint $table) {
            $table->foreignId('store_visit_id')
                ->nullable()
                ->after('store_id')
                ->constrained('store_visits')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('collections', function (Blueprint $table) {
            $table->dropConstrainedForeignId('store_visit_id');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropConstrainedForeignId('store_visit_id');
        });

        Schema::dropIfExists('store_reject_items');
        Schema::dropIfExists('store_rejects');
        Schema::dropIfExists('store_visits');
    }
};
