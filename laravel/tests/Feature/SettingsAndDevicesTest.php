<?php

namespace Tests\Feature;

use App\Models\DeviceLoginRequest;
use App\Models\User;
use App\Models\UserDevice;
use App\Support\DeviceFingerprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class SettingsAndDevicesTest extends TestCase
{
    use RefreshDatabase;

    public function test_settings_page_loads_for_authenticated_user(): void
    {
        $this->seed();
        $admin = User::query()->where('email', 'admin@judi.local')->firstOrFail();

        $this->actingAs($admin)
            ->get(route('settings.index'))
            ->assertOk()
            ->assertSee(__('ui.settings'), false);
    }

    public function test_preferences_set_theme_and_density_cookies(): void
    {
        $this->seed();
        $admin = User::query()->where('email', 'admin@judi.local')->firstOrFail();

        $this->actingAs($admin)
            ->post(route('settings.preferences'), [
                'theme' => 'dark',
                'density' => 'big',
            ])
            ->assertRedirect(route('settings.index'))
            ->assertCookie('judi_theme', 'dark')
            ->assertCookie('judi_density', 'big');
    }

    public function test_admin_can_download_backup(): void
    {
        $this->seed();
        $admin = User::query()->where('email', 'admin@judi.local')->firstOrFail();

        $this->actingAs($admin)
            ->get(route('settings.backup'))
            ->assertOk()
            ->assertHeader('content-disposition');
    }

    public function test_admin_can_import_backup_sql(): void
    {
        $this->seed();
        $admin = User::query()->where('email', 'admin@judi.local')->firstOrFail();

        \App\Models\AppSetting::set('enforce_debt_limits', false);

        $sql = "-- Judy's Shelter backup\n"
            ."DELETE FROM `app_settings`;\n"
            .'INSERT INTO `app_settings` (`key`, `value`, `created_at`, `updated_at`) VALUES ('
            ."'enforce_debt_limits', '1', '2026-01-01 00:00:00', '2026-01-01 00:00:00');\n";

        $path = sys_get_temp_dir().DIRECTORY_SEPARATOR.'judi-import-test.sql';
        file_put_contents($path, $sql);

        $this->actingAs($admin)
            ->post(route('settings.backup.import'), [
                'backup_file' => new \Illuminate\Http\UploadedFile($path, 'judi-import-test.sql', 'application/sql', null, true),
            ])
            ->assertRedirect(route('settings.index').'#settings-backup')
            ->assertSessionHas('status');

        $this->assertTrue(\App\Models\AppSetting::debtLimitsEnabled());
    }

    public function test_non_admin_cannot_import_backup(): void
    {
        $this->seed();
        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $path = sys_get_temp_dir().DIRECTORY_SEPARATOR.'judi-import-forbidden.sql';
        file_put_contents($path, "DELETE FROM stores;\n");

        $this->actingAs($collector)
            ->post(route('settings.backup.import'), [
                'backup_file' => new \Illuminate\Http\UploadedFile($path, 'judi-import-forbidden.sql', 'application/sql', null, true),
            ])
            ->assertForbidden();
    }

    public function test_first_collector_login_requires_admin_approval_without_code(): void
    {
        $this->seed();
        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $admin = User::query()->where('email', 'admin@judi.local')->firstOrFail();

        $token = str_repeat('b', 64);
        $cookieName = DeviceFingerprint::cookieName($collector->id);

        $this->withCookie($cookieName, $token)
            ->post(route('login.store'), [
                'email' => 'wholesale@judi.local',
                'password' => 'JudiAdmin!26',
            ])
            ->assertRedirect(route('device.pending'));

        $pending = DeviceLoginRequest::query()
            ->where('user_id', $collector->id)
            ->where('status', 'pending')
            ->first();

        $this->assertNotNull($pending);

        $this->actingAs($admin)
            ->get(route('devices.index'))
            ->assertOk()
            ->assertSee($collector->name, false)
            ->assertSee(__('ui.device_code'), false)
            ->assertSee(DeviceFingerprint::shortCode($token), false);

        $this->actingAs($admin)
            ->post(route('settings.devices.approve', $pending), ['return_to' => 'devices'])
            ->assertRedirect(route('devices.index'));

        $this->assertTrue(
            UserDevice::query()
                ->where('user_id', $collector->id)
                ->where('device_token', $token)
                ->whereNotNull('approved_at')
                ->exists()
        );
    }

    public function test_prune_keeps_distinct_tokens_with_same_label_and_ip(): void
    {
        $this->seed();
        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();

        UserDevice::query()->create([
            'user_id' => $collector->id,
            'device_token' => str_repeat('1', 64),
            'label' => 'Android',
            'approved_at' => now(),
            'ip_address' => '10.0.0.1',
            'last_seen_at' => now()->subMinute(),
        ]);
        UserDevice::query()->create([
            'user_id' => $collector->id,
            'device_token' => str_repeat('2', 64),
            'label' => 'Android',
            'approved_at' => now(),
            'ip_address' => '10.0.0.1',
            'last_seen_at' => now(),
        ]);

        DeviceFingerprint::pruneDuplicateDevices($collector->id);

        $this->assertSame(2, UserDevice::query()->where('user_id', $collector->id)->count());
    }

    public function test_approved_device_login_is_silent(): void
    {
        $this->seed();
        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $token = str_repeat('a', 64);

        UserDevice::query()->create([
            'user_id' => $collector->id,
            'device_token' => $token,
            'label' => 'Windows',
            'approved_at' => now(),
            'ip_address' => '1.1.1.1',
        ]);

        $this->withCookie(DeviceFingerprint::cookieName($collector->id), $token)
            ->post(route('login.store'), [
                'email' => 'wholesale@judi.local',
                'password' => 'JudiAdmin!26',
            ])
            ->assertRedirect(route('home'));

        $this->assertDatabaseMissing('app_notifications', [
            'type' => 'user_signed_in',
        ]);
    }

    public function test_pending_device_relogin_does_not_duplicate_notification(): void
    {
        $this->seed();
        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $token = str_repeat('b', 64);

        $this->withCookie(DeviceFingerprint::cookieName($collector->id), $token)
            ->post(route('login.store'), [
                'email' => 'wholesale@judi.local',
                'password' => 'JudiAdmin!26',
            ])
            ->assertRedirect(route('device.pending'));

        $firstCount = \App\Models\AppNotification::query()->where('type', 'device_login')->count();
        $this->assertGreaterThan(0, $firstCount);

        Auth::logout();

        $this->withCookie(DeviceFingerprint::cookieName($collector->id), $token)
            ->post(route('login.store'), [
                'email' => 'wholesale@judi.local',
                'password' => 'JudiAdmin!26',
            ])
            ->assertRedirect(route('device.pending'));

        $this->assertSame(
            $firstCount,
            \App\Models\AppNotification::query()->where('type', 'device_login')->count()
        );
        $this->assertSame(
            1,
            \App\Models\DeviceLoginRequest::query()
                ->where('user_id', $collector->id)
                ->where('device_token', $token)
                ->where('status', 'pending')
                ->count()
        );
    }

    public function test_same_browser_does_not_reuse_device_token_across_users(): void
    {
        $this->seed();
        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $retail = User::query()->where('email', 'retail@judi.local')->firstOrFail();

        $sharedLookingToken = str_repeat('c', 64);

        $this->withCookie(DeviceFingerprint::cookieName($collector->id), $sharedLookingToken)
            ->post(route('login.store'), [
                'email' => 'retail@judi.local',
                'password' => 'JudiAdmin!26',
            ])
            ->assertRedirect(route('device.pending'));

        $this->assertTrue(
            DeviceLoginRequest::query()
                ->where('user_id', $retail->id)
                ->where('status', 'pending')
                ->exists()
        );
    }

    public function test_non_admin_cannot_revoke_own_device(): void
    {
        $this->seed();
        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $token = str_repeat('e', 64);

        $device = UserDevice::query()->create([
            'user_id' => $collector->id,
            'device_token' => $token,
            'label' => 'Windows',
            'approved_at' => now(),
            'ip_address' => '8.8.8.8',
        ]);

        $this->actingAs($collector)
            ->withSession([DeviceFingerprint::sessionKey($collector->id) => $token])
            ->withCookie(DeviceFingerprint::cookieName($collector->id), $token)
            ->delete(route('settings.devices.revoke', $device))
            ->assertForbidden();

        $this->assertDatabaseHas('user_devices', ['id' => $device->id]);
    }

    public function test_admin_can_revoke_current_device_and_is_logged_out(): void
    {
        $this->seed();
        $admin = User::query()->where('email', 'admin@judi.local')->firstOrFail();
        $token = str_repeat('e', 64);

        $device = UserDevice::query()->create([
            'user_id' => $admin->id,
            'device_token' => $token,
            'label' => 'Windows',
            'approved_at' => now(),
            'ip_address' => '8.8.8.8',
        ]);

        $this->actingAs($admin)
            ->withSession([DeviceFingerprint::sessionKey($admin->id) => $token])
            ->withCookie(DeviceFingerprint::cookieName($admin->id), $token)
            ->delete(route('settings.devices.revoke', $device))
            ->assertRedirect(route('login'));

        $this->assertGuest();
        $this->assertDatabaseMissing('user_devices', ['id' => $device->id]);
    }

    public function test_admin_can_revoke_all_devices_for_a_user(): void
    {
        $this->seed();
        $admin = User::query()->where('email', 'admin@judi.local')->firstOrFail();
        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();

        UserDevice::query()->create([
            'user_id' => $collector->id,
            'device_token' => str_repeat('f', 64),
            'label' => 'Android',
            'approved_at' => now(),
            'ip_address' => '9.9.9.9',
        ]);
        UserDevice::query()->create([
            'user_id' => $collector->id,
            'device_token' => str_repeat('g', 64),
            'label' => 'Windows',
            'approved_at' => now(),
            'ip_address' => '9.9.9.8',
        ]);

        $this->actingAs($admin)
            ->delete(route('settings.devices.revoke_user_all', $collector))
            ->assertRedirect();

        $this->assertSame(0, UserDevice::query()->where('user_id', $collector->id)->count());
    }

    public function test_admin_sees_device_ips_on_settings(): void
    {
        $this->seed();
        $admin = User::query()->where('email', 'admin@judi.local')->firstOrFail();
        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();

        UserDevice::query()->create([
            'user_id' => $collector->id,
            'device_token' => str_repeat('h', 64),
            'label' => 'Windows',
            'approved_at' => now(),
            'ip_address' => '203.0.113.50',
        ]);

        $this->actingAs($admin)
            ->get(route('settings.index'))
            ->assertOk()
            ->assertSee('203.0.113.50', false)
            ->assertSee(__('ui.all_user_devices'), false);
    }

    public function test_admin_can_approve_device_from_signed_push_link(): void
    {
        $this->seed();
        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $admin = User::query()->where('email', 'admin@judi.local')->firstOrFail();
        $token = str_repeat('d', 64);

        $pending = DeviceLoginRequest::query()->create([
            'user_id' => $collector->id,
            'device_token' => $token,
            'code' => '000000',
            'user_agent' => 'Mozilla/5.0 Windows',
            'ip_address' => '2.2.2.2',
            'status' => 'pending',
            'expires_at' => now()->addHour(),
        ]);

        $url = \Illuminate\Support\Facades\URL::temporarySignedRoute(
            'push.devices.approve',
            now()->addHour(),
            ['deviceLoginRequest' => $pending->id],
        );

        $this->actingAs($admin)
            ->getJson($url, ['X-Judi-Push' => '1'])
            ->assertOk()
            ->assertJson(['ok' => true]);

        $this->assertNotNull(
            UserDevice::query()
                ->where('user_id', $collector->id)
                ->where('device_token', $token)
                ->whereNotNull('approved_at')
                ->first()
        );
    }

    public function test_admin_feed_sees_device_login_notification(): void
    {
        $this->seed();
        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $admin = User::query()->where('email', 'admin@judi.local')->firstOrFail();

        $this->withCookie(DeviceFingerprint::cookieName($collector->id), str_repeat('d', 64))
            ->post(route('login.store'), [
                'email' => 'wholesale@judi.local',
                'password' => 'JudiAdmin!26',
            ])
            ->assertRedirect(route('device.pending'));

        $this->actingAs($admin)
            ->getJson(route('notifications.feed'))
            ->assertOk()
            ->assertJsonPath('pending_devices', 1)
            ->assertJsonFragment(['type' => 'device_login']);
    }

    public function test_admin_can_broadcast_notification(): void
    {
        $this->seed();
        $admin = User::query()->where('email', 'admin@judi.local')->firstOrFail();

        $this->actingAs($admin)
            ->post(route('settings.notifications.send'), [
                'title' => 'Hello',
                'body' => 'Team note',
                'audience' => 'all',
            ])
            ->assertRedirect(route('notifications.index'));

        $this->assertDatabaseHas('app_notifications', [
            'title' => 'Hello',
            'body' => 'Team note',
            'audience' => 'all',
        ]);
    }

    public function test_notifications_page_loads(): void
    {
        $this->seed();
        $admin = User::query()->where('email', 'admin@judi.local')->firstOrFail();

        $this->actingAs($admin)
            ->get(route('notifications.index'))
            ->assertOk()
            ->assertSee(__('ui.notifications'), false)
            ->assertSee(__('ui.notif_inbox'), false)
            ->assertDontSee(__('ui.settings_appearance'), false);
    }

    public function test_admin_can_toggle_debt_limits(): void
    {
        $this->seed();
        $admin = User::query()->where('email', 'admin@judi.local')->firstOrFail();

        $this->assertFalse(\App\Models\AppSetting::debtLimitsEnabled());

        $this->actingAs($admin)
            ->post(route('settings.debt_limits'), ['enforce_debt_limits' => '1'])
            ->assertRedirect(route('settings.index').'#settings-debt');

        $this->assertTrue(\App\Models\AppSetting::debtLimitsEnabled());

        $this->actingAs($admin)
            ->get(route('settings.index'))
            ->assertOk()
            ->assertSee(__('ui.debt_limit_settings'), false);

        $this->actingAs($admin)
            ->post(route('settings.debt_limits'), ['enforce_debt_limits' => '0'])
            ->assertRedirect(route('settings.index').'#settings-debt');

        $this->assertFalse(\App\Models\AppSetting::debtLimitsEnabled());
    }

    public function test_collector_sees_stock_on_products(): void
    {
        $this->seed();
        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $product = \App\Models\Product::query()->where('is_active', true)->firstOrFail();
        $warehouse = \App\Models\Warehouse::primary();

        \App\Models\StockInventory::query()->updateOrCreate(
            ['warehouse_id' => $warehouse->id, 'product_id' => $product->id],
            ['qty_pieces' => 48],
        );

        $this->actingAs($collector)
            ->get(route('products.index', ['category_id' => $product->category_id]))
            ->assertOk()
            ->assertSee(__('ui.stock_remain'), false)
            ->assertSee('48', false);

        $this->actingAs($collector)
            ->get(route('products.index'))
            ->assertOk()
            ->assertSee(__('ui.stock_remain'), false);
    }
}
