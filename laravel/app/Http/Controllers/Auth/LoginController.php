<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Support\DeviceFingerprint;
use App\Support\DeviceGuard;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;

class LoginController extends Controller
{
    public function create(): View|RedirectResponse
    {
        if (Auth::check()) {
            return redirect()->route('home');
        }

        return view('auth.login');
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

        $token = DeviceFingerprint::token($request);
        $request->session()->put(DeviceFingerprint::SESSION_KEY, $token);
        $pending = DeviceGuard::afterLogin($user, $request, $token);

        $response = $pending
            ? redirect()->route('device.pending')->with('device_pending_id', $pending->id)
            : redirect()->intended(route('home'));

        if ($pending) {
            $request->session()->put('device_pending_id', $pending->id);
        }

        return $response->withCookie(DeviceFingerprint::queueCookie($token));
    }

    public function destroy(Request $request): RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }
}
