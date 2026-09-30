<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return (bool) $user?->canAccess(\App\Enums\PagePermission::InvoicesSell);
    }

    public function rules(): array
    {
        $maxDiscount = (float) ($this->user()?->max_discount_percent ?? 0);

        return [
            'store_id' => ['required', 'integer', 'exists:stores,id'],
            'discount_percent' => ['nullable', 'numeric', 'min:0', 'max:'.$maxDiscount],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_unit_id' => ['required', 'integer', 'exists:product_units,id'],
            'lines.*.quantity' => ['nullable', 'numeric', 'min:0', 'max:999999'],
            'lines.*.gift_quantity' => ['nullable', 'numeric', 'min:0', 'max:999999'],
            'lines.*.discount_percent' => ['nullable', 'numeric', 'min:0', 'max:'.$maxDiscount],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $soldUnits = 0.0;
            $giftUnits = 0.0;

            foreach ($this->input('lines', []) as $index => $line) {
                $qty = (float) ($line['quantity'] ?? 0);
                $gift = (float) ($line['gift_quantity'] ?? 0);
                if ($qty <= 0 && $gift <= 0) {
                    $validator->errors()->add("lines.$index.quantity", 'ژمارە یان دیاری پێویستە.');
                }
                $soldUnits += max(0, $qty);
                $giftUnits += max(0, $gift);
            }

            if ($giftUnits <= 0) {
                return;
            }

            $maxGift = (float) ($this->user()?->max_gift_percent ?? 0);
            $allowedGift = $soldUnits > 0
                ? round($soldUnits * ($maxGift / 100), 2)
                : ($maxGift >= 100 ? $giftUnits : 0.0);

            if ($giftUnits > $allowedGift + 0.0001) {
                $validator->errors()->add(
                    'lines',
                    __('ui.invoice_gift_over_limit', ['max' => $this->formatPercent($maxGift)]),
                );
            }
        });
    }

    public function messages(): array
    {
        $maxDiscount = $this->formatPercent((float) ($this->user()?->max_discount_percent ?? 0));

        return [
            'store_id.required' => __('ui.invoice_pick_store'),
            'store_id.exists' => __('ui.invoice_pick_store'),
            'discount_percent.max' => __('ui.invoice_discount_over_limit', ['max' => $maxDiscount]),
            'lines.*.discount_percent.max' => __('ui.invoice_line_discount_over_limit', ['max' => $maxDiscount]),
            'lines.required' => __('ui.invoice_cart_empty'),
            'lines.min' => __('ui.invoice_cart_empty'),
        ];
    }

    protected function failedValidation(\Illuminate\Contracts\Validation\Validator $validator): void
    {
        $visit = \App\Models\StoreVisit::openForCollector($this->user());
        $params = $visit ? ['visit' => $visit->id] : [];

        throw (new \Illuminate\Validation\ValidationException($validator))
            ->errorBag('default')
            ->redirectTo(route('invoices.create', $params));
    }

    private function formatPercent(float $value): string
    {
        return rtrim(rtrim(number_format($value, 2, '.', ''), '0'), '.') ?: '0';
    }
}
