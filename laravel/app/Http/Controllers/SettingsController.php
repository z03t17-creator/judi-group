<?php

namespace App\Http\Controllers;

use App\Models\AppNotification;
use App\Models\AppNotificationRead;
use App\Models\DeviceLoginRequest;
use App\Models\User;
use App\Models\UserDevice;
use App\Support\DatabaseBackup;
use App\Support\DeviceFingerprint;
use App\Support\DeviceGuard;
use App\Support\WebPushNotifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SettingsController extends Controller
{
    public function index(Request $request): View
    {
        $user = $request->user();
        $theme = $request->cookie('judi_theme', 'light');
        $density = $request->cookie('judi_density', 'small');

        $pendingDevices = $user->canApproveDevices()
            ? DeviceLoginRequest::query()
                ->with('user')
                ->where('status', 'pending')
                ->where('expires_at', '>', now())
                ->latest()
                ->get()
            : collect();

        // Do not mass-prune here — wiping by label/IP used to revoke other phones on shared Wi‑Fi.
        DeviceFingerprint::pruneDuplicateDevices($user->id);

        $myDevices = UserDevice::query()
            ->where('user_id', $user->id)
            ->whereNotNull('approved_at')
            ->latest('last_seen_at')
            ->get();

        $allDevices = $user->isAdmin()
            ? UserDevice::query()
                ->with('user')
                ->whereNotNull('approved_at')
                ->latest('last_seen_at')
                ->get()
            : collect();

        $currentDevice = DeviceFingerprint::token($request, $user);

        return view('settings.index', [
            'theme' => in_array($theme, ['light', 'dark'], true) ? $theme : 'light',
            'density' => in_array($density, ['small', 'big'], true) ? $density : 'small',
            'pendingDevices' => $pendingDevices,
            'myDevices' => $myDevices,
            'allDevices' => $allDevices,
            'currentDevice' => $currentDevice,
            'enforceDebtLimits' => \App\Models\AppSetting::debtLimitsEnabled(),
        ]);
    }

    /**
     * Rosery-style device desk: pending requests + approved devices + revoke.
     */
    public function devices(Request $request): View
    {
        $user = $request->user();
        abort_unless($user?->canApproveDevices() || $user?->isAdmin(), 403);

        $pendingDevices = DeviceLoginRequest::query()
            ->with('user')
            ->where('status', 'pending')
            ->where('expires_at', '>', now())
            ->latest()
            ->get();

        $approvedDevices = UserDevice::query()
            ->with('user')
            ->whereNotNull('approved_at')
            ->when(! $user->isAdmin(), fn ($q) => $q->where('user_id', $user->id))
            ->latest('last_seen_at')
            ->get();

        return view('devices.index', [
            'pendingDevices' => $pendingDevices,
            'approvedDevices' => $approvedDevices,
            'currentDevice' => DeviceFingerprint::token($request, $user),
            'canManageAll' => $user->isAdmin(),
        ]);
    }

    public function notifications(Request $request): View
    {
        $user = $request->user();

        $notifications = AppNotification::query()
            ->visibleTo($user)
            ->latest()
            ->limit(40)
            ->get();

        $readIds = AppNotificationRead::query()
            ->where('user_id', $user->id)
            ->whereIn('app_notification_id', $notifications->pluck('id'))
            ->pluck('app_notification_id')
            ->all();

        return view('notifications.index', [
            'notifications' => $notifications,
            'readIds' => $readIds,
        ]);
    }

    public function updatePreferences(Request $request): RedirectResponse|\Illuminate\Http\JsonResponse
    {
        $data = $request->validate([
            'theme' => ['required', 'in:light,dark'],
            'density' => ['required', 'in:small,big'],
        ]);

        $minutes = 60 * 24 * 365;
        $themeCookie = cookie('judi_theme', $data['theme'], $minutes, '/', null, false, false, false, 'lax');
        $densityCookie = cookie('judi_density', $data['density'], $minutes, '/', null, false, false, false, 'lax');

        if ($request->expectsJson() || $request->ajax()) {
            return response()
                ->json(['ok' => true, 'theme' => $data['theme'], 'density' => $data['density']])
                ->withCookie($themeCookie)
                ->withCookie($densityCookie);
        }

        return redirect()
            ->route('settings.index')
            ->with('status', __('ui.settings_saved'))
            ->withCookie($themeCookie)
            ->withCookie($densityCookie);
    }

    public function updateDebtLimits(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->isAdmin(), 403);

        $enabled = $request->boolean('enforce_debt_limits');
        \App\Models\AppSetting::set(\App\Models\AppSetting::ENFORCE_DEBT_LIMITS, $enabled);

        return redirect()
            ->route('settings.index')
            ->with('status', $enabled ? __('ui.debt_limit_enabled') : __('ui.debt_limit_disabled'))
            ->withFragment('settings-debt');
    }

    public function backup(): StreamedResponse|Response
    {
        abort_unless(auth()->user()?->isAdmin(), 403);

        $name = 'judi-backup-'.now()->format('Ymd-His').'.sql';

        try {
            // Probe once so we fail with a clear flash instead of a blank 500 mid-stream.
            DatabaseBackup::assertReady();
        } catch (\Throwable $e) {
            report($e);

            return redirect()
                ->route('settings.index')
                ->with('error', __('ui.backup_failed'));
        }

        return response()->streamDownload(function () {
            DatabaseBackup::stream();
        }, $name, [
            'Content-Type' => 'application/sql; charset=UTF-8',
        ]);
    }

    public function importBackup(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->isAdmin(), 403);

        $request->validate([
            'backup_file' => ['required', 'file', 'max:51200'],
        ], [], [
            'backup_file' => __('ui.backup_file'),
        ]);

        $file = $request->file('backup_file');
        $ext = strtolower((string) $file->getClientOriginalExtension());
        if (! in_array($ext, ['sql', 'txt'], true)) {
            return redirect()
                ->route('settings.index')
                ->with('error', __('ui.backup_import_invalid'))
                ->withFragment('settings-backup');
        }
        $sql = @file_get_contents($file->getRealPath());
        if (! is_string($sql) || trim($sql) === '') {
            return redirect()
                ->route('settings.index')
                ->with('error', __('ui.backup_import_empty'))
                ->withFragment('settings-backup');
        }

        try {
            $result = DatabaseBackup::import($sql);
        } catch (\InvalidArgumentException $e) {
            return redirect()
                ->route('settings.index')
                ->with('error', $e->getMessage())
                ->withFragment('settings-backup');
        } catch (\Throwable $e) {
            report($e);

            return redirect()
                ->route('settings.index')
                ->with('error', __('ui.backup_import_failed'))
                ->withFragment('settings-backup');
        }

        return redirect()
            ->route('settings.index')
            ->with('status', __('ui.backup_imported', [
                'statements' => number_format($result['statements']),
                'tables' => number_format(count($result['tables'])),
            ]))
            ->withFragment('settings-backup');
    }

    public function approveDevice(Request $request, DeviceLoginRequest $deviceLoginRequest): RedirectResponse
    {
        abort_unless($request->user()->canApproveDevices(), 403);

        $ok = DeviceGuard::approve($deviceLoginRequest, $request->user());

        return $this->deviceDeskRedirect($request, $ok ? 'status' : 'error', $ok ? __('ui.device_approved') : __('ui.device_approve_failed'));
    }

    public function rejectDevice(Request $request, DeviceLoginRequest $deviceLoginRequest): RedirectResponse
    {
        abort_unless($request->user()->canApproveDevices(), 403);

        if ($deviceLoginRequest->status === 'pending') {
            $deviceLoginRequest->forceFill([
                'status' => 'rejected',
                'resolved_at' => now(),
                'resolved_by' => $request->user()->id,
            ])->save();
        }

        return $this->deviceDeskRedirect($request, 'status', __('ui.device_rejected'));
    }

    /** Signed push action: Approve from notification button. */
    public function approveDeviceFromPush(Request $request, DeviceLoginRequest $deviceLoginRequest): JsonResponse|RedirectResponse
    {
        abort_unless($request->user()->canApproveDevices(), 403);

        $ok = DeviceGuard::approve($deviceLoginRequest, $request->user());
        $message = $ok ? __('ui.device_approved') : __('ui.device_approve_failed');

        if ($this->wantsPushJson($request)) {
            return response()->json([
                'ok' => $ok,
                'title' => __('ui.notif_device_ok_title'),
                'message' => $message,
            ], $ok ? 200 : 422);
        }

        return redirect()
            ->route('devices.index')
            ->with($ok ? 'status' : 'error', $message);
    }

    /** Signed push action: Reject from notification button. */
    public function rejectDeviceFromPush(Request $request, DeviceLoginRequest $deviceLoginRequest): JsonResponse|RedirectResponse
    {
        abort_unless($request->user()->canApproveDevices(), 403);

        if ($deviceLoginRequest->status === 'pending') {
            $deviceLoginRequest->forceFill([
                'status' => 'rejected',
                'resolved_at' => now(),
                'resolved_by' => $request->user()->id,
            ])->save();
        }

        $message = __('ui.device_rejected');

        if ($this->wantsPushJson($request)) {
            return response()->json([
                'ok' => true,
                'title' => __('ui.device_rejected'),
                'message' => $message,
            ]);
        }

        return redirect()
            ->route('devices.index')
            ->with('status', $message);
    }

    private function wantsPushJson(Request $request): bool
    {
        return $request->expectsJson()
            || $request->header('X-Judi-Push') === '1'
            || $request->ajax();
    }

    private function deviceDeskRedirect(Request $request, string $flashKey, string $message): RedirectResponse
    {
        if ($request->input('return_to') === 'devices' || $request->headers->get('Referer') && str_contains((string) $request->headers->get('Referer'), '/devices')) {
            return redirect()->route('devices.index')->with($flashKey, $message);
        }

        return back()->with($flashKey, $message);
    }

    public function revokeDevice(Request $request, UserDevice $userDevice): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->isAdmin(), 403);

        $currentToken = DeviceFingerprint::token($request, $user);
        $isOwnCurrent = $userDevice->user_id === $user->id
            && $userDevice->device_token === $currentToken;

        $ownerId = $userDevice->user_id;
        $userDevice->delete();

        if ($isOwnCurrent) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()
                ->route('login')
                ->with('status', __('ui.device_revoked_current'))
                ->withCookie(DeviceFingerprint::forgetCookie($ownerId));
        }

        return $this->deviceDeskRedirect($request, 'status', __('ui.device_revoked'));
    }

    /**
     * Admin: remove every approved device for the signed-in admin except this browser.
     */
    public function revokeOtherDevices(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->isAdmin(), 403);

        $currentToken = DeviceFingerprint::token($request, $user);

        UserDevice::query()
            ->where('user_id', $user->id)
            ->where('device_token', '!=', $currentToken)
            ->delete();

        DeviceLoginRequest::query()
            ->where('user_id', $user->id)
            ->where('status', 'pending')
            ->delete();

        return back()->with('status', __('ui.device_others_revoked'));
    }

    /**
     * Admin: revoke every approved device for a user (forces re-approval everywhere).
     */
    public function revokeUserDevices(Request $request, User $user): RedirectResponse
    {
        abort_unless($request->user()->isAdmin(), 403);

        UserDevice::query()->where('user_id', $user->id)->delete();

        DeviceLoginRequest::query()
            ->where('user_id', $user->id)
            ->where('status', 'pending')
            ->delete();

        return back()->with('status', __('ui.device_user_all_revoked', ['name' => $user->name]));
    }

    public function sendNotification(Request $request): RedirectResponse
    {
        abort_unless($request->user()->isAdmin(), 403);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'body' => ['required', 'string', 'max:2000'],
            'audience' => ['required', 'in:all,admin,accountant,collector'],
        ]);

        $audience = $data['audience'] === 'all' ? 'all' : 'role';
        $targetRole = $data['audience'] === 'all' ? null : $data['audience'];

        AppNotification::query()->create([
            'sender_id' => $request->user()->id,
            'type' => 'broadcast',
            'title' => $data['title'],
            'body' => $data['body'],
            'audience' => $audience,
            'target_role' => $targetRole,
        ]);

        if ($audience === 'all') {
            $userIds = User::query()->where('is_active', true)->pluck('id')->all();
            WebPushNotifier::sendToUserIds($userIds, $data['title'], $data['body'], '/notifications');
        } else {
            WebPushNotifier::notifyRoles(
                [$targetRole],
                $data['title'],
                $data['body'],
                '/notifications',
            );
        }

        return redirect()
            ->route('notifications.index')
            ->with('status', __('ui.notif_sent'));
    }

    public function markNotificationsRead(Request $request): RedirectResponse
    {
        $user = $request->user();
        $ids = AppNotification::query()->visibleTo($user)->pluck('id');

        foreach ($ids as $id) {
            AppNotificationRead::query()->firstOrCreate(
                [
                    'app_notification_id' => $id,
                    'user_id' => $user->id,
                ],
                ['read_at' => now()],
            );
        }

        return back()->with('status', __('ui.notif_marked_read'));
    }

    public function clearNotifications(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->isAdmin()) {
            AppNotification::query()
                ->whereIn('type', ['user_signed_in', 'device_login', 'device_approved'])
                ->delete();
        }

        $visibleIds = AppNotification::query()->visibleTo($user)->pluck('id');
        AppNotificationRead::query()
            ->where('user_id', $user->id)
            ->whereIn('app_notification_id', $visibleIds)
            ->delete();

        AppNotification::query()
            ->where('audience', 'user')
            ->where('target_user_id', $user->id)
            ->delete();

        return back()->with('status', __('ui.notif_cleared'));
    }

    public function deleteNotification(Request $request, AppNotification $appNotification): RedirectResponse
    {
        $user = $request->user();

        $visible = AppNotification::query()
            ->visibleTo($user)
            ->whereKey($appNotification->id)
            ->exists();
        abort_unless($visible || $user->isAdmin(), 403);

        if ($user->isAdmin() || $appNotification->audience === 'user') {
            $appNotification->delete();
        } else {
            AppNotificationRead::query()->firstOrCreate(
                [
                    'app_notification_id' => $appNotification->id,
                    'user_id' => $user->id,
                ],
                ['read_at' => now()],
            );
        }

        return back()->with('status', __('ui.notif_deleted'));
    }
}
