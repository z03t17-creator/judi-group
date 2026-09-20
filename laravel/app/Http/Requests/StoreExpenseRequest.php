<?php

namespace App\Http\Requests;

use App\Enums\ExpenseCategory;
use App\Enums\PagePermission;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreExpenseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->canAccess(PagePermission::Expenses);
    }

    public function rules(): array
    {
        return [
            'category' => ['required', Rule::enum(ExpenseCategory::class)],
            'amount' => ['required', 'numeric', 'min:1', 'max:999999999'],
            'note' => ['nullable', 'string', 'max:500'],
            'spent_at' => ['required', 'date'],
            'receipt' => ['nullable', 'image', 'max:4096'],
        ];
    }

    public function messages(): array
    {
        return [
            'amount.required' => __('ui.expense_amount_required'),
            'category.required' => __('ui.expense_category_required'),
            'spent_at.required' => __('ui.invoice_date'),
        ];
    }
}
