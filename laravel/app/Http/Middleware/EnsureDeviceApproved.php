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
            $response = $next($request);
            $this->attachDeviceCookies($response, $request, $token, $user->id);

            return $response;
        }

        return redirect()->route('device.pending')
            ->withCookie(DeviceFingerprint::queueCookie($token, $user->id))
            ->withCookie(DeviceFingerprint::queueBrowserCookie($request));
    }

    /**
     * Streamed downloads (backup) are Symfony StreamedResponse — no withCookie().
     * Queue cookies so AddQueuedCookiesToResponse still attaches them.
     */
    private function attachDeviceCookies(Response $response, Request $request, string $token, int $userId): void
    {
        $deviceCookie = DeviceFingerprint::queueCookie($token, $userId);
        $browserCookie = DeviceFingerprint::queueBrowserCookie($request);

        if (method_exists($response, 'withCookie')) {
            $response->withCookie($deviceCookie)->withCookie($browserCookie);

            return;
        }

        cookie()->queue($deviceCookie);
        cookie()->queue($browserCookie);
    }
}
