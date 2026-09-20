<?php

namespace App\Enums;

enum ProductUnitKind: string
{
    case Piece = 'piece';
    case Packet = 'packet';
    case Carton = 'carton';

    public function label(): string
    {
        return match ($this) {
            self::Piece => __('ui.piece'),
            self::Packet => __('ui.packet'),
            self::Carton => __('ui.carton'),
        };
    }

    public function labelEn(): string
    {
        return match ($this) {
            self::Piece => 'Piece',
            self::Packet => 'Packet',
            self::Carton => 'Carton',
        };
    }

    /** @return list<self> */
    public static function ordered(): array
    {
        return [self::Piece, self::Packet, self::Carton];
    }
}
