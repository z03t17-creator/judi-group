#Requires -Version 5.1
# Local launcher for Judi ERP. Called by run.bat.
$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $Root "package.json"))) {
  $Root = $PSScriptRoot
}
Set-Location $Root

$AppPort = 3005
$AppUrl = "http://localhost:$AppPort/en/login"
$PrismaName = "judi"
$DockerDatabaseUrl = "postgresql://judi:judi@127.0.0.1:5432/judi?schema=public"

function Write-Step([string]$Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Ok([string]$Message) {
  Write-Host "    $Message" -ForegroundColor Green
}

function Write-WarnLine([string]$Message) {
  Write-Host "    $Message" -ForegroundColor Yellow
}

function Write-ErrLine([string]$Message) {
  Write-Host "    $Message" -ForegroundColor Red
}

function Test-PortOpen([int]$Port) {
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $async = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
    $waited = $async.AsyncWaitHandle.WaitOne(400)
    $ok = $waited -and $client.Connected
    $client.Close()
    return [bool]$ok
  } catch {
    return $false
  }
}

function Get-DotEnv([string]$Key) {
  $path = Join-Path $Root ".env"
  if (-not (Test-Path $path)) { return $null }
  foreach ($line in Get-Content $path) {
    if ($line -match "^\s*#" -or $line -notmatch "=") { continue }
    $name, $value = $line -split "=", 2
    if ($name.Trim() -ne $Key) { continue }
    $trimmed = $value.Trim().Trim([char]34).Trim([char]39)
    return $trimmed
  }
  return $null
}

