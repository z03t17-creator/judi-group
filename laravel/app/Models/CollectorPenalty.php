<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'collector_id',
    'amount',
    'penalized_at',
    'reason',
    'note',
    'created_by_id',
])]
class CollectorPenalty extends Model
{
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'penalized_at' => 'date',
        ];
    }

    public function collector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'collector_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }
}
