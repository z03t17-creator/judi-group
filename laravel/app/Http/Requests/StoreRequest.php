<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user && $user->canAccess(\App\Enums\PagePermission::StoresManage);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'owner_name' => ['nullable', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:40'],
            'address' => ['nullable', 'string', 'max:500'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'credit_limit' => ['required', 'numeric', 'min:0', 'max:999999999'],
            'image' => ['nullable', 'image', 'max:4096'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'ناوی فرۆشگا پێویستە.',
            'phone.required' => 'ژمارەی تەلەفۆن پێویستە.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $lat = $this->input('latitude');
        $lng = $this->input('longitude');

        $this->merge([
            'is_active' => $this->boolean('is_active'),
            'owner_name' => $this->filled('owner_name') ? trim((string) $this->input('owner_name')) : null,
            'address' => $this->filled('address') ? trim((string) $this->input('address')) : null,
            'credit_limit' => str_replace(',', '', (string) $this->input('credit_limit', '0')),
            'latitude' => ($lat === '' || $lat === null) ? null : $lat,
            'longitude' => ($lng === '' || $lng === null) ? null : $lng,
        ]);
    }
}
