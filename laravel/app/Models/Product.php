<?php

namespace App\Models;

use App\Enums\CollectorChannel;
use App\Enums\ProductUnitKind;
use App\Support\ProfileImage;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

#[Fillable([
    'category_id',
    'subcategory_id',
    'sku',
    'barcode',
    'name',
    'pack_spec',
    'pieces_per_packet',
    'pieces_per_carton',
    'is_active',
    'image_path',
])]
class Product extends Model
{
    protected function casts(): array
    {
        return [
            'pieces_per_packet' => 'integer',
            'pieces_per_carton' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function units(): HasMany
    {
        return $this->hasMany(ProductUnit::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function subcategory(): BelongsTo
    {
        return $this->belongsTo(Subcategory::class);
    }

    public function displayName(): string
    {
        return $this->pack_spec
            ? trim($this->name.' '.$this->pack_spec)
            : $this->name;
    }

    public function imageUrl(): string
    {
        return ProfileImage::url($this->image_path, 'images/placeholders/product.svg');
    }

    public function unit(ProductUnitKind $kind): ?ProductUnit
    {
        if ($this->relationLoaded('units')) {
            return $this->units->first(
                fn (ProductUnit $unit) => $unit->unit === $kind,
            );
        }

        return $this->units()->where('unit', $kind->value)->first();
    }

    public function priceFor(ProductUnitKind $kind, CollectorChannel $channel): string
    {
        $unit = $this->unit($kind);

        if (! $unit) {
            return '0.00';
        }

        return $channel === CollectorChannel::Wholesale
            ? (string) $unit->price_wholesale
            : (string) $unit->price_retail;
    }

    /**
     * Break base pieces into carton / packet / loose piece for stock display.
     *
     * @return array{pieces: int, carton: int, packet: int, piece: int, label: string}
     */
    public function breakdownPieces(int $pieces): array
    {
        $pieces = max(0, $pieces);
        $perCarton = max(1, (int) $this->pieces_per_carton);
        $perPacket = max(1, (int) $this->pieces_per_packet);

        $cartons = intdiv($pieces, $perCarton);
        $remainder = $pieces % $perCarton;
        $packets = intdiv($remainder, $perPacket);
        $loose = $remainder % $perPacket;

        $parts = [];
        if ($cartons > 0) {
            $parts[] = $cartons.' '.ProductUnitKind::Carton->label();
        }
        if ($packets > 0) {
            $parts[] = $packets.' '.ProductUnitKind::Packet->label();
        }
        if ($loose > 0 || $parts === []) {
            $parts[] = $loose.' '.ProductUnitKind::Piece->label();
        }

        return [
            'pieces' => $pieces,
            'carton' => $cartons,
            'packet' => $packets,
            'piece' => $loose,
            'label' => implode(' + ', $parts),
        ];
    }

    public function stockInventories(): HasMany
    {
        return $this->hasMany(StockInventory::class);
    }

    /**
     * @param  array{
     *   category_id?: ?int,
     *   subcategory_id?: ?int,
     *   sku: string,
     *   barcode?: ?string,
     *   name: string,
     *   pack_spec?: ?string,
     *   pieces_per_packet: int,
     *   pieces_per_carton: int,
     *   is_active?: bool,
     *   image_path?: ?string,
     *   prices: array<string, array{wholesale: float|int|string, retail: float|int|string, barcode?: ?string}>
     * }  $data
     */
    public static function createWithUnits(array $data): self
    {
        return DB::transaction(function () use ($data) {
            $product = static::query()->create([
                'category_id' => $data['category_id'] ?? null,
                'subcategory_id' => $data['subcategory_id'] ?? null,
                'sku' => $data['sku'],
                'barcode' => $data['barcode'] ?? null,
                'name' => $data['name'],
                'pack_spec' => $data['pack_spec'] ?? null,
                'pieces_per_packet' => $data['pieces_per_packet'],
                'pieces_per_carton' => $data['pieces_per_carton'],
                'is_active' => $data['is_active'] ?? true,
                'image_path' => $data['image_path'] ?? null,
            ]);

            $product->syncUnits($data['prices']);

            return $product->load('units');
        });
    }

    /**
     * @param  array{
     *   category_id?: ?int,
     *   subcategory_id?: ?int,
     *   sku: string,
     *   barcode?: ?string,
     *   name: string,
     *   pack_spec?: ?string,
     *   pieces_per_packet: int,
     *   pieces_per_carton: int,
     *   is_active?: bool,
     *   image_path?: ?string,
     *   prices: array<string, array{wholesale: float|int|string, retail: float|int|string, barcode?: ?string}>
     * }  $data
     */
    public function updateWithUnits(array $data): self
    {
        return DB::transaction(function () use ($data) {
            $payload = [
                'category_id' => $data['category_id'] ?? null,
                'subcategory_id' => $data['subcategory_id'] ?? null,
                'sku' => $data['sku'],
                'barcode' => $data['barcode'] ?? null,
                'name' => $data['name'],
                'pack_spec' => $data['pack_spec'] ?? null,
                'pieces_per_packet' => $data['pieces_per_packet'],
                'pieces_per_carton' => $data['pieces_per_carton'],
                'is_active' => $data['is_active'] ?? $this->is_active,
            ];

            if (array_key_exists('image_path', $data)) {
                $payload['image_path'] = $data['image_path'];
            }

            $this->update($payload);
            $this->syncUnits($data['prices']);

            return $this->load('units');
        });
    }

    /**
     * @param  array<string, array{wholesale: float|int|string, retail: float|int|string, barcode?: ?string}>  $prices
     */
    public function syncUnits(array $prices): void
    {
        $conversions = [
            ProductUnitKind::Piece->value => 1,
            ProductUnitKind::Packet->value => max(1, (int) $this->pieces_per_packet),
            ProductUnitKind::Carton->value => max(1, (int) $this->pieces_per_carton),
        ];

        foreach (ProductUnitKind::ordered() as $kind) {
            $row = $prices[$kind->value] ?? ['wholesale' => 0, 'retail' => 0];
            $barcode = isset($row['barcode']) && $row['barcode'] !== ''
                ? (string) $row['barcode']
                : null;

            $this->units()->updateOrCreate(
                ['unit' => $kind->value],
                [
                    'barcode' => $barcode,
                    'conversion_to_piece' => $conversions[$kind->value],
                    'price_wholesale' => $row['wholesale'] ?? 0,
                    'price_retail' => $row['retail'] ?? 0,
                ],
            );
        }
    }
}
