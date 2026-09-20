@echo off
setlocal EnableExtensions
title JUDI - quick start
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Unblock-File -LiteralPath '%~f0'" >nul 2>&1

echo.
echo  ========================================
echo   JUDI Laravel - starting...
echo  ========================================
echo.

call :find_php
if not defined PHP (
  echo  [ERROR] PHP 8.4+ was not found.
  echo  This app needs PHP 8.4.1 or newer (XAMPP 8.2 is too old).
  echo  Put php.exe on PATH, or keep it at one of:
  echo    %%USERPROFILE%%\OneDrive\Desktop\koga.orginal\php.exe
  echo    C:\php\php.exe
  pause
  exit /b 1
)
for %%I in ("%PHP%") do set "PHP_DIR=%%~dpI"
set "PATH=%PHP_DIR%;%PATH%"
call :enable_pdo
if errorlevel 1 (
  pause
  exit /b 1
)
echo  Using PHP: %PHP%
"%PHP%" -v
echo.

if not exist "vendor\autoload.php" (
  echo  Installing Composer packages...
  where composer >nul 2>&1
  if errorlevel 1 (
    echo  [ERROR] Composer not found in PATH.
    pause
    exit /b 1
  )
  composer install
  if errorlevel 1 (
    echo  [ERROR] composer install failed.
    pause
    exit /b 1
  )
)

if not exist ".env" (
  copy ".env.example" ".env" >nul
  "%PHP%" artisan key:generate
)

call :ensure_mysql
if errorlevel 1 (
  pause
  exit /b 1
)

echo  Migrating database (safe / idempotent)...
"%PHP%" artisan migrate --force
if errorlevel 1 (
  echo.
  echo  [ERROR] Migration failed. Is MySQL running?
  echo  DB: judi @ 127.0.0.1  user: root
  echo  Create DB if needed:  CREATE DATABASE judi;
  pause
  exit /b 1
)

echo.
echo  Open:  http://127.0.0.1:8000
echo.
echo  Logins  (password: JudiAdmin!26)
echo    admin@judi.local       Admin
echo    accountant@judi.local  Accountant  - send goods
echo    wholesale@judi.local   Collector
echo.
echo  Press Ctrl+C to stop the server.
echo.

start "" "http://127.0.0.1:8000/login"

netstat -ano | findstr ":8000" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo  Server already running on port 8000.
  pause
  exit /b 0
)

"%PHP%" artisan serve --host=127.0.0.1 --port=8000
goto :eof

:php_ok
"%PHP_TRY%" -r "exit(version_compare(PHP_VERSION,'8.4.1','>=')?0:1);" >nul 2>&1
if errorlevel 1 exit /b 1
set "PHP=%PHP_TRY%"
exit /b 0

:try_php
if defined PHP exit /b 0
if not exist "%~1" exit /b 1
set "PHP_TRY=%~1"
call :php_ok
exit /b 0

:find_php
set "PHP="
where php >nul 2>&1
if not errorlevel 1 (
  for /f "delims=" %%i in ('where php 2^>nul') do (
    if not defined PHP (
      set "PHP_TRY=%%i"
      call :php_ok
    )
  )
)
call :try_php "%~dp0php\php.exe"
call :try_php "%USERPROFILE%\OneDrive\Desktop\koga.orginal\php.exe"
call :try_php "%USERPROFILE%\OneDrive\Desktop\state orginal - one23\runtime\php\php.exe"
call :try_php "C:\php\php.exe"
call :try_php "C:\php84\php.exe"
call :try_php "C:\xampp\php\php.exe"
exit /b 0

:enable_pdo
"%PHP%" -m 2>nul | findstr /i /c:"pdo_mysql" >nul
if not errorlevel 1 (
  echo  MySQL PDO driver loaded.
  exit /b 0
)
if not exist "%PHP_DIR%ext\php_pdo_mysql.dll" (
  echo  [ERROR] php_pdo_mysql.dll is missing in:
  echo          %PHP_DIR%ext
  exit /b 1
)
if not exist "%PHP_DIR%php.ini" (
  echo  Writing PHP.ini so pdo_mysql can load...
  > "%PHP_DIR%php.ini" (
    echo extension_dir="ext"
    echo extension=curl
    echo extension=fileinfo
    echo extension=gd
    echo extension=mbstring
    echo extension=openssl
    echo extension=pdo_mysql
    echo extension=mysqli
    echo extension=zip
    echo date.timezone=UTC
  )
) else (
  echo.>> "%PHP_DIR%php.ini"
  echo extension=pdo_mysql>> "%PHP_DIR%php.ini"
  echo extension=mysqli>> "%PHP_DIR%php.ini"
  echo extension=mbstring>> "%PHP_DIR%php.ini"
  echo extension=openssl>> "%PHP_DIR%php.ini"
  echo extension=fileinfo>> "%PHP_DIR%php.ini"
  echo extension=curl>> "%PHP_DIR%php.ini"
)
"%PHP%" -m 2>nul | findstr /i /c:"pdo_mysql" >nul
if errorlevel 1 (
  echo  [ERROR] Could not load the MySQL PDO driver.
  echo  Check: %PHP_DIR%php.ini
  "%PHP%" --ini
  exit /b 1
)
echo  MySQL PDO driver loaded.
exit /b 0

:ensure_mysql
netstat -ano | findstr ":3306" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo  MySQL already running on port 3306.
  exit /b 0
)

set "MYSQLD=C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe"
set "MYSQL_DATADIR=%~dp0storage\mysql\data"
set "MYSQL_BASEDIR=C:\Program Files\MySQL\MySQL Server 8.4"
if exist "%MYSQLD%" if exist "%MYSQL_DATADIR%\ibdata1" (
  echo  Starting local MySQL 8.4...
  start "JUDI MySQL" /MIN "%MYSQLD%" --datadir="%MYSQL_DATADIR%" --basedir="%MYSQL_BASEDIR%" --port=3306 --bind-address=127.0.0.1
  goto :wait_mysql
)

if exist "C:\xampp\mysql_start.bat" (
  echo  Starting XAMPP MySQL...
  start "" "C:\xampp\mysql_start.bat"
  goto :wait_mysql
)

if exist "C:\xampp\mysql\bin\mysqld.exe" (
  echo  Starting XAMPP MySQL...
  start "JUDI MySQL" /MIN "C:\xampp\mysql\bin\mysqld.exe" --defaults-file="C:\xampp\mysql\bin\my.ini"
  goto :wait_mysql
)

echo  [ERROR] MySQL is not running, and mysqld.exe was not found.
echo  Start MySQL / XAMPP, then run RUN.bat again.
exit /b 1

:wait_mysql
for /L %%i in (1,1,40) do (
  netstat -ano | findstr ":3306" | findstr "LISTENING" >nul 2>&1
  if not errorlevel 1 (
    echo  MySQL is ready.
    exit /b 0
  )
  timeout /t 1 /nobreak >nul
)
echo  [ERROR] MySQL did not start on port 3306.
exit /b 1
