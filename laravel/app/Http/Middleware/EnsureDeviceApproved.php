<?php

namespace App\Http\Middleware;

use App\Support\DeviceFingerprint;
use App\Support\DeviceGuard;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureDeviceApproved
{
    public function handle(Request $request, Closure $next): Response
    {
        if (app()->runningUnitTests()) {
            return $next($request);
        }

        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        if ($request->routeIs('device.pending', 'device.pending.poll', 'logout', 'locale.switch', 'locale.next')) {
            return $next($request);
        }

        $token = DeviceFingerprint::token($request);
        $request->session()->put(DeviceFingerprint::sessionKey($user->id), $token);

        if (DeviceGuard::isApproved($user, $token)) {
            return $next($request)->withCookie(DeviceFingerprint::queueCookie($token, $user->id));
        }

        if ($request->session()->get('device_pending_id')) {
            return redirect()->route('device.pending')
                ->withCookie(DeviceFingerprint::queueCookie($token, $user->id));
        }

        // Unknown device after session existed — force pending check page.
        return redirect()->route('device.pending')
            ->withCookie(DeviceFingerprint::queueCookie($token, $user->id));
    }
}
