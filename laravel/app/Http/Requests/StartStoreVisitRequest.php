<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StartStoreVisitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->canAccess(\App\Enums\PagePermission::Stores);
    }

    public function rules(): array
    {
        return [
            'store_id' => ['required', 'integer', 'exists:stores,id'],
            'note' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'store_id.required' => __('ui.invoice_pick_store'),
            'store_id.exists' => __('ui.invoice_pick_store'),
        ];
    }
}
