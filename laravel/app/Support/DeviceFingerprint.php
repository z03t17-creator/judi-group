<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Str;

final class DeviceFingerprint
{
    public const COOKIE = 'judi_device';

    public const SESSION_KEY = 'judi_device_token';

    public static function token(Request $request): string
    {
        $fromCookie = self::normalize((string) $request->cookie(self::COOKIE, ''));
        if ($fromCookie !== null) {
            self::rememberInSession($request, $fromCookie);

            return $fromCookie;
        }

        $fromSession = self::normalize((string) $request->session()->get(self::SESSION_KEY, ''));
        if ($fromSession !== null) {
            return $fromSession;
        }

        $token = hash('sha256', Str::uuid()->toString().'|'.$request->userAgent().'|'.$request->ip());
        self::rememberInSession($request, $token);

        return $token;
    }

    public static function queueCookie(string $token): \Symfony\Component\HttpFoundation\Cookie
    {
        return cookie(
            self::COOKIE,
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

    private static function rememberInSession(Request $request, string $token): void
    {
        if ($request->hasSession()) {
            $request->session()->put(self::SESSION_KEY, $token);
        }
    }
}
