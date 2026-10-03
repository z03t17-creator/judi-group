<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class DatabaseBackup
{
    public static function assertReady(): void
    {
        self::tableNames();
    }

    /**
     * Stream a SQL dump to the output buffer (avoids OOM on Render free plan).
     */
    public static function stream(): void
    {
        @set_time_limit(0);

        $driver = DB::getDriverName();
        $database = (string) DB::getDatabaseName();

        echo "-- Judy's Shelter backup\n";
        echo '-- Generated: '.now()->toDateTimeString()."\n";
        echo '-- Database: '.$database."\n";
        echo '-- Driver: '.$driver."\n";

        if ($driver === 'mysql') {
            echo "SET FOREIGN_KEY_CHECKS=0;\n\n";
        } elseif ($driver === 'pgsql') {
            echo "SET session_replication_role = replica;\n\n";
        } else {
            echo "\n";
        }

        foreach (self::tableNames() as $table) {
            if (in_array($table, ['cache', 'cache_locks', 'jobs', 'job_batches', 'failed_jobs', 'sessions'], true)) {
                continue;
            }

            echo '-- Table: '.$table."\n";
            echo 'DELETE FROM '.self::quoteIdent($table, $driver).";\n";

            $query = DB::table($table);
            $hasId = Schema::hasColumn($table, 'id');

            if ($hasId) {
                $query->orderBy('id')->chunkById(200, function ($rows) use ($table, $driver) {
                    self::writeRows($table, $driver, $rows);
                });
            } else {
                foreach ($query->cursor() as $row) {
                    self::writeRows($table, $driver, [$row]);
                }
            }

            echo "\n";
            if (function_exists('flush')) {
                flush();
            }
        }

        if ($driver === 'mysql') {
            echo "SET FOREIGN_KEY_CHECKS=1;\n";
        } elseif ($driver === 'pgsql') {
            echo "SET session_replication_role = DEFAULT;\n";
        }
    }

    public static function toSql(): string
    {
        ob_start();
        self::stream();

        return (string) ob_get_clean();
    }

    /**
     * @param  iterable<object>  $rows
     */
    private static function writeRows(string $table, string $driver, iterable $rows): void
    {
        foreach ($rows as $row) {
            $data = (array) $row;
            $cols = array_map(fn ($c) => self::quoteIdent((string) $c, $driver), array_keys($data));
            $values = [];
            foreach ($data as $value) {
                $values[] = self::quoteValue($value, $driver);
            }
            echo 'INSERT INTO '.self::quoteIdent($table, $driver)
                .' ('.implode(', ', $cols).') VALUES ('.implode(', ', $values).");\n";
        }
    }

    /**
     * @return list<string>
     */
    private static function tableNames(): array
    {
        try {
            $schema = Schema::getCurrentSchemaName();
            $tables = Schema::getTableListing($schema ?: null, false);
        } catch (\Throwable) {
            $tables = array_column(Schema::getTables(), 'name');
        }

        $tables = array_values(array_unique(array_map('strval', $tables)));
        sort($tables);

        return $tables;
    }

    private static function quoteIdent(string $name, string $driver): string
    {
        if ($driver === 'pgsql') {
            return '"'.str_replace('"', '""', $name).'"';
        }

        return '`'.str_replace('`', '``', $name).'`';
    }

    private static function quoteValue(mixed $value, string $driver): string
    {
        if ($value === null) {
            return 'NULL';
        }

        if (is_bool($value)) {
            if ($driver === 'pgsql') {
                return $value ? 'TRUE' : 'FALSE';
            }

            return $value ? '1' : '0';
        }

        if (is_int($value) || is_float($value)) {
            return (string) $value;
        }

        if ($value instanceof \DateTimeInterface) {
            $value = $value->format('Y-m-d H:i:s');
        }

        $string = (string) $value;

        return "'".str_replace(["\\", "'"], ["\\\\", "''"], $string)."'";
    }
}
