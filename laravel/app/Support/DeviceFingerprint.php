<?php

namespace App\Support;

use App\Models\User;
use App\Models\UserDevice;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Cookie;

final class DeviceFingerprint
{
    public const BROWSER_COOKIE = 'judi_browser';

    /** @deprecated Shared cookie — only used before login. */
    public const COOKIE = 'judi_device';

    public const COOKIE_PREFIX = 'judi_device_u';

    public const SESSION_KEY = 'judi_device_token';

    public const BROWSER_SESSION_KEY = 'judi_browser_id';

    public static function cookieName(?int $userId): string
    {
        if ($userId) {
            return self::COOKIE_PREFIX.$userId;
        }

        return self::COOKIE;
    }

    public static function sessionKey(?int $userId): string
    {
        return $userId
            ? self::SESSION_KEY.'_'.$userId
            : self::SESSION_KEY;
    }

    /**
     * Stable ID for this browser install (survives account switches).
     */
    public static function browserId(Request $request): string
    {
        $fromCookie = self::normalize((string) $request->cookie(self::BROWSER_COOKIE, ''));
        if ($fromCookie !== null) {
            self::rememberBrowserInSession($request, $fromCookie);

            return $fromCookie;
        }

        if ($request->hasSession()) {
            $fromSession = self::normalize((string) $request->session()->get(self::BROWSER_SESSION_KEY, ''));
            if ($fromSession !== null) {
                return $fromSession;
            }
        }

        $id = hash('sha256', random_bytes(32));
        self::rememberBrowserInSession($request, $id);

        return $id;
    }

    /**
     * Stable per-user device token derived from the browser id (no UUID spam).
     */
    public static function token(Request $request, ?User $user = null): string
    {
        $userId = $user?->id ?? $request->user()?->id;
        $sessionKey = self::sessionKey($userId);
        $browserId = self::browserId($request);

        if ($userId) {
            // Prefer existing per-user cookie when present (older sessions).
            $fromCookie = self::normalize((string) $request->cookie(self::cookieName($userId), ''));
            if ($fromCookie !== null) {
                self::rememberInSession($request, $sessionKey, $fromCookie);

                return $fromCookie;
            }

            $token = hash('sha256', 'judi|'.$browserId.'|u'.$userId);
            self::rememberInSession($request, $sessionKey, $token);

            return $token;
        }

        $fromSession = self::normalize((string) $request->session()->get($sessionKey, ''));
        if ($fromSession !== null) {
            return $fromSession;
        }

        $legacy = self::normalize((string) $request->cookie(self::COOKIE, ''));
        if ($legacy !== null) {
            self::rememberInSession($request, $sessionKey, $legacy);

            return $legacy;
        }

        $token = hash('sha256', 'judi|'.$browserId.'|anon');
        self::rememberInSession($request, $sessionKey, $token);

        return $token;
    }

    public static function queueCookie(string $token, ?int $userId = null): Cookie
    {
        $userId ??= auth()->id();
        $secure = self::cookieSecure();

        return cookie(
            self::cookieName($userId),
            $token,
            60 * 24 * 365 * 2,
            '/',
            null,
            $secure,
            true,
            false,
            'lax',
        );
    }

    public static function queueBrowserCookie(Request $request): Cookie
    {
        return cookie(
            self::BROWSER_COOKIE,
            self::browserId($request),
            60 * 24 * 365 * 2,
            '/',
            null,
            self::cookieSecure(),
            true,
            false,
            'lax',
        );
    }

    public static function forgetCookie(?int $userId): Cookie
    {
        return cookie()->forget(self::cookieName($userId));
    }

    /**
     * Collapse duplicate rows that share the same label + IP for one user.
     */
    public static function pruneDuplicateDevices(int $userId): void
    {
        $devices = UserDevice::query()
            ->where('user_id', $userId)
            ->orderByDesc('last_seen_at')
            ->orderByDesc('id')
            ->get();

        $seen = [];
        foreach ($devices as $device) {
            $key = mb_strtolower(trim((string) $device->label).'|'.trim((string) $device->ip_address));
            if (isset($seen[$key])) {
                $device->delete();

                continue;
            }
            $seen[$key] = true;
        }
    }

    public static function shortLabel(?string $userAgent): string
    {
        $ua = $userAgent ?? '';

        return match (true) {
            str_contains($ua, 'iPhone') || str_contains($ua, 'iPad') => 'iPhone / iPad',
            str_contains($ua, 'Android') => 'Android',
            str_contains($ua, 'Windows') => 'Windows',
            str_contains($ua, 'Mac OS') || str_contains($ua, 'Macintosh') => 'Mac',
            str_contains($ua, 'Linux') => 'Linux',
            default => 'Browser',
        };
    }

    private static function cookieSecure(): bool
    {
        try {
            return request()->secure() || (bool) config('session.secure', false);
        } catch (\Throwable) {
            return (bool) config('session.secure', false);
        }
    }

    private static function normalize(string $value): ?string
    {
        if (preg_match('/^[a-f0-9]{32,64}$/i', $value)) {
            return strtolower($value);
        }

        return null;
    }

    private static function rememberInSession(Request $request, string $sessionKey, string $token): void
    {
        if ($request->hasSession()) {
            $request->session()->put($sessionKey, $token);
        }
    }

    private static function rememberBrowserInSession(Request $request, string $id): void
    {
        if ($request->hasSession()) {
            $request->session()->put(self::BROWSER_SESSION_KEY, $id);
        }
    }
}
