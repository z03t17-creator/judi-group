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

    public function test_second_device_requires_admin_code_approval(): void
    {
        $this->seed();
        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $admin = User::query()->where('email', 'admin@judi.local')->firstOrFail();

        UserDevice::query()->create([
            'user_id' => $collector->id,
            'device_token' => str_repeat('a', 64),
            'label' => 'Windows',
            'approved_at' => now(),
        ]);

        $newToken = str_repeat('b', 64);

        $login = $this->withCookie(DeviceFingerprint::COOKIE, $newToken)
            ->post(route('login.store'), [
                'email' => 'wholesale@judi.local',
                'password' => 'JudiAdmin!26',
            ]);

        $login->assertRedirect(route('device.pending'));

        $pending = DeviceLoginRequest::query()
            ->where('user_id', $collector->id)
            ->where('status', 'pending')
            ->first();

        $this->assertNotNull($pending);

        $this->assertDatabaseHas('app_notifications', [
            'type' => 'device_login',
            'audience' => 'role',
            'target_role' => 'admin',
        ]);
        $this->assertDatabaseHas('app_notifications', [
            'type' => 'device_login',
            'audience' => 'role',
            'target_role' => 'accountant',
        ]);

        $accountant = User::query()->where('email', 'accountant@judi.local')->firstOrFail();

        $this->actingAs($accountant)
            ->get(route('settings.index'))
            ->assertOk()
            ->assertSee($pending->code, false);

        $this->actingAs($admin)
            ->post(route('settings.devices.approve', $pending), [
                'code' => $pending->code,
            ])
            ->assertRedirect();

        $this->assertTrue(
            UserDevice::query()
                ->where('user_id', $collector->id)
                ->where('device_token', $newToken)
                ->whereNotNull('approved_at')
                ->exists()
        );
    }

    public function test_admin_feed_sees_device_login_notification(): void
    {
        $this->seed();
        $collector = User::query()->where('email', 'wholesale@judi.local')->firstOrFail();
        $admin = User::query()->where('email', 'admin@judi.local')->firstOrFail();

        UserDevice::query()->create([
            'user_id' => $collector->id,
            'device_token' => str_repeat('a', 64),
            'label' => 'Windows',
            'approved_at' => now(),
        ]);

        $this->withCookie(DeviceFingerprint::COOKIE, str_repeat('d', 64))
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
