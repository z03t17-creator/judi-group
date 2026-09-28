<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCollectorSalaryRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return (bool) ($user?->isAdmin() || $user?->isAccountant());
    }

    public function rules(): array
    {
        return [
            'amount' => ['required', 'numeric', 'min:1', 'max:999999999'],
            'paid_at' => ['required', 'date'],
            'note' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'amount.required' => __('ui.salary_amount_required'),
            'paid_at.required' => __('ui.invoice_date'),
        ];
    }
}
