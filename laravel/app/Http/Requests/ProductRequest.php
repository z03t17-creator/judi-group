<?php

namespace App\Http\Requests;

use App\Enums\ProductUnitKind;
use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user && $user->canAccess(\App\Enums\PagePermission::ProductsManage);
    }

    public function rules(): array
    {
        /** @var Product|null $product */
        $product = $this->route('product');
        $productId = $product?->id;

        $rules = [
            'sku' => [
                'required',
                'string',
                'max:64',
                Rule::unique('products', 'sku')->ignore($productId),
            ],
            'barcode' => [
                'nullable',
                'string',
                'max:32',
                Rule::unique('products', 'barcode')->ignore($productId),
            ],
            'name' => ['required', 'string', 'max:255'],
            'pack_spec' => ['nullable', 'string', 'max:64'],
            'pieces_per_packet' => ['required', 'integer', 'min:1', 'max:99999'],
            'pieces_per_carton' => ['required', 'integer', 'min:1', 'max:999999'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'subcategory_id' => [
                'nullable',
                'integer',
                Rule::exists('subcategories', 'id')->where(
                    fn ($q) => $q->where('category_id', $this->input('category_id')),
                ),
            ],
            'image' => ['nullable', 'image', 'max:4096'],
            'is_active' => ['sometimes', 'boolean'],
        ];

        $unitIds = [];
        if ($product) {
            foreach ($product->units()->get(['id', 'unit']) as $unit) {
                $key = $unit->unit instanceof \BackedEnum ? $unit->unit->value : (string) $unit->unit;
                $unitIds[$key] = $unit->id;
            }
        }

        foreach (ProductUnitKind::ordered() as $kind) {
            $unitId = $unitIds[$kind->value] ?? null;

            $rules["prices.{$kind->value}.wholesale"] = ['required', 'numeric', 'min:0', 'max:999999999'];
            $rules["prices.{$kind->value}.retail"] = ['required', 'numeric', 'min:0', 'max:999999999'];
            $rules["prices.{$kind->value}.barcode"] = [
                'nullable',
                'string',
                'max:32',
                Rule::unique('product_units', 'barcode')->ignore($unitId),
            ];
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'sku.required' => 'کۆدی کاڵا پێویستە.',
            'sku.unique' => 'ئەم کۆدە پێشتر بەکارهاتووە.',
            'barcode.unique' => 'ئەم بارکۆدە پێشتر بەکارهاتووە.',
            'name.required' => 'ناوی کاڵا پێویستە.',
            'pieces_per_packet.required' => 'ژمارەی دانە لە پاکەت پێویستە.',
            'pieces_per_carton.required' => 'ژمارەی دانە لە کارتۆن پێویستە.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $prices = $this->input('prices', []);
        if (is_array($prices)) {
            foreach ($prices as $key => $row) {
                if (! is_array($row)) {
                    continue;
                }
                $prices[$key]['barcode'] = isset($row['barcode']) && trim((string) $row['barcode']) !== ''
                    ? trim((string) $row['barcode'])
                    : null;
                if (isset($row['wholesale'])) {
                    $prices[$key]['wholesale'] = str_replace(',', '', (string) $row['wholesale']);
                }
                if (isset($row['retail'])) {
                    $prices[$key]['retail'] = str_replace(',', '', (string) $row['retail']);
                }
            }
        }

        $this->merge([
            'is_active' => $this->boolean('is_active'),
            'pack_spec' => $this->filled('pack_spec') ? trim((string) $this->input('pack_spec')) : null,
            'barcode' => $this->filled('barcode') ? trim((string) $this->input('barcode')) : null,
            'prices' => $prices,
        ]);
    }

    /** @return array{sku: string, barcode: ?string, name: string, pack_spec: ?string, pieces_per_packet: int, pieces_per_carton: int, is_active: bool, prices: array<string, array{wholesale: float, retail: float, barcode: ?string}>} */
    public function productData(): array
    {
        $validated = $this->validated();
        $prices = [];

        foreach (ProductUnitKind::ordered() as $kind) {
            $prices[$kind->value] = [
                'wholesale' => $validated['prices'][$kind->value]['wholesale'],
                'retail' => $validated['prices'][$kind->value]['retail'],
                'barcode' => $validated['prices'][$kind->value]['barcode'] ?? null,
            ];
        }

        return [
            'sku' => $validated['sku'],
            'barcode' => $validated['barcode'] ?? null,
            'name' => $validated['name'],
            'pack_spec' => $validated['pack_spec'] ?? null,
            'pieces_per_packet' => (int) $validated['pieces_per_packet'],
            'pieces_per_carton' => (int) $validated['pieces_per_carton'],
            'category_id' => (int) $validated['category_id'],
            'subcategory_id' => isset($validated['subcategory_id']) ? (int) $validated['subcategory_id'] : null,
            'is_active' => (bool) ($validated['is_active'] ?? true),
            'prices' => $prices,
        ];
    }
}
