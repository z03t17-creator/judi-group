<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('collector_salary_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('collector_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('amount', 14, 2);
            $table->date('paid_at');
            $table->string('note', 500)->nullable();
            $table->foreignId('created_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['collector_id', 'paid_at']);
        });

        Schema::create('collector_penalties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('collector_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('amount', 14, 2);
            $table->date('penalized_at');
            $table->string('reason', 255);
            $table->string('note', 500)->nullable();
            $table->foreignId('created_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['collector_id', 'penalized_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('collector_penalties');
        Schema::dropIfExists('collector_salary_entries');
    }
};
