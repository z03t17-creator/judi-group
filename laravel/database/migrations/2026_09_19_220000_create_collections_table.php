<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('collections', function (Blueprint $table) {
            $table->id();
            $table->string('receipt_number', 32)->unique();
            $table->foreignId('store_id')->constrained('stores')->restrictOnDelete();
            $table->foreignId('collector_id')->constrained('users')->restrictOnDelete();
            $table->decimal('amount', 14, 2);
            $table->string('currency', 8)->default('IQD');
            $table->date('collected_at');
            $table->string('note')->nullable();
            $table->string('receipt_path')->nullable();
            $table->timestamps();

            $table->index(['collector_id', 'collected_at']);
            $table->index(['store_id', 'collected_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('collections');
    }
};
