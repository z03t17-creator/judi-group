<?php

namespace Tests\Feature;

use App\Models\DeviceLoginRequest;
use App\Models\User;
use App\Models\UserDevice;
use App\Support\DeviceFingerprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
            ->get(route('settings.index'))
            ->assertOk()
            ->assertSee($collector->name, false)
            ->assertDontSee(__('ui.device_code').':', false);

        $this->actingAs($admin)
            ->post(route('settings.devices.approve', $pending))
            ->assertRedirect();

        $this->assertTrue(
            UserDevice::query()
                ->where('user_id', $collector->id)
                ->where('device_token', $token)
                ->whereNotNull('approved_at')
                ->exists()
        );
    }

    public function test_approved_device_login_notifies_admin(): void
    {
        $this->seed();
        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $admin = User::query()->where('email', 'admin@judi.local')->firstOrFail();
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

        $this->assertDatabaseHas('app_notifications', [
            'type' => 'user_signed_in',
            'audience' => 'role',
            'target_role' => 'admin',
        ]);

        $this->actingAs($admin)
            ->getJson(route('notifications.feed'))
            ->assertOk()
            ->assertJsonFragment(['type' => 'user_signed_in']);
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
            ->assertRedirect();

        $this->assertDatabaseHas('app_notifications', [
            'title' => 'Hello',
            'body' => 'Team note',
            'audience' => 'all',
        ]);
    }
}
