<?php

namespace App\Http\Controllers;

use App\Enums\CollectorChannel;
use App\Enums\Role;
use App\Http\Requests\CollectorRequest;
use App\Models\User;
use App\Support\ProfileImage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class CollectorController extends Controller
{
    public function index(Request $request): View
    {
        $collectors = User::query()
            ->where('role', Role::Collector)
            ->when($request->filled('q'), function ($query) use ($request) {
                $q = '%'.$request->string('q').'%';
                $query->where(function ($inner) use ($q) {
                    $inner->where('name', 'like', $q)
                        ->orWhere('email', 'like', $q);
                });
            })
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        return view('collectors.index', [
            'collectors' => $collectors,
            'canManage' => $request->user()?->canAccess(\App\Enums\PagePermission::CollectorsManage) ?? false,
        ]);
    }

    public function create(Request $request): View
    {
        $this->authorizeAdmin($request);

        return view('collectors.form', [
            'collector' => new User([
                'role' => Role::Collector,
                'collector_channel' => CollectorChannel::Wholesale,
                'is_active' => true,
                'max_discount_percent' => 0,
                'max_gift_percent' => 0,
            ]),
            'channels' => CollectorChannel::cases(),
        ]);
    }

    public function store(CollectorRequest $request): RedirectResponse
    {
        $data = $request->safe()->except(['password_confirmation', 'image']);
        $data['role'] = Role::Collector;
        $data['email_verified_at'] = now();

        if (empty($data['password'])) {
            unset($data['password']);
        }

        if ($request->hasFile('image')) {
            $data['image_path'] = ProfileImage::store($request->file('image'), 'collectors');
        }

        $collector = User::query()->create($data);

        return redirect()
            ->route('users.index', ['role' => 'collector'])
            ->with('success', 'مەندوب «'.$collector->name.'» زیادکرا.');
    }

    public function edit(Request $request, User $collector): View
    {
        $this->authorizeAdmin($request);
        $this->ensureCollector($collector);

        return view('collectors.form', [
            'collector' => $collector,
            'channels' => CollectorChannel::cases(),
        ]);
    }

    public function update(CollectorRequest $request, User $collector): RedirectResponse
    {
        $this->ensureCollector($collector);

        $data = $request->safe()->except(['password_confirmation', 'image']);
        $data['role'] = Role::Collector;

        if (empty($data['password'])) {
            unset($data['password']);
        }

        if ($request->hasFile('image')) {
            ProfileImage::delete($collector->image_path);
            $data['image_path'] = ProfileImage::store($request->file('image'), 'collectors');
        }

        $collector->update($data);

        return redirect()
            ->route('users.index', ['role' => 'collector'])
            ->with('success', 'مەندوب نوێکرایەوە.');
    }

    public function destroy(Request $request, User $collector): RedirectResponse
    {
        $this->authorizeAdmin($request);
        $this->ensureCollector($collector);

        if ($collector->id === $request->user()->id) {
            return back()->withErrors(['collector' => 'ناتوانیت خۆت بسڕیتەوە.']);
        }

        $collector->delete();

        return redirect()
            ->route('users.index', ['role' => 'collector'])
            ->with('success', 'مەندوب سڕایەوە.');
    }

    private function authorizeAdmin(Request $request): void
    {
        if (! $request->user()?->canAccess(\App\Enums\PagePermission::CollectorsManage)) {
            abort(403, 'دەسەڵاتت نییە بۆ ئەم بەشە.');
        }
    }

    private function ensureCollector(User $collector): void
    {
        if ($collector->role !== Role::Collector) {
            abort(404);
        }
    }
}
