<?php

namespace App\Support;

use App\Enums\Role;
use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

final class WebPushNotifier
{
    public static function enabled(): bool
    {
        return filled(config('services.webpush.public_key'))
            && filled(config('services.webpush.private_key'));
    }

    /**
     * @param  list<Role|string>  $roles
     */
    public static function notifyRoles(array $roles, string $title, string $body, ?string $url = null): void
    {
        if (! self::enabled()) {
            return;
        }

        $roleValues = array_map(
            static fn ($role) => $role instanceof Role ? $role->value : (string) $role,
            $roles,
        );

        $userIds = User::query()
            ->whereIn('role', $roleValues)
            ->where('is_active', true)
            ->pluck('id');

        if ($userIds->isEmpty()) {
            return;
        }

        self::sendToUserIds($userIds->all(), $title, $body, $url);
    }

    /**
     * @param  list<int>  $userIds
     */
    public static function sendToUserIds(array $userIds, string $title, string $body, ?string $url = null): void
    {
        if (! self::enabled() || $userIds === []) {
            return;
        }

        $subs = PushSubscription::query()->whereIn('user_id', $userIds)->get();
        if ($subs->isEmpty()) {
            return;
        }

        try {
            $webPush = new WebPush([
                'VAPID' => [
                    'subject' => (string) config('services.webpush.subject', 'mailto:admin@judi.local'),
                    'publicKey' => (string) config('services.webpush.public_key'),
                    'privateKey' => (string) config('services.webpush.private_key'),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::warning('webpush.init_failed', ['error' => $e->getMessage()]);

            return;
        }

        $payload = json_encode([
            'title' => $title,
            'body' => $body,
            'url' => $url ?: '/settings#settings-devices-pending',
        ], JSON_UNESCAPED_UNICODE);

        foreach ($subs as $sub) {
            try {
                $webPush->queueNotification(
                    Subscription::create([
                        'endpoint' => $sub->endpoint,
                        'publicKey' => $sub->public_key,
                        'authToken' => $sub->auth_token,
                        'contentEncoding' => $sub->content_encoding ?: 'aesgcm',
                    ]),
                    $payload ?: '{}',
                );
            } catch (\Throwable $e) {
                Log::warning('webpush.queue_failed', ['id' => $sub->id, 'error' => $e->getMessage()]);
            }
        }

        foreach ($webPush->flush() as $report) {
            if ($report->isSuccess()) {
                continue;
            }

            $endpoint = $report->getRequest()?->getUri()?->__toString();
            if ($endpoint) {
                PushSubscription::query()->where('endpoint', $endpoint)->delete();
            }
        }
    }
}
