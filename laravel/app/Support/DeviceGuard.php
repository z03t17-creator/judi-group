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
     * Approve or create pending request. Returns pending request if waiting.
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

            return null;
        }

        // First device for this user → auto-approve once, but still alert office.
        $hasAny = UserDevice::query()->where('user_id', $user->id)->whereNotNull('approved_at')->exists();
        if (! $hasAny) {
            self::remember($user, $request, $token, null);
            self::notifyApprovers(
                $user,
                'device_login',
                __('ui.notif_device_first_title'),
                __('ui.notif_device_first_body', [
                    'name' => $user->name,
                    'device' => DeviceFingerprint::shortLabel($request->userAgent()),
                ]),
                ['auto_approved' => true],
            );

            return null;
        }

        DeviceLoginRequest::query()
            ->where('user_id', $user->id)
            ->where('device_token', $token)
            ->where('status', 'pending')
            ->where('expires_at', '>', now())
            ->delete();

        $pending = DeviceLoginRequest::query()->create([
            'user_id' => $user->id,
            'device_token' => $token,
            'code' => (string) random_int(100000, 999999),
            'user_agent' => Str::limit((string) $request->userAgent(), 500),
            'ip_address' => $request->ip(),
            'status' => 'pending',
            'expires_at' => now()->addHours(12),
        ]);

        self::notifyApprovers(
            $user,
            'device_login',
            __('ui.notif_device_title'),
            __('ui.notif_device_body', [
                'name' => $user->name,
                'code' => $pending->code,
                'device' => DeviceFingerprint::shortLabel($pending->user_agent),
            ]),
            [
                'device_login_request_id' => $pending->id,
                'code' => $pending->code,
            ],
        );

        return $pending;
    }

    /**
     * Alert Admin + Accountant laptops (in-app toast + inbox).
     *
     * @param  array<string, mixed>  $meta
     */
    private static function notifyApprovers(
        User $actor,
        string $type,
        string $title,
        string $body,
        array $meta = [],
    ): void {
        foreach ([Role::Admin, Role::Accountant] as $role) {
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
    }

    public static function remember(User $user, Request $request, string $token, ?int $approvedBy): UserDevice
    {
        return UserDevice::query()->updateOrCreate(
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
    }

    public static function approve(DeviceLoginRequest $request, User $admin, ?string $code = null): bool
    {
        if (! $request->isPending()) {
            return false;
        }

        if ($code !== null && $code !== '' && $code !== $request->code) {
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
