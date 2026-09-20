<?php

namespace App\Providers;

use App\Enums\Role;
use App\Models\User;
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
