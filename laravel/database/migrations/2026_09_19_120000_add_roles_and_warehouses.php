<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 32)->default('collector')->after('password');
            $table->string('collector_channel', 32)->nullable()->after('role');
            $table->boolean('is_active')->default(true)->after('collector_channel');
            $table->index('role');
        });

        Schema::create('warehouses', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('name_ckb')->nullable();
            $table->string('code', 32)->unique();
            $table->boolean('is_primary')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('is_primary');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouses');

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['role']);
            $table->dropColumn(['role', 'collector_channel', 'is_active']);
        });
    }
};
