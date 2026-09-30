<?php

namespace App\Http\Middleware;

use App\Models\StoreVisit;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class LockOutsideActiveVisit
{
    /**
     * While a collector has an open store visit, block leaving visit workflow.
     *
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user || ! method_exists($user, 'isCollector') || ! $user->isCollector()) {
            return $next($request);
        }

        $open = StoreVisit::openForCollector($user);
        if (! $open) {
            return $next($request);
        }

        if ($this->isAllowed($request)) {
            return $next($request);
        }

        return redirect()
            ->route('visits.show', $open)
            ->with('error', __('ui.visit_end_first'));
    }

    private function isAllowed(Request $request): bool
    {
        $route = $request->route()?->getName() ?? '';

        $patterns = [
            'visits.*',
            'invoices.create',
            'invoices.store',
            'invoices.show',
            'collections.create',
            'collections.store',
            'collections.show',
            'locale.*',
            'settings.preferences',
            'notifications.*',
            'settings.notifications.*',
            'push.*',
            'logout',
        ];

        foreach ($patterns as $pattern) {
            if ($route !== '' && $request->routeIs($pattern)) {
                return true;
            }
        }

        // Keep theme/push/api paths working without named routes.
        $path = trim($request->path(), '/');
        if (str_starts_with($path, 'api/') || str_starts_with($path, 'push/')) {
            return true;
        }

        return false;
    }
}
