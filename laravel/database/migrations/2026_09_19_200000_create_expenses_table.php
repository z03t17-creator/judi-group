<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('collector_id')->constrained('users')->restrictOnDelete();
            $table->string('category', 32)->default('other');
            $table->decimal('amount', 14, 2);
            $table->string('note')->nullable();
            $table->date('spent_at');
            $table->string('receipt_path')->nullable();
            $table->timestamps();

            $table->index(['collector_id', 'spent_at']);
            $table->index('category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
