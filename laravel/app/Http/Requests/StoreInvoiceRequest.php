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
                    'دیاری لە سنووری مەندوب زیاترە (زۆرترین '.$this->formatPercent($maxGift).'%ی فرۆشتن).',
                );
            }
        });
    }

    public function messages(): array
    {
        return [
            'store_id.required' => 'فرۆشگا هەڵبژێرە.',
            'store_id.exists' => 'فرۆشگا نەدۆزرایەوە.',
            'discount_percent.max' => 'داشکاندن لە سنووری مەندوب زیاترە.',
            'lines.*.discount_percent.max' => 'داشکاندنی هێڵ لە سنووری مەندوب زیاترە.',
            'lines.required' => 'لانیکەم یەک کاڵا زیاد بکە.',
            'lines.min' => 'لانیکەم یەک کاڵا زیاد بکە.',
        ];
    }

    private function formatPercent(float $value): string
    {
        return rtrim(rtrim(number_format($value, 2, '.', ''), '0'), '.') ?: '0';
    }
}
