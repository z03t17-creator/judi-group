<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Cookie;

final class DeviceFingerprint
{
    /** @deprecated Shared cookie — only used before login; prefer cookieName($userId). */
    public const COOKIE = 'judi_device';

    public const COOKIE_PREFIX = 'judi_device_u';

    public const SESSION_KEY = 'judi_device_token';

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
     * Stable token for this browser + user. Tokens are per-user so switching
     * accounts on the same PC does not reuse another account's device id.
     */
    public static function token(Request $request, ?User $user = null): string
    {
        $userId = $user?->id ?? $request->user()?->id;
        $sessionKey = self::sessionKey($userId);

        if ($userId) {
            $fromCookie = self::normalize((string) $request->cookie(self::cookieName($userId), ''));
            if ($fromCookie !== null) {
                self::rememberInSession($request, $sessionKey, $fromCookie);

                return $fromCookie;
            }
        }

        $fromSession = self::normalize((string) $request->session()->get($sessionKey, ''));
        if ($fromSession !== null) {
            return $fromSession;
        }

        // Pre-login / anonymous: do not reuse another user's cookie.
        if (! $userId) {
            $legacy = self::normalize((string) $request->cookie(self::COOKIE, ''));
            if ($legacy !== null) {
                self::rememberInSession($request, $sessionKey, $legacy);

                return $legacy;
            }
        }

        $token = hash('sha256', Str::uuid()->toString().'|'.($userId ?? '0').'|'.$request->userAgent());
        self::rememberInSession($request, $sessionKey, $token);

        return $token;
    }

    public static function queueCookie(string $token, ?int $userId = null): Cookie
    {
        $userId ??= auth()->id();

        return cookie(
            self::cookieName($userId),
            $token,
            60 * 24 * 365 * 2,
            '/',
            null,
            (bool) config('session.secure', false),
            true,
            false,
            'lax',
        );
    }

    public static function forgetCookie(?int $userId): Cookie
    {
        return cookie()->forget(self::cookieName($userId));
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
}
