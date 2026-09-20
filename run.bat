@echo off
setlocal EnableExtensions
title JUDI
cd /d "%~dp0"

REM Windows marks downloaded .bat files as Internet-zone. Calling laravel\RUN.bat
REM then shows "Open File - Security Warning" and Cancel looks like "not working".
powershell -NoProfile -ExecutionPolicy Bypass -Command "Unblock-File -LiteralPath '%~dp0run.bat','%~dp0laravel\RUN.bat' -ErrorAction SilentlyContinue"

if /i "%~1"=="--run" goto :go
start "JUDI" "%ComSpec%" /k ""%~f0" --run"
exit /b 0

:go
if not exist "%~dp0laravel\RUN.bat" (
  echo Missing laravel\RUN.bat
  pause
  exit /b 1
)
cd /d "%~dp0laravel"
call "%~dp0laravel\RUN.bat"