function Set-DotEnv([string]$Key, [string]$Value) {
  $path = Join-Path $Root ".env"
  $lines = @()
  if (Test-Path $path) {
    $lines = @(Get-Content -Path $path)
  }
  $escaped = $Value.Replace([string][char]34, "\" + [char]34)
  $replacement = "{0}={1}{2}{1}" -f $Key, [char]34, $escaped
  $keyPattern = "^\s*" + [regex]::Escape($Key) + "\s*="
  $replaced = $false
  $next = foreach ($line in $lines) {
    if ($line -match $keyPattern) {
      $replaced = $true
      $replacement
    } else {
      $line
    }
  }
  if (-not $replaced) {
    $next = @($next) + $replacement
  }
  [System.IO.File]::WriteAllLines($path, $next)
}

function Normalize-DatabaseUrl([string]$Url) {
  if ([string]::IsNullOrWhiteSpace($Url)) { return $Url }
  $normalized = $Url -replace "localhost", "127.0.0.1"
  if ($normalized -match "postgres(ql)?://([^:]+):([^@]+)@([^:/]+):(\d+)/([^?\s]+)") {
    $user = $Matches[2]
    $pass = $Matches[3]
    $hostName = $Matches[4]
    $port = $Matches[5]
    $db = $Matches[6]
    if ($hostName -eq "localhost") { $hostName = "127.0.0.1" }
    # pgbouncer=true disables named prepared statements. Prisma's local
    # Postgres pooler otherwise fails migrate with: prepared statement "s0" already exists.
    if ($port -eq "5432") {
      return "postgresql://${user}:${pass}@${hostName}:${port}/${db}?schema=public"
    }
    return "postgresql://${user}:${pass}@${hostName}:${port}/${db}?sslmode=disable&pgbouncer=true&connection_limit=5&connect_timeout=10&pool_timeout=10"
  }
  return $normalized
}

function Get-TcpUrlFromText([string]$Text) {
  $pattern = "postgres(?:ql)?://[^\s" + [char]34 + "]+"
  $matchesFound = [regex]::Matches($Text, $pattern)
  foreach ($match in $matchesFound) {
    $url = $match.Value.TrimEnd(".", ",", ";", ")")
    if ($url -match "51215|shadow") { continue }
    if ($url -match "prisma\+postgres") { continue }
    return (Normalize-DatabaseUrl $url)
  }
  return $null
}

function Invoke-Npx {
  param(
    [Parameter(Mandatory = $true)][string[]]$NpxArgs,
    [int]$TimeoutMs = 120000
  )
  $npxCmd = Get-Command npx.cmd -ErrorAction SilentlyContinue
  $file = if ($npxCmd) { $npxCmd.Source } else { "npx" }
  $outFile = [System.IO.Path]::GetTempFileName()
  $errFile = [System.IO.Path]::GetTempFileName()
  try {
    $proc = Start-Process -FilePath $file -ArgumentList $NpxArgs -WorkingDirectory $Root -PassThru -NoNewWindow -RedirectStandardOutput $outFile -RedirectStandardError $errFile
    if (-not $proc.WaitForExit($TimeoutMs)) {
      $isDevServer = ($NpxArgs -contains "dev")
      if (-not $isDevServer) {
        try { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue } catch {}
      }
      $script:LastNpxCode = 1
      $script:LastNpxOutput = "timed out after ${TimeoutMs}ms: npx $($NpxArgs -join ' ')"
      return $script:LastNpxCode
    }
    $script:LastNpxCode = $proc.ExitCode
    $stdout = Get-Content -Path $outFile -Raw -ErrorAction SilentlyContinue
    $stderr = Get-Content -Path $errFile -Raw -ErrorAction SilentlyContinue
    $script:LastNpxOutput = (@($stdout, $stderr) | Where-Object { $_ } | ForEach-Object { $_.TrimEnd() }) -join "`n"
  } finally {
    Remove-Item -Force $outFile, $errFile -ErrorAction SilentlyContinue
  }
  return $script:LastNpxCode
}

function Initialize-EnvFile {
  $envPath = Join-Path $Root ".env"
  $example = Join-Path $Root ".env.example"
  if (-not (Test-Path $envPath)) {
    if (-not (Test-Path $example)) {
      throw "Missing .env and .env.example"
    }
    Copy-Item $example $envPath
    Write-Ok "Created .env from .env.example"
  }

  $secret = Get-DotEnv "AUTH_SECRET"
  if ([string]::IsNullOrWhiteSpace($secret) -or $secret -match "replace-with-a-32-byte-secret") {
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $generated = [Convert]::ToBase64String($bytes)
    Set-DotEnv "AUTH_SECRET" $generated
    Write-Ok "Generated AUTH_SECRET"
  }

  $trust = Get-DotEnv "AUTH_TRUST_HOST"
  if ([string]::IsNullOrWhiteSpace($trust)) {
    Set-DotEnv "AUTH_TRUST_HOST" "true"
  }
}

function Start-PrismaInstance {
  Write-Step ("Starting local Postgres (Prisma instance {0})" -f $PrismaName)
  Write-Host "    Prisma may download a helper the first time - wait up to a minute."

  $null = Invoke-Npx @("prisma", "dev", "start", $PrismaName)
  $text = $script:LastNpxOutput
  $started = ($script:LastNpxCode -eq 0) -or ($text -match "Started|Listening|already")
  if (-not $started) {
    Write-WarnLine ("Instance not started yet - creating {0}..." -f $PrismaName)
    $null = Invoke-Npx @(
      "prisma", "dev", "--detach",
      "--name", $PrismaName,
      "--port", "51213",
      "--db-port", "51214",
      "--shadow-db-port", "51215"
    )
    $text = $script:LastNpxOutput
    $started = ($script:LastNpxCode -eq 0) -or ($text -match "Started|Listening|ready")
  }

  if (-not $started) {
    Write-ErrLine "Prisma Postgres did not start."
    if ($text) { Write-Host $text }
    return $null
  }

  $tcpUrl = Get-TcpUrlFromText $text
  $dbPort = 51214
  if ($tcpUrl -match ":(\d+)/") { $dbPort = [int]$Matches[1] }
  for ($i = 0; $i -lt 40; $i++) {
    if (Test-PortOpen $dbPort) { break }
    Start-Sleep -Milliseconds 250
  }
  Write-Ok ("Prisma Postgres is up on port {0}" -f $dbPort)
  return $tcpUrl
}

function Start-DockerDatabase {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    return $false
  }
  Write-Step "Starting Docker Postgres (fallback)"
  & docker compose up -d
  if ($LASTEXITCODE -ne 0) { return $false }

  for ($i = 0; $i -lt 30; $i++) {
    if (Test-PortOpen 5432) { break }
    Start-Sleep -Seconds 1
  }
  Set-DotEnv "DATABASE_URL" $DockerDatabaseUrl
  Write-Ok "Using Docker DATABASE_URL"
  return $true
}

function Get-DatabasePort {
  $url = Get-DotEnv "DATABASE_URL"
  if ($url -match ":(\d+)/") { return [int]$Matches[1] }
  return 51214
}

function Test-DatabaseReady {
  return (Test-PortOpen (Get-DatabasePort))
}

function Wait-PrismaPort {
  for ($i = 0; $i -lt 40; $i++) {
    if (Test-PortOpen 51214) { return $true }
    Start-Sleep -Milliseconds 250
  }
  return $false
}

