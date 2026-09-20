<?php

namespace App\Http\Controllers;

use App\Models\AppNotification;
use App\Models\AppNotificationRead;
use App\Models\DeviceLoginRequest;
use App\Support\DeviceFingerprint;
use App\Support\DeviceGuard;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\View\View;

class DevicePendingController extends Controller
{
    public function show(Request $request): View|RedirectResponse|Response
    {
        $user = $request->user();
        $token = DeviceFingerprint::token($request);

        if (DeviceGuard::isApproved($user, $token)) {
            $request->session()->forget('device_pending_id');

            return redirect()->route('home')
                ->withCookie(DeviceFingerprint::queueCookie($token));
        }

        $pendingId = $request->session()->get('device_pending_id');
        $pending = $pendingId
            ? DeviceLoginRequest::query()->whereKey($pendingId)->first()
            : null;

        if (! $pending || $pending->user_id !== $user->id) {
            $pending = DeviceLoginRequest::query()
                ->where('user_id', $user->id)
                ->where('device_token', $token)
                ->where('status', 'pending')
                ->where('expires_at', '>', now())
                ->latest()
                ->first();
        }

        if (! $pending) {
            $pending = DeviceGuard::afterLogin($user, $request, $token);
            if ($pending) {
                $request->session()->put('device_pending_id', $pending->id);
            } else {
                return redirect()->route('home')
                    ->withCookie(DeviceFingerprint::queueCookie($token));
            }
        }

        return response()
            ->view('auth.device-pending', [
                'pending' => $pending,
                'deviceLabel' => DeviceFingerprint::shortLabel($pending->user_agent),
            ])
            ->withCookie(DeviceFingerprint::queueCookie($token));
    }

    public function poll(Request $request): JsonResponse
    {
        $user = $request->user();
        $token = DeviceFingerprint::token($request);

        if (DeviceGuard::isApproved($user, $token)) {
            $request->session()->forget('device_pending_id');

            return response()->json(['approved' => true, 'redirect' => route('home')]);
        }

        return response()->json(['approved' => false]);
    }
}
