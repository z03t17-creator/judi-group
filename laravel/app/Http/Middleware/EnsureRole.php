<?php

namespace App\Http\Middleware;

use App\Enums\Role;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return redirect()->route('login');
        }

        $allowed = array_map(
            fn (string $role) => Role::from($role),
            $roles,
        );

        if (! $user->hasAnyRole(...$allowed)) {
            abort(403, 'دەسەڵاتت نییە بۆ ئەم بەشە.');
        }

        return $next($request);
    }
}
