<?php

namespace App\Http\Requests;

use App\Enums\PagePermission;
use App\Models\Collection;
use App\Models\Store;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCollectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->canAccess(PagePermission::Collections);
    }

    public function rules(): array
    {
        return [
            'store_id' => [
                'required',
                'integer',
                Rule::exists('stores', 'id')->where(fn ($q) => $q->where('is_active', true)),
            ],
            'amount' => ['required', 'numeric', 'min:1', 'max:999999999'],
            'collected_at' => ['required', 'date'],
            'note' => ['nullable', 'string', 'max:500'],
            'receipt' => ['nullable', 'image', 'max:4096'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $storeId = (int) $this->input('store_id');
            $amount = round((float) $this->input('amount'), 2);
            if ($storeId < 1 || $amount < 1) {
                return;
            }

            $store = Store::query()->find($storeId);
            if (! $store) {
                return;
            }

            $available = Collection::availableDebtForStore($store);
            if ($available <= 0) {
                $validator->errors()->add('store_id', __('ui.collection_no_debt'));

                return;
            }

            if ($amount > $available + 0.0001) {
                $validator->errors()->add(
                    'amount',
                    __('ui.collection_amount_exceeds', ['debt' => number_format($available, 0)]),
                );
            }
        });
    }

    public function messages(): array
    {
        return [
            'store_id.required' => __('ui.collection_store_required'),
            'amount.required' => __('ui.collection_amount_required'),
            'collected_at.required' => __('ui.invoice_date'),
        ];
    }
}
