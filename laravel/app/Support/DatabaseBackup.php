<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class DatabaseBackup
{
    public static function toSql(): string
    {
        $driver = DB::getDriverName();
        $database = DB::getDatabaseName();
        $lines = [
            '-- JUDI backup',
            '-- Generated: '.now()->toDateTimeString(),
            '-- Database: '.$database,
            '-- Driver: '.$driver,
            'SET FOREIGN_KEY_CHECKS=0;',
            '',
        ];

        $tables = Schema::getTableListing(null, false);
        sort($tables);

        foreach ($tables as $table) {
            if (in_array($table, ['migrations', 'cache', 'cache_locks', 'jobs', 'job_batches', 'failed_jobs', 'sessions'], true)) {
                // Keep schema data useful; skip volatile session/cache/queue tables.
                if (in_array($table, ['cache', 'cache_locks', 'jobs', 'job_batches', 'failed_jobs', 'sessions'], true)) {
                    continue;
                }
            }

            $rows = DB::table($table)->get();
            $lines[] = '-- Table: '.$table;
            $lines[] = 'DELETE FROM `'.$table.'`;';

            foreach ($rows as $row) {
                $values = [];
                foreach ((array) $row as $value) {
                    if ($value === null) {
                        $values[] = 'NULL';
                    } elseif (is_int($value) || is_float($value)) {
                        $values[] = (string) $value;
                    } else {
                        $values[] = "'".str_replace(["\\", "'"], ["\\\\", "''"], (string) $value)."'";
                    }
                }
                $cols = array_map(fn ($c) => '`'.$c.'`', array_keys((array) $row));
                $lines[] = 'INSERT INTO `'.$table.'` ('.implode(', ', $cols).') VALUES ('.implode(', ', $values).');';
            }

            $lines[] = '';
        }

        $lines[] = 'SET FOREIGN_KEY_CHECKS=1;';

        return implode("\n", $lines)."\n";
    }
}
