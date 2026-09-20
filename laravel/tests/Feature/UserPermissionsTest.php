<?php

namespace Tests\Feature;

use App\Enums\PagePermission;
use App\Enums\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserPermissionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_custom_permissions_block_and_allow_pages(): void
    {
        $this->seed();

        $user = User::query()->where('email', 'accountant@judi.local')->firstOrFail();
        $user->update([
            'permissions' => [
                PagePermission::Products->value,
                PagePermission::Invoices->value,
            ],
        ]);

        $this->actingAs($user)->get(route('products.index'))->assertOk();
        $this->actingAs($user)->get(route('invoices.index'))->assertOk();
        $this->actingAs($user)->get(route('stock.index'))->assertForbidden();
        $this->actingAs($user)->get(route('releases.index'))->assertForbidden();
        $this->actingAs($user)->get(route('purchases.index'))->assertForbidden();
    }

    public function test_admin_can_save_custom_permissions_for_user(): void
    {
        $this->seed();

        $admin = User::query()->where('email', 'admin@judi.local')->firstOrFail();
        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();

        $this->actingAs($admin)->put(route('users.update', $collector), [
            'name' => $collector->name,
            'email' => $collector->email,
            'role' => Role::Collector->value,
            'collector_channel' => $collector->collector_channel->value,
            'max_discount_percent' => 10,
            'max_gift_percent' => 50,
            'is_active' => '1',
            'use_custom_permissions' => '1',
            'permissions' => [
                PagePermission::Products->value,
                PagePermission::Stores->value,
            ],
        ])->assertRedirect(route('users.index'));

        $collector->refresh();
        $this->assertTrue($collector->hasCustomPermissions());
        $this->assertTrue($collector->canAccess(PagePermission::Products));
        $this->assertFalse($collector->canAccess(PagePermission::Invoices));
        $this->assertFalse($collector->canAccess(PagePermission::InvoicesSell));

        $this->actingAs($collector)->get(route('invoices.index'))->assertForbidden();
        $this->actingAs($collector)->get(route('products.index'))->assertOk();
    }

    public function test_role_defaults_apply_when_permissions_null(): void
    {
        $this->seed();

        $collector = User::query()->where('email', 'retail@judi.local')->firstOrFail();
        $this->assertNull($collector->permissions);
        $this->assertTrue($collector->canAccess(PagePermission::InvoicesSell));
        $this->assertFalse($collector->canAccess(PagePermission::Stock));
    }
}
