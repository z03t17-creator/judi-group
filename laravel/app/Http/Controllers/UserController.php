<?php

namespace App\Http\Controllers;

use App\Enums\CollectorChannel;
use App\Enums\PagePermission;
use App\Enums\Role;
use App\Http\Requests\UserRequest;
use App\Models\User;
use App\Support\ProfileImage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class UserController extends Controller
{
    public function index(Request $request): View
    {
        $actor = $request->user();
        $canManageUsers = $actor->canAccess(PagePermission::Users);
        $canManageCollectors = $actor->canAccess(PagePermission::CollectorsManage);
        $canViewCollectors = $actor->canAccess(PagePermission::Collectors);

        // Accountants without full user admin only see collectors in this merged screen.
        $forceCollectorsOnly = ! $canManageUsers && $canViewCollectors;

        $roleFilter = $forceCollectorsOnly
            ? Role::Collector->value
            : $request->input('role');

        $users = User::query()
            ->when($forceCollectorsOnly, fn ($q) => $q->where('role', Role::Collector))
            ->when($request->filled('q'), function ($query) use ($request) {
                $q = '%'.$request->string('q').'%';
                $query->where(function ($inner) use ($q) {
                    $inner->where('name', 'like', $q)
                        ->orWhere('email', 'like', $q);
                });
            })
            ->when(! $forceCollectorsOnly && filled($roleFilter), function ($query) use ($roleFilter) {
                $query->where('role', $roleFilter);
            })
            ->orderByRaw("CASE role WHEN 'admin' THEN 1 WHEN 'accountant' THEN 2 WHEN 'collector' THEN 3 ELSE 4 END")
            ->orderBy('name')
            ->paginate(30)
            ->withQueryString();

        return view('users.index', [
            'users' => $users,
            'roles' => Role::cases(),
            'canManageUsers' => $canManageUsers,
            'canManageCollectors' => $canManageCollectors,
            'forceCollectorsOnly' => $forceCollectorsOnly,
            'roleFilter' => $roleFilter,
        ]);
    }

    public function edit(User $user): View
    {
        $defaultsByRole = [];
        foreach (Role::cases() as $role) {
            $defaultsByRole[$role->value] = PagePermission::defaultValuesFor($role);
        }

        return view('users.form', [
            'editUser' => $user,
            'roles' => Role::cases(),
            'channels' => CollectorChannel::cases(),
            'allPermissions' => PagePermission::cases(),
            'checkedPermissions' => old('permissions', $user->effectivePermissions()),
            'useCustomPermissions' => old('use_custom_permissions', $user->hasCustomPermissions() ? '1' : '0'),
            'defaultsByRole' => $defaultsByRole,
        ]);
    }

    public function update(UserRequest $request, User $user): RedirectResponse
    {
        $data = $request->safe()->except([
            'password_confirmation',
            'image',
            'permissions',
            'use_custom_permissions',
        ]);

        if (empty($data['password'])) {
            unset($data['password']);
        }

        if (($data['role'] ?? null) !== Role::Collector->value) {
            $data['collector_channel'] = null;
            $data['max_discount_percent'] = 0;
            $data['max_gift_percent'] = 0;
        }

        if ($request->boolean('use_custom_permissions')) {
            $allowed = array_map(fn (PagePermission $p) => $p->value, PagePermission::cases());
            $selected = array_values(array_intersect(
                $allowed,
                array_map('strval', $request->input('permissions', [])),
            ));
            $data['permissions'] = $selected;
        } else {
            $data['permissions'] = null;
        }

        // Admin always has full access — ignore custom list for admin role.
        if (($data['role'] ?? null) === Role::Admin->value) {
            $data['permissions'] = null;
        }

        if ($request->hasFile('image')) {
            ProfileImage::delete($user->image_path);
            $data['image_path'] = ProfileImage::store($request->file('image'), 'users');
        }

        $user->fill($data);
        $user->save();

        return redirect()
            ->route('users.index')
            ->with('success', 'بەکارهێنەر «'.$user->name.'» نوێکرایەوە.');
    }
}
