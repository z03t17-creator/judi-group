<?php

namespace App\Http\Controllers;

use App\Models\AppNotification;
use App\Models\AppNotificationRead;
use App\Models\DeviceLoginRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationFeedController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        $afterId = max(0, (int) $request->query('after_id', 0));

        $query = AppNotification::query()
            ->visibleTo($user)
            ->latest('id')
            ->limit(20);

        if ($afterId > 0) {
            $query->where('id', '>', $afterId);
        }

        $items = $query->get();
        $readIds = AppNotificationRead::query()
            ->where('user_id', $user->id)
            ->whereIn('app_notification_id', $items->pluck('id'))
            ->pluck('app_notification_id')
            ->all();

        $payload = $items->map(function (AppNotification $n) use ($readIds) {
            return [
                'id' => $n->id,
                'title' => $n->title,
                'body' => $n->body,
                'type' => $n->type,
                'created_at' => $n->created_at?->toIso8601String(),
                'unread' => ! in_array($n->id, $readIds, true),
                'href' => $n->type === 'device_login'
                    ? route('settings.index', absolute: false).'#settings-devices-pending'
                    : route('settings.index', absolute: false).'#settings-inbox',
            ];
        });

        $unread = AppNotification::query()
            ->visibleTo($user)
            ->whereDoesntHave('reads', fn ($q) => $q->where('user_id', $user->id))
            ->count();

        $pendingDevices = 0;
        if ($user->canApproveDevices()) {
            $pendingDevices = DeviceLoginRequest::query()
                ->where('status', 'pending')
                ->where('expires_at', '>', now())
                ->count();
        }

        $maxId = (int) AppNotification::query()->visibleTo($user)->max('id');

        return response()->json([
            'unread' => $unread,
            'pending_devices' => $pendingDevices,
            'notifications' => $payload,
            'max_id' => $maxId,
            'server_time' => now()->toIso8601String(),
        ]);
    }
}
