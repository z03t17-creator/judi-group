<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCollectorPenaltyRequest extends FormRequest
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
            'penalized_at' => ['required', 'date'],
            'reason' => ['required', 'string', 'max:255'],
            'note' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'amount.required' => __('ui.penalty_amount_required'),
            'reason.required' => __('ui.penalty_reason_required'),
            'penalized_at.required' => __('ui.invoice_date'),
        ];
    }
}
