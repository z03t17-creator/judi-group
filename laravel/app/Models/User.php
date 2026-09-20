<?php

namespace App\Models;

use App\Enums\CollectorChannel;
use App\Enums\PagePermission;
use App\Enums\Role;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable([
    'name',
    'email',
    'password',
    'role',
    'collector_channel',
    'is_active',
    'image_path',
    'max_discount_percent',
    'max_gift_percent',
    'permissions',
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => Role::class,
            'collector_channel' => CollectorChannel::class,
            'is_active' => 'boolean',
            'max_discount_percent' => 'decimal:2',
            'max_gift_percent' => 'decimal:2',
            'permissions' => 'array',
        ];
    }

    public function isAdmin(): bool
    {
        return $this->role === Role::Admin;
    }

    public function isAccountant(): bool
    {
        return $this->role === Role::Accountant;
    }

    public function isCollector(): bool
    {
        return $this->role === Role::Collector;
    }

    public function canApproveDevices(): bool
    {
        return $this->isAdmin() || $this->isAccountant();
    }

    public function hasAnyRole(Role ...$roles): bool
    {
        return in_array($this->role, $roles, true);
    }

    /**
     * Whether this user uses a custom permission list (not role defaults).
     */
    public function hasCustomPermissions(): bool
    {
        return is_array($this->permissions);
    }

    /**
     * Effective permission keys for this user.
     *
     * @return list<string>
     */
    public function effectivePermissions(): array
    {
        if ($this->isAdmin()) {
            return PagePermission::defaultValuesFor(Role::Admin);
        }

        if (is_array($this->permissions)) {
            return array_values(array_unique(array_map('strval', $this->permissions)));
        }

        $role = $this->role instanceof Role ? $this->role : Role::Collector;

        return PagePermission::defaultValuesFor($role);
    }

    public function canAccess(PagePermission|string $permission): bool
    {
        if ($this->isAdmin()) {
            return true;
        }

        $key = $permission instanceof PagePermission
            ? $permission->value
            : $permission;

        return in_array($key, $this->effectivePermissions(), true);
    }

    public function imageUrl(): string
    {
        return \App\Support\ProfileImage::url($this->image_path, 'images/placeholders/person.svg');
    }

    public function invoices(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Invoice::class, 'collector_id');
    }
}
