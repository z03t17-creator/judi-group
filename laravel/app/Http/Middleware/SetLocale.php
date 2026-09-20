<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    public const LOCALES = ['ckb', 'ar', 'en'];

    public function handle(Request $request, Closure $next): Response
    {
        $locale = $request->session()->get('locale', config('app.locale', 'ckb'));

        if (! in_array($locale, self::LOCALES, true)) {
            $locale = 'ckb';
        }

        app()->setLocale($locale);

        return $next($request);
    }
}
