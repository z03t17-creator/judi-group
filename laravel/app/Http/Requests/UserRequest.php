<?php

namespace App\Http\Requests;

use App\Enums\CollectorChannel;
use App\Enums\PagePermission;
use App\Enums\Role;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->canAccess(PagePermission::Users);
    }

    public function rules(): array
    {
        $user = $this->route('user');
        $role = $this->input('role');

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user?->id),
            ],
            'password' => ['nullable', 'confirmed', Password::defaults()],
            'role' => ['required', Rule::enum(Role::class)],
            'collector_channel' => [
                Rule::requiredIf($role === Role::Collector->value),
                'nullable',
                Rule::enum(CollectorChannel::class),
            ],
            'max_discount_percent' => [
                Rule::requiredIf($role === Role::Collector->value),
                'nullable',
                'numeric',
                'min:0',
                'max:100',
            ],
            'max_gift_percent' => [
                Rule::requiredIf($role === Role::Collector->value),
                'nullable',
                'numeric',
                'min:0',
                'max:100',
            ],
            'image' => ['nullable', 'image', 'max:4096'],
            'is_active' => ['sometimes', 'boolean'],
            'use_custom_permissions' => ['sometimes', 'boolean'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', Rule::in(array_map(fn (PagePermission $p) => $p->value, PagePermission::cases()))],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'ناو پێویستە.',
            'email.required' => 'ئیمەیڵ پێویستە.',
            'email.unique' => 'ئەم ئیمەیڵە پێشتر بەکارهاتووە.',
            'role.required' => 'ڕۆڵ پێویستە.',
            'collector_channel.required' => 'جۆری مەندوب پێویستە.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'is_active' => $this->boolean('is_active'),
            'use_custom_permissions' => $this->boolean('use_custom_permissions'),
        ]);
    }
}
