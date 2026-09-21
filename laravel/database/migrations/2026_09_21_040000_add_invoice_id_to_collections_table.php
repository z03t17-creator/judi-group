<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('collections', function (Blueprint $table) {
            $table->foreignId('invoice_id')
                ->nullable()
                ->after('store_id')
                ->constrained('invoices')
                ->nullOnDelete();

            $table->index(['invoice_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('collections', function (Blueprint $table) {
            $table->dropIndex(['invoice_id', 'status']);
            $table->dropConstrainedForeignId('invoice_id');
        });
    }
};
