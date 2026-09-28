<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE push_subscriptions MODIFY endpoint VARCHAR(1024) NOT NULL');
        } elseif ($driver === 'pgsql') {
            DB::statement('ALTER TABLE push_subscriptions ALTER COLUMN endpoint TYPE VARCHAR(1024)');
        }
        // sqlite keeps affinity; length is not enforced
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE push_subscriptions MODIFY endpoint VARCHAR(500) NOT NULL');
        } elseif ($driver === 'pgsql') {
            DB::statement('ALTER TABLE push_subscriptions ALTER COLUMN endpoint TYPE VARCHAR(500)');
        }
    }
};
