<?php

namespace App\Providers;

use App\Enums\Role;
use App\Models\User;
use App\Support\Brand;
use Illuminate\Pagination\Paginator;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Paginator::defaultView('pagination.default');
        Paginator::defaultSimpleView('pagination.simple');

        View::share(
            'judiLogoUrl',
            asset((string) config('judi.logo', 'images/judi-logo.jpg'))
                .'?v='.(string) config('judi.logo_version', '2'),
        );

        View::composer('*', function ($view): void {
            $view->with('brandName', Brand::name());
            $view->with('brandShort', Brand::short());
            $view->with('judiCompany', Brand::company());

            $activeVisitTimer = null;
            $user = auth()->user();
            if ($user && method_exists($user, 'isCollector') && $user->isCollector()) {
                $activeVisitTimer = \App\Models\StoreVisit::openForCollector($user);
            }
            $view->with('activeVisitTimer', $activeVisitTimer);
        });

        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }

        Route::bind('collector', function (string $value) {
            return User::query()
                ->where('role', Role::Collector)
                ->whereKey($value)
                ->firstOrFail();
        });
    }
}