function Repair-PrismaPool {
  Write-WarnLine "Restarting Prisma Postgres to clear leftover prepared statements..."
  $null = Invoke-Npx @("prisma", "dev", "stop", $PrismaName)
  Start-Sleep -Seconds 2
  $null = Invoke-Npx @("prisma", "dev", "start", $PrismaName)
  if (-not (Wait-PrismaPort)) {
    Write-WarnLine "Prisma Postgres did not come back on port 51214"
  }
}

function Test-PrismaClientReady {
  $clientJs = Join-Path $Root "node_modules\.prisma\client\index.js"
  $engine = Join-Path $Root "node_modules\.prisma\client\query_engine-windows.dll.node"
  return (Test-Path $clientJs) -and (Test-Path $engine)
}

function Invoke-SchemaAndSeed {
  Write-Step "Applying migrations and seed logins"

  $appAlreadyUp = Test-PortOpen $AppPort
  if ($appAlreadyUp) {
    Write-Ok "App already running - skipping generate/migrate/seed"
    return $true
  }

  $null = Invoke-Npx @("prisma", "generate")
  $generateOk = ($script:LastNpxCode -eq 0) -or ($script:LastNpxOutput -match "deprecated" -and $script:LastNpxOutput -notmatch "(?m)^Error:")
  if (-not $generateOk) {
    if (($script:LastNpxOutput -match "EPERM") -and (Test-PrismaClientReady)) {
      Write-Ok "Prisma client already generated (engine file in use)"
    } else {
      Write-WarnLine "prisma generate reported an error - continuing"
      if ($script:LastNpxOutput) { Write-Host $script:LastNpxOutput }
    }
  }

  $migrated = $false
  for ($attempt = 1; $attempt -le 3; $attempt++) {
    $null = Invoke-Npx @("prisma", "migrate", "deploy")
    if ($script:LastNpxCode -eq 0) {
      $migrated = $true
      break
    }
    if ($script:LastNpxOutput -match "prepared statement") {
      Write-WarnLine ("migrate hit a pooled prepared-statement clash (attempt {0}/3)" -f $attempt)
      Repair-PrismaPool
      continue
    }
    break
  }

  if (-not $migrated) {
    Write-ErrLine "prisma migrate deploy failed"
    if ($script:LastNpxOutput) { Write-Host $script:LastNpxOutput }
    return $false
  }
  Write-Ok "Migrations applied"

  $null = Invoke-Npx @("prisma", "db", "seed")
  if ($script:LastNpxCode -ne 0) {
    Write-ErrLine "prisma db seed failed - login accounts may be missing"
    if ($script:LastNpxOutput) { Write-Host $script:LastNpxOutput }
    return $false
  }
  Write-Ok "Seed accounts ready (password JudiAdmin!26)"
  return $true
}

function Test-AppHttpReady {
  param([int]$TimeoutSec = 5)
  try {
    $null = Invoke-WebRequest -Uri "http://127.0.0.1:$AppPort/en/login" -UseBasicParsing -TimeoutSec $TimeoutSec
    return $true
  } catch {
    if ($_.Exception.Response) { return $true }
    return $false
  }
}

function Stop-AppOnPort {
  $ids = @()
  try {
    $ids = @(Get-NetTCPConnection -LocalPort $AppPort -State Listen -ErrorAction SilentlyContinue |
      Select-Object -ExpandProperty OwningProcess -Unique)
  } catch {}
  foreach ($procId in $ids) {
    if (-not $procId -or $procId -eq 0) { continue }
    Write-WarnLine ("Stopping hung server PID {0} on port {1}" -f $procId, $AppPort)
    cmd.exe /c "taskkill /PID $procId /T /F" | Out-Null
  }
  for ($i = 0; $i -lt 10; $i++) {
    if (-not (Test-PortOpen $AppPort)) { break }
    Start-Sleep -Milliseconds 400
  }
}

function Start-AppIfNeeded {
  if (Test-PortOpen $AppPort) {
    if (Test-AppHttpReady) {
      Write-Ok ("App already listening on port {0}" -f $AppPort)
      return $true
    }
    Write-WarnLine "Port is open but the website is not responding - restarting Next.js"
    Stop-AppOnPort
  }

  Write-Step ("Starting Next.js on port {0}" -f $AppPort)
  $cmd = 'cd /d "{0}" && npm run dev' -f $Root
  Start-Process -FilePath "cmd.exe" -ArgumentList @("/k", $cmd) -WorkingDirectory $Root -WindowStyle Normal

  for ($i = 0; $i -lt 90; $i++) {
    if (Test-AppHttpReady -TimeoutSec 3) {
      Write-Ok "Server is ready"
      return $true
    }
    Start-Sleep -Seconds 1
  }

  Write-WarnLine "Server did not answer HTTP in time - opening the browser anyway"
  return $false
}

