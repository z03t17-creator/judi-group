<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class AppSetting extends Model
{
    public $incrementing = false;

    protected $primaryKey = 'key';

    protected $keyType = 'string';

    protected $fillable = ['key', 'value'];

    public const ENFORCE_DEBT_LIMITS = 'enforce_debt_limits';

    public static function get(string $key, ?string $default = null): ?string
    {
        $cached = Cache::remember('app_setting:'.$key, 60, function () use ($key) {
            return static::query()->where('key', $key)->value('value');
        });

        if ($cached === null) {
            return $default;
        }

        return (string) $cached;
    }

    public static function set(string $key, string|bool|int|null $value): void
    {
        if (is_bool($value)) {
            $value = $value ? '1' : '0';
        }

        static::query()->updateOrCreate(
            ['key' => $key],
            ['value' => $value === null ? null : (string) $value],
        );

        Cache::forget('app_setting:'.$key);
    }

    public static function bool(string $key, bool $default = false): bool
    {
        $raw = static::get($key);

        if ($raw === null) {
            return $default;
        }

        return in_array(strtolower(trim($raw)), ['1', 'true', 'yes', 'on'], true);
    }

    public static function debtLimitsEnabled(): bool
    {
        return static::bool(self::ENFORCE_DEBT_LIMITS, false);
    }
}
