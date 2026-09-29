<?php

namespace App\Http\Controllers;

use App\Models\PushSubscription;
use App\Support\WebPushNotifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PushSubscriptionController extends Controller
{
    public function publicKey(): JsonResponse
    {
        return response()->json([
            'publicKey' => config('services.webpush.public_key') ?: null,
            'enabled' => filled(config('services.webpush.public_key'))
                && filled(config('services.webpush.private_key')),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'endpoint' => ['required', 'string', 'max:1024'],
            'keys.p256dh' => ['required', 'string', 'max:512'],
            'keys.auth' => ['required', 'string', 'max:255'],
            'contentEncoding' => ['nullable', 'string', 'max:32'],
        ]);

        PushSubscription::query()->updateOrCreate(
            [
                'user_id' => $request->user()->id,
                'endpoint' => $data['endpoint'],
            ],
            [
                'public_key' => $data['keys']['p256dh'],
                'auth_token' => $data['keys']['auth'],
                'content_encoding' => $data['contentEncoding'] ?? 'aesgcm',
                'user_agent' => substr((string) $request->userAgent(), 0, 500),
            ],
        );

        return response()->json(['ok' => true]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $data = $request->validate([
            'endpoint' => ['required', 'string', 'max:500'],
        ]);

        PushSubscription::query()
            ->where('user_id', $request->user()->id)
            ->where('endpoint', $data['endpoint'])
            ->delete();

        return response()->json(['ok' => true]);
    }

    /**
     * Send a test push to the current user's subscribed devices (like the video demo).
     */
    public function test(Request $request): JsonResponse
    {
        if (! WebPushNotifier::enabled()) {
            return response()->json(['ok' => false, 'error' => 'push-disabled'], 503);
        }

        $user = $request->user();
        $count = PushSubscription::query()->where('user_id', $user->id)->count();
        if ($count < 1) {
            return response()->json(['ok' => false, 'error' => 'no-subscription'], 422);
        }

        WebPushNotifier::sendToUserIds(
            [$user->id],
            __('ui.notif_push_test_title'),
            __('ui.notif_push_test_body'),
            route('notifications.index', absolute: false),
            ['tag' => 'judi-push-test'],
        );

        return response()->json(['ok' => true, 'devices' => $count]);
    }
}
