<?php

namespace App\Http\Controllers;

use App\Http\Middleware\SetLocale;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class LocaleController extends Controller
{
    public function __invoke(Request $request, string $locale): RedirectResponse
    {
        return $this->apply($request, $locale);
    }

    public function next(Request $request): RedirectResponse
    {
        $current = $request->session()->get('locale', app()->getLocale());
        $locales = SetLocale::LOCALES;
        $index = array_search($current, $locales, true);

        if ($index === false) {
            $index = 0;
        }

        $next = $locales[($index + 1) % count($locales)];

        return $this->apply($request, $next);
    }

    private function apply(Request $request, string $locale): RedirectResponse
    {
        if (! in_array($locale, SetLocale::LOCALES, true)) {
            abort(404);
        }

        $request->session()->put('locale', $locale);

        return back();
    }
}