function Open-AppBrowser {
  $chromeCandidates = @(
    (Join-Path $env:ProgramFiles "Google\Chrome\Application\chrome.exe"),
    (Join-Path ${env:ProgramFiles(x86)} "Google\Chrome\Application\chrome.exe"),
    (Join-Path $env:LocalAppData "Google\Chrome\Application\chrome.exe")
  )
  $chrome = $chromeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
  $edgeCandidates = @(
    (Join-Path ${env:ProgramFiles(x86)} "Microsoft\Edge\Application\msedge.exe"),
    (Join-Path $env:ProgramFiles "Microsoft\Edge\Application\msedge.exe")
  )
  $edge = $edgeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

  if ($chrome) {
    Start-Process -FilePath $chrome -ArgumentList $AppUrl
  } elseif ($edge) {
    Start-Process -FilePath $edge -ArgumentList $AppUrl
  } else {
    Start-Process $AppUrl
  }
  Write-Ok ("Opened {0}" -f $AppUrl)
}

Write-Host ""
Write-Host "========================================" -ForegroundColor White
Write-Host "  Judi ERP - local development" -ForegroundColor White
Write-Host "========================================" -ForegroundColor White

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-ErrLine "Node.js is not installed or not on PATH."
  exit 1
}

if (-not (Test-Path (Join-Path $Root "node_modules"))) {
  Write-Step "Installing npm packages"
  & npm install
  if ($LASTEXITCODE -ne 0) {
    Write-ErrLine "npm install failed"
    exit 1
  }
}

try {
  Initialize-EnvFile
} catch {
  Write-ErrLine $_
  exit 1
}

$printedUrl = Start-PrismaInstance

$existing = Get-DotEnv "DATABASE_URL"
if ($existing -and ($existing -match "localhost" -or ($existing -match ":51214/" -and $existing -notmatch "pgbouncer=true"))) {
  Set-DotEnv "DATABASE_URL" (Normalize-DatabaseUrl $existing)
  Write-Ok "Normalized DATABASE_URL for local Prisma Postgres"
}

if ($printedUrl) {
  $current = Get-DotEnv "DATABASE_URL"
  if ([string]::IsNullOrWhiteSpace($current) -or $current -match "judi:judi@") {
    Set-DotEnv "DATABASE_URL" $printedUrl
    Write-Ok "Wrote DATABASE_URL from Prisma"
  }
}

$dbReady = Test-DatabaseReady
if (-not $dbReady -and $printedUrl) {
  Set-DotEnv "DATABASE_URL" $printedUrl
  Write-WarnLine "Existing DATABASE_URL did not connect - using Prisma TCP URL"
  $dbReady = Test-DatabaseReady
}

if (-not $dbReady) {
  if (Start-DockerDatabase) {
    $dbReady = Test-DatabaseReady
  }
}

if (-not $dbReady) {
  Write-ErrLine "Database is not reachable. Check Prisma / Docker, then run this again."
  exit 1
}

$appHealthy = (Test-PortOpen $AppPort) -and (Test-AppHttpReady)
if ($appHealthy) {
  Write-Ok ("App already answering on port {0} - skipping generate/migrate" -f $AppPort)
} else {
  if (Test-PortOpen $AppPort) {
    Write-WarnLine "Website is not loading - restarting the hung Next.js process"
    Stop-AppOnPort
  }
  if (-not (Invoke-SchemaAndSeed)) {
    exit 1
  }
}

Start-AppIfNeeded | Out-Null

Write-Step "Opening browser"
Open-AppBrowser

Write-Host ""
Write-Host "Click any account on the login page (dev only)." -ForegroundColor Green
Write-Host "Shared password: JudiAdmin!26" -ForegroundColor Green
Write-Host "  admin@judi.local          Admin"
Write-Host "  warehouse@judi.local      Warehouse accountant"
Write-Host "  collector@judi.local      Collector accountant"
Write-Host "  delegate@judi.local       Field delegate"
Write-Host ""
Write-Host "Keep the npm run dev window open while you use the app."
Write-Host ""
exit 0
