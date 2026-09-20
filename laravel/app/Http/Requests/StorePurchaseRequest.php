<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePurchaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user && $user->canAccess(\App\Enums\PagePermission::Purchases);
    }

    public function rules(): array
    {
        return [
            'supplier_id' => ['nullable', 'integer', 'exists:suppliers,id'],
            'supplier_name' => ['nullable', 'string', 'max:255'],
            'purchased_at' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_unit_id' => ['required', 'integer', 'exists:product_units,id'],
            'lines.*.quantity' => ['required', 'numeric', 'min:0.01', 'max:999999'],
            'lines.*.unit_cost' => ['required', 'numeric', 'min:0', 'max:999999999'],
        ];
    }

    public function messages(): array
    {
        return [
            'purchased_at.required' => 'ڕێکەوت پێویستە.',
            'lines.required' => 'لانیکەم یەک هێڵ پێویستە.',
            'lines.min' => 'لانیکەم یەک هێڵ پێویستە.',
            'lines.*.product_unit_id.required' => 'یەکەی کاڵا پێویستە.',
            'lines.*.quantity.required' => 'ژمارە پێویستە.',
            'lines.*.unit_cost.required' => 'نرخی کڕین پێویستە.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $lines = $this->input('lines', []);
        if (is_array($lines)) {
            $cleaned = [];
            foreach ($lines as $line) {
                if (! is_array($line)) {
                    continue;
                }
                $cleaned[] = [
                    'product_unit_id' => $line['product_unit_id'] ?? null,
                    'quantity' => str_replace(',', '', (string) ($line['quantity'] ?? '')),
                    'unit_cost' => str_replace(',', '', (string) ($line['unit_cost'] ?? '')),
                ];
            }
            $this->merge(['lines' => $cleaned]);
        }

        if ($this->input('supplier_id') === '' || $this->input('supplier_id') === '0') {
            $this->merge(['supplier_id' => null]);
        }

        if ($this->filled('supplier_name')) {
            $this->merge(['supplier_name' => trim((string) $this->input('supplier_name'))]);
        } else {
            $this->merge(['supplier_name' => null]);
        }

        if ($this->filled('notes')) {
            $this->merge(['notes' => trim((string) $this->input('notes'))]);
        } else {
            $this->merge(['notes' => null]);
        }
    }
}
