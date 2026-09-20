# FACE L7 — Build a cPanel-ready zip of the Laravel app (no .env).
# Usage (from laravel/):  .\deploy\prepare-cpanel.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "==> Composer install (no-dev, optimized)"
composer install --no-dev --optimize-autoloader --no-interaction
if ($LASTEXITCODE -ne 0) { throw "composer install failed" }

Write-Host "==> Clear caches for packaging"
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan event:clear

$OutDir = Join-Path $Root "storage\deploy"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$ZipPath = Join-Path $OutDir "judi-cpanel.zip"
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }

$Staging = Join-Path $env:TEMP ("judi-cpanel-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $Staging | Out-Null

$ExcludeNames = @{
    ".env" = $true
    ".env.local" = $true
    ".git" = $true
    "node_modules" = $true
    "tests" = $true
}

try {
    Write-Host "==> Copying files to staging"
    Get-ChildItem -Force $Root | ForEach-Object {
        if ($ExcludeNames.ContainsKey($_.Name)) { return }
        if ($_.Name -eq "storage") { return }
        Copy-Item $_.FullName (Join-Path $Staging $_.Name) -Recurse -Force
    }

    # Fresh writable storage tree (no local logs / mysql datadir / prior zips)
    $storageDirs = @(
        "storage\app\public",
        "storage\framework\cache\data",
        "storage\framework\sessions",
        "storage\framework\views",
        "storage\logs",
        "storage\deploy"
    )
    foreach ($rel in $storageDirs) {
        $p = Join-Path $Staging $rel
        New-Item -ItemType Directory -Force -Path $p | Out-Null
        Set-Content -Path (Join-Path $p ".gitignore") -Value "*`n!.gitignore`n"
    }

    # Keep framework .gitignore files from the repo if present
    foreach ($gi in @("storage\app\.gitignore", "storage\framework\.gitignore", "storage\logs\.gitignore")) {
        $src = Join-Path $Root $gi
        if (Test-Path $src) {
            $dest = Join-Path $Staging $gi
            New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
            Copy-Item $src $dest -Force
        }
    }

    Write-Host "==> Zipping -> $ZipPath"
    Compress-Archive -Path (Join-Path $Staging "*") -DestinationPath $ZipPath -Force

    $sizeMb = [math]::Round((Get-Item $ZipPath).Length / 1MB, 1)
    Write-Host ""
    Write-Host "Done: $ZipPath ($sizeMb MB)"
    Write-Host "Upload, extract under /home/USER/judi/, then follow DEPLOY.md"
}
finally {
    if (Test-Path $Staging) { Remove-Item $Staging -Recurse -Force }
}
