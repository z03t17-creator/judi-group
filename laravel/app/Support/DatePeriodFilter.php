<?php

namespace App\Support;

use Carbon\Carbon;
use Illuminate\Http\Request;

final class DatePeriodFilter
{
    /**
     * @return array{0: ?Carbon, 1: ?Carbon, 2: string}
     */
    public static function resolve(Request $request, string $default = 'month'): array
    {
        $period = $request->string('period')->toString();
        $allowed = ['all', 'today', '7d', 'month', 'last_month', 'custom'];

        if (! in_array($period, $allowed, true)) {
            $period = ($request->filled('from') || $request->filled('to')) ? 'custom' : $default;
        }

        if ($period === 'all') {
            return [null, null, 'all'];
        }

        $today = now()->startOfDay();

        [$from, $to] = match ($period) {
            'today' => [$today->copy(), $today->copy()],
            '7d' => [$today->copy()->subDays(6), $today->copy()],
            'last_month' => [
                $today->copy()->subMonthNoOverflow()->startOfMonth(),
                $today->copy()->subMonthNoOverflow()->endOfMonth()->startOfDay(),
            ],
            'custom' => [
                self::parseDate($request->input('from'), $today->copy()->startOfMonth()),
                self::parseDate($request->input('to'), $today->copy()),
            ],
            default => [$today->copy()->startOfMonth(), $today->copy()],
        };

        if ($to->lt($from)) {
            [$from, $to] = [$to, $from];
        }

        return [$from, $to, $period];
    }

    /**
     * Apply whereBetween on a datetime column, or whereDate range on a date column.
     *
     * @param  \Illuminate\Database\Eloquent\Builder<\Illuminate\Database\Eloquent\Model>  $query
     * @return \Illuminate\Database\Eloquent\Builder<\Illuminate\Database\Eloquent\Model>
     */
    public static function apply($query, ?Carbon $from, ?Carbon $to, string $column, bool $dateOnly = false)
    {
        if ($from === null || $to === null) {
            return $query;
        }

        if ($dateOnly) {
            return $query
                ->whereDate($column, '>=', $from->toDateString())
                ->whereDate($column, '<=', $to->toDateString());
        }

        return $query->whereBetween($column, [
            $from->copy()->startOfDay(),
            $to->copy()->endOfDay(),
        ]);
    }

    private static function parseDate(?string $value, Carbon $fallback): Carbon
    {
        if (! $value) {
            return $fallback->copy();
        }

        try {
            return Carbon::parse($value)->startOfDay();
        } catch (\Throwable) {
            return $fallback->copy();
        }
    }
}
