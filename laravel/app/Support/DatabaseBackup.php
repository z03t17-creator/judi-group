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

    /**
     * Import a Judy's Shelter SQL dump. Only DELETE/INSERT (and safe SET) for known tables.
     *
     * @return array{statements: int, tables: list<string>}
     */
    public static function import(string $sql): array
    {
        @set_time_limit(0);

        $driver = DB::getDriverName();
        $allowedTables = array_fill_keys(self::tableNames(), true);
        $touched = [];
        $ran = 0;

        $statements = self::splitStatements($sql);
        if ($statements === []) {
            throw new \InvalidArgumentException(__('ui.backup_import_empty'));
        }

        DB::connection()->disableQueryLog();

        if ($driver === 'mysql') {
            DB::statement('SET FOREIGN_KEY_CHECKS=0');
        } elseif ($driver === 'pgsql') {
            DB::statement('SET session_replication_role = replica');
        }

        try {
            DB::transaction(function () use ($statements, $allowedTables, &$touched, &$ran) {
                foreach ($statements as $statement) {
                    $table = self::allowedImportStatement($statement, $allowedTables);
                    if ($table === false) {
                        continue;
                    }
                    if ($table !== null) {
                        $touched[$table] = true;
                    }
                    DB::unprepared(self::normalizeStatementForDriver($statement, $driver));
                    $ran++;
                }
            });
        } finally {
            if ($driver === 'mysql') {
                DB::statement('SET FOREIGN_KEY_CHECKS=1');
            } elseif ($driver === 'pgsql') {
                DB::statement('SET session_replication_role = DEFAULT');
            }
        }

        if ($ran < 1) {
            throw new \InvalidArgumentException(__('ui.backup_import_invalid'));
        }

        return [
            'statements' => $ran,
            'tables' => array_keys($touched),
        ];
    }

    /**
     * @param  array<string, bool>  $allowedTables
     * @return string|null|false  table name, null for SET, false to skip/reject unsafe
     */
    private static function allowedImportStatement(string $statement, array $allowedTables): string|null|false
    {
        $normalized = ltrim($statement);
        if ($normalized === '') {
            return false;
        }

        if (preg_match('/^SET\s+FOREIGN_KEY_CHECKS\s*=\s*[01]\s*$/i', $normalized)) {
            return null;
        }
        if (preg_match('/^SET\s+session_replication_role\s*=\s*(replica|DEFAULT)\s*$/i', $normalized)) {
            return null;
        }

        if (preg_match('/^DELETE\s+FROM\s+[`"\[]?([a-zA-Z0-9_]+)[`"\]]?\s*$/i', $normalized, $m)) {
            $table = $m[1];
            if (! isset($allowedTables[$table])) {
                return false;
            }

            return $table;
        }

        if (preg_match('/^INSERT\s+INTO\s+[`"\[]?([a-zA-Z0-9_]+)[`"\]]?\s*\(/i', $normalized, $m)) {
            $table = $m[1];
            if (! isset($allowedTables[$table])) {
                return false;
            }

            return $table;
        }

        return false;
    }

    private static function normalizeStatementForDriver(string $statement, string $driver): string
    {
        if ($driver === 'sqlite') {
            // Our dumps use MySQL backticks; SQLite prefers double quotes.
            return str_replace('`', '"', $statement);
        }

        return $statement;
    }

    /**
     * @return list<string>
     */
    private static function splitStatements(string $sql): array
    {
        $sql = str_replace(["\r\n", "\r"], "\n", $sql);
        $statements = [];
        $buffer = '';
        $inSingle = false;
        $inDouble = false;
        $inBacktick = false;
        $len = strlen($sql);

        for ($i = 0; $i < $len; $i++) {
            $ch = $sql[$i];
            $next = $i + 1 < $len ? $sql[$i + 1] : '';

            // Skip full-line comments when not inside a string.
            if (! $inSingle && ! $inDouble && ! $inBacktick && $ch === '-' && $next === '-') {
                while ($i < $len && $sql[$i] !== "\n") {
                    $i++;
                }
                continue;
            }

            if (! $inDouble && ! $inBacktick && $ch === "'" && ! $inSingle) {
                $inSingle = true;
                $buffer .= $ch;
                continue;
            }
            if ($inSingle) {
                $buffer .= $ch;
                if ($ch === "'" && $next === "'") {
                    $buffer .= $next;
                    $i++;
                } elseif ($ch === "'") {
                    $inSingle = false;
                }
                continue;
            }

            if (! $inSingle && ! $inBacktick && $ch === '"' && ! $inDouble) {
                $inDouble = true;
                $buffer .= $ch;
                continue;
            }
            if ($inDouble) {
                $buffer .= $ch;
                if ($ch === '"') {
                    $inDouble = false;
                }
                continue;
            }

            if (! $inSingle && ! $inDouble && $ch === '`' && ! $inBacktick) {
                $inBacktick = true;
                $buffer .= $ch;
                continue;
            }
            if ($inBacktick) {
                $buffer .= $ch;
                if ($ch === '`') {
                    $inBacktick = false;
                }
                continue;
            }

            if ($ch === ';') {
                $statement = trim($buffer);
                if ($statement !== '') {
                    $statements[] = $statement;
                }
                $buffer = '';
                continue;
            }

            $buffer .= $ch;
        }

        $tail = trim($buffer);
        if ($tail !== '') {
            $statements[] = $tail;
        }

        return $statements;
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
