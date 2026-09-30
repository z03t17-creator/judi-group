<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\StoreVisit;
use App\Support\DeviceFingerprint;
use App\Support\DeviceGuard;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;

class LoginController extends Controller
{
    public function create(): View|RedirectResponse|Response
    {
        if (Auth::check()) {
            return redirect()->route('home');
        }

        return response()
            ->view('auth.login')
            ->withCookie(DeviceFingerprint::queueBrowserCookie(request()));
    }

    public function store(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ], [
            'email.required' => 'ئیمەیڵ پێویستە.',
            'email.email' => 'ئیمەیڵ دروست نییە.',
            'password.required' => 'وشەی نهێنی پێویستە.',
        ]);

        if (! Auth::attempt($credentials, $request->boolean('remember'))) {
            return back()
                ->withInput($request->only('email', 'remember'))
                ->withErrors(['email' => 'ئیمەیڵ یان وشەی نهێنی هەڵەیە.']);
        }

        $user = Auth::user();

        if (! $user->is_active) {
            Auth::logout();

            return back()
                ->withInput($request->only('email'))
                ->withErrors(['email' => 'هەژمارەکەت ناچالاک کراوە.']);
        }

        $request->session()->regenerate();

        $token = DeviceFingerprint::token($request, $user);
        $request->session()->put(DeviceFingerprint::sessionKey($user->id), $token);
        $pending = DeviceGuard::afterLogin($user, $request, $token);

        $response = $pending
            ? redirect()->route('device.pending')->with('device_pending_id', $pending->id)
            : redirect()->intended(route('home'));

        if ($pending) {
            $request->session()->put('device_pending_id', $pending->id);
        }

        return $response
            ->withCookie(DeviceFingerprint::queueCookie($token, $user->id))
            ->withCookie(DeviceFingerprint::queueBrowserCookie($request));
    }

    public function destroy(Request $request): RedirectResponse
    {
        $user = Auth::user();
        if ($user && method_exists($user, 'isCollector') && $user->isCollector()) {
            $open = StoreVisit::openForCollector($user);
            if ($open) {
                try {
                    $open->end($user);
                } catch (\Throwable) {
                    // Still log out even if visit close fails.
                }
            }
        }

        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        // Keep device cookies so the same phone stays approved after logout
        // (Rosery-style: approve once per device, not per login).
        return redirect()->route('login')
            ->withCookie(DeviceFingerprint::queueBrowserCookie($request));
    }
}
