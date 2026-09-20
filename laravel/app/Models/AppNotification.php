<?php

namespace App\Models;

use App\Enums\Role;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AppNotification extends Model
{
    protected $fillable = [
        'sender_id',
        'type',
        'title',
        'body',
        'audience',
        'target_role',
        'target_user_id',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
        ];
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function reads(): HasMany
    {
        return $this->hasMany(AppNotificationRead::class);
    }

    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        return $query->where(function (Builder $q) use ($user) {
            $q->where('audience', 'all')
                ->orWhere(function (Builder $q2) use ($user) {
                    $q2->where('audience', 'role')
                        ->where('target_role', $user->role instanceof Role ? $user->role->value : $user->role);
                })
                ->orWhere(function (Builder $q2) use ($user) {
                    $q2->where('audience', 'user')
                        ->where('target_user_id', $user->id);
                });
        });
    }
}
