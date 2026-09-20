<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('collections', function (Blueprint $table) {
            $table->string('status', 16)->default('pending')->after('receipt_path');
            $table->timestamp('confirmed_at')->nullable()->after('status');
            $table->foreignId('confirmed_by_id')
                ->nullable()
                ->after('confirmed_at')
                ->constrained('users')
                ->nullOnDelete();

            $table->index(['status', 'collected_at']);
        });

        // Historical rows already reduced store debt — treat as confirmed.
        DB::table('collections')->update([
            'status' => 'confirmed',
            'confirmed_at' => DB::raw('created_at'),
        ]);
    }

    public function down(): void
    {
        Schema::table('collections', function (Blueprint $table) {
            $table->dropIndex(['status', 'collected_at']);
            $table->dropConstrainedForeignId('confirmed_by_id');
            $table->dropColumn(['status', 'confirmed_at']);
        });
    }
};
