<?php

namespace App\Http\Controllers;

use App\Models\AppNotification;
use App\Models\AppNotificationRead;
use App\Models\DeviceLoginRequest;
use App\Models\UserDevice;
use App\Support\DatabaseBackup;
use App\Support\DeviceFingerprint;
use App\Support\DeviceGuard;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
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

        $myDevices = UserDevice::query()
            ->where('user_id', $user->id)
            ->whereNotNull('approved_at')
            ->latest('last_seen_at')
            ->get();

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

        return view('settings.index', [
            'theme' => in_array($theme, ['light', 'dark'], true) ? $theme : 'light',
            'density' => in_array($density, ['small', 'big'], true) ? $density : 'small',
            'pendingDevices' => $pendingDevices,
            'myDevices' => $myDevices,
            'notifications' => $notifications,
            'readIds' => $readIds,
            'currentDevice' => DeviceFingerprint::token($request),
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

    public function backup(): StreamedResponse|Response
    {
        abort_unless(auth()->user()?->isAdmin(), 403);

        $sql = DatabaseBackup::toSql();
        $name = 'judi-backup-'.now()->format('Ymd-His').'.sql';

        return response()->streamDownload(function () use ($sql) {
            echo $sql;
        }, $name, [
            'Content-Type' => 'application/sql; charset=UTF-8',
        ]);
    }

    public function approveDevice(Request $request, DeviceLoginRequest $deviceLoginRequest): RedirectResponse
    {
        abort_unless($request->user()->canApproveDevices(), 403);

        $data = $request->validate([
            'code' => ['nullable', 'string', 'max:8'],
        ]);

        $ok = DeviceGuard::approve($deviceLoginRequest, $request->user(), $data['code'] ?? null);

        return back()->with(
            $ok ? 'status' : 'error',
            $ok ? __('ui.device_approved') : __('ui.device_code_bad'),
        );
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

        return back()->with('status', __('ui.device_rejected'));
    }

    public function revokeDevice(Request $request, UserDevice $userDevice): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->isAdmin() || $userDevice->user_id === $user->id, 403);

        $userDevice->delete();

        return back()->with('status', __('ui.device_revoked'));
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

        return back()->with('status', __('ui.notif_sent'));
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
}
