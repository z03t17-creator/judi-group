<?php

namespace App\Models;

use App\Enums\ExpenseCategory;
use App\Support\ProfileImage;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'collector_id',
    'category',
    'amount',
    'note',
    'spent_at',
    'receipt_path',
])]
class Expense extends Model
{
    protected function casts(): array
    {
        return [
            'category' => ExpenseCategory::class,
            'amount' => 'decimal:2',
            'spent_at' => 'date',
        ];
    }

    public function collector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'collector_id');
    }

    public function receiptUrl(): ?string
    {
        if (! $this->receipt_path) {
            return null;
        }

        return ProfileImage::url($this->receipt_path);
    }
}
