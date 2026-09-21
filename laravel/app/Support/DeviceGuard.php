<?php

namespace App\Support;

use App\Enums\Role;
use App\Models\AppNotification;
use App\Models\DeviceLoginRequest;
use App\Models\User;
use App\Models\UserDevice;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

final class DeviceGuard
{
    public static function isApproved(User $user, string $token): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return UserDevice::query()
            ->where('user_id', $user->id)
            ->where('device_token', $token)
            ->whereNotNull('approved_at')
            ->exists();
    }

    /**
     * After login: admins always pass; employees need admin approval on every new device.
     * Already-approved devices pass and notify the office of the sign-in.
     *
     * @return DeviceLoginRequest|null Pending request when the user must wait.
     */
    public static function afterLogin(User $user, Request $request, string $token): ?DeviceLoginRequest
    {
        if ($user->isAdmin()) {
            self::remember($user, $request, $token, $user->id);

            return null;
        }

        $device = UserDevice::query()
            ->where('user_id', $user->id)
            ->where('device_token', $token)
            ->first();

        if ($device?->approved_at) {
            $device->forceFill([
                'last_seen_at' => now(),
                'ip_address' => $request->ip(),
                'user_agent' => Str::limit((string) $request->userAgent(), 500),
            ])->save();

            DeviceFingerprint::pruneDuplicateDevices($user->id);

            // Avoid spamming the admin inbox on every refresh / re-login.
            $cacheKey = 'signin-notif:'.$user->id.':'.substr($token, 0, 24);
            if (cache()->add($cacheKey, 1, now()->addHours(6))) {
                self::notifyApprovers(
                    $user,
                    'user_signed_in',
                    __('ui.notif_signed_in_title'),
                    __('ui.notif_signed_in_body', [
                        'name' => $user->name,
                        'device' => DeviceFingerprint::shortLabel($request->userAgent()),
                        'ip' => (string) $request->ip(),
                    ]),
                    [
                        'user_id' => $user->id,
                        'device_token' => $token,
                        'ip_address' => $request->ip(),
                    ],
                    adminOnly: true,
                );
            }

            return null;
        }

        // New / unapproved device — always wait for admin (no first-device free pass).
        DeviceLoginRequest::query()
            ->where('user_id', $user->id)
            ->where('device_token', $token)
            ->where('status', 'pending')
            ->where('expires_at', '>', now())
            ->delete();

        $pending = DeviceLoginRequest::query()->create([
            'user_id' => $user->id,
            'device_token' => $token,
            'code' => '000000',
            'user_agent' => Str::limit((string) $request->userAgent(), 500),
            'ip_address' => $request->ip(),
            'status' => 'pending',
            'expires_at' => now()->addHours(24),
        ]);

        self::notifyApprovers(
            $user,
            'device_login',
            __('ui.notif_device_title'),
            __('ui.notif_device_body', [
                'name' => $user->name,
                'device' => DeviceFingerprint::shortLabel($pending->user_agent),
                'ip' => (string) $pending->ip_address,
            ]),
            [
                'device_login_request_id' => $pending->id,
                'ip_address' => $pending->ip_address,
            ],
        );

        return $pending;
    }

    /**
     * Alert Admin (and optionally Accountant) via in-app toast + inbox.
     *
     * @param  array<string, mixed>  $meta
     */
    private static function notifyApprovers(
        User $actor,
        string $type,
        string $title,
        string $body,
        array $meta = [],
        bool $adminOnly = false,
    ): void {
        $roles = $adminOnly ? [Role::Admin] : [Role::Admin, Role::Accountant];

        foreach ($roles as $role) {
            AppNotification::query()->create([
                'sender_id' => $actor->id,
                'type' => $type,
                'title' => $title,
                'body' => $body,
                'audience' => 'role',
                'target_role' => $role->value,
                'meta' => $meta,
            ]);
        }

        WebPushNotifier::notifyRoles(
            $roles,
            $title,
            $body,
            $type === 'device_login'
                ? '/settings#settings-devices-pending'
                : '/settings#settings-inbox',
        );
    }

    public static function remember(User $user, Request $request, string $token, ?int $approvedBy): UserDevice
    {
        $device = UserDevice::query()->updateOrCreate(
            [
                'user_id' => $user->id,
                'device_token' => $token,
            ],
            [
                'label' => DeviceFingerprint::shortLabel($request->userAgent()),
                'user_agent' => Str::limit((string) $request->userAgent(), 500),
                'ip_address' => $request->ip(),
                'approved_at' => now(),
                'approved_by' => $approvedBy,
                'last_seen_at' => now(),
            ],
        );

        DeviceFingerprint::pruneDuplicateDevices($user->id);

        return $device->fresh() ?? $device;
    }

    public static function approve(DeviceLoginRequest $request, User $admin): bool
    {
        if (! $request->isPending()) {
            return false;
        }

        $request->forceFill([
            'status' => 'approved',
            'resolved_at' => now(),
            'resolved_by' => $admin->id,
        ])->save();

        UserDevice::query()->updateOrCreate(
            [
                'user_id' => $request->user_id,
                'device_token' => $request->device_token,
            ],
            [
                'label' => DeviceFingerprint::shortLabel($request->user_agent),
                'user_agent' => $request->user_agent,
                'ip_address' => $request->ip_address,
                'approved_at' => now(),
                'approved_by' => $admin->id,
                'last_seen_at' => now(),
            ],
        );

        AppNotification::query()->create([
            'sender_id' => $admin->id,
            'type' => 'device_approved',
            'title' => __('ui.notif_device_ok_title'),
            'body' => __('ui.notif_device_ok_body'),
            'audience' => 'user',
            'target_user_id' => $request->user_id,
            'meta' => ['device_login_request_id' => $request->id],
        ]);

        return true;
    }
}
