<?php

namespace App\Http\Requests;

use App\Enums\CollectorChannel;
use App\Enums\Role;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class CollectorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->canAccess(\App\Enums\PagePermission::CollectorsManage);
    }

    public function rules(): array
    {
        $collector = $this->route('collector');
        $collectorId = $collector?->id;
        $isUpdate = $this->isMethod('PUT') || $this->isMethod('PATCH');

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($collectorId),
            ],
            'password' => [
                $isUpdate ? 'nullable' : 'required',
                'confirmed',
                Password::defaults(),
            ],
            'collector_channel' => ['required', Rule::enum(CollectorChannel::class)],
            'max_discount_percent' => ['required', 'numeric', 'min:0', 'max:100'],
            'max_gift_percent' => ['required', 'numeric', 'min:0', 'max:100'],
            'image' => ['nullable', 'image', 'max:4096'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'ناوی مەندوب پێویستە.',
            'email.required' => 'ئیمەیڵ پێویستە.',
            'email.unique' => 'ئەم ئیمەیڵە پێشتر بەکارهاتووە.',
            'password.required' => 'وشەی نهێنی پێویستە.',
            'collector_channel.required' => 'جۆری مەندوب پێویستە.',
            'max_discount_percent.required' => 'سنووری داشکاندن پێویستە.',
            'max_gift_percent.required' => 'سنووری دیاری پێویستە.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'is_active' => $this->boolean('is_active'),
            'role' => Role::Collector->value,
        ]);
    }
}
