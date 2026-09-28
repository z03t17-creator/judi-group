<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreRejectRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return (bool) ($user?->canAccess(\App\Enums\PagePermission::InvoicesSell)
            || $user?->canAccess(\App\Enums\PagePermission::Collections));
    }

    public function rules(): array
    {
        return [
            'note' => ['nullable', 'string', 'max:500'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_unit_id' => ['required', 'integer', 'exists:product_units,id'],
            'lines.*.quantity' => ['required', 'numeric', 'min:0.01', 'max:999999'],
        ];
    }

    public function messages(): array
    {
        return [
            'lines.required' => __('ui.reject_pick_items'),
            'lines.min' => __('ui.reject_pick_items'),
            'lines.*.quantity.required' => __('ui.reject_qty_required'),
            'lines.*.quantity.min' => __('ui.reject_qty_required'),
        ];
    }
}
