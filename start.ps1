<#
.SYNOPSIS
Inicia RubyMind con Docker Compose. Requisitos: Git, Docker y Docker Compose v2.

.DESCRIPTION
  .\start.ps1                       Construye las imagenes en esta maquina y las inicia
  .\start.ps1 -Images               Usa las imagenes publicadas en Docker Hub (no construye)
  .\start.ps1 -Observability        Agrega Grafana, Prometheus, Tempo, Loki y el Collector
  .\start.ps1 -Lan                  Publica la URL con la IP de esta maquina (jugar desde otros dispositivos)
  .\start.ps1 -PublicUrl URL        Usa una URL concreta (por ejemplo http://192.168.1.20:8080)
  .\start.ps1 -DebugControls        Muestra el boton "simular reconexion" (demostracion; reconstruye la web)

La primera vez crea .env desde .env.example y genera las contrasenas que falten.
Si la politica de ejecucion bloquea el script:  powershell -ExecutionPolicy Bypass -File .\start.ps1
#>
[CmdletBinding()]
param(
  [switch]$Images,
  [switch]$Observability,
  [switch]$Lan,
  [switch]$DebugControls,
  [string]$PublicUrl = ""
)
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw "Docker no esta instalado o no esta en el PATH." }
# Con $ErrorActionPreference = "Stop", PowerShell 5.1 convierte la salida de error de un comando nativo
# en una excepcion; se captura para mostrar un mensaje claro.
function Test-Native([scriptblock]$Command) {
  try { & $Command *> $null; return ($LASTEXITCODE -eq 0) } catch { return $false }
}
if (-not (Test-Native { docker compose version })) { throw "Se necesita Docker Compose v2 (docker compose)." }
if (-not (Test-Native { docker info })) { throw "El servicio de Docker no esta en ejecucion. Inicie Docker Desktop e intente de nuevo." }

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function New-RandomHex {
  $bytes = New-Object byte[] 16
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $rng.GetBytes($bytes)
  $rng.Dispose()
  return (($bytes | ForEach-Object { $_.ToString("x2") }) -join "")
}

function Get-EnvValue([string]$Key) {
  $line = Get-Content -LiteralPath ".env" | Where-Object { $_ -match "^$([regex]::Escape($Key))=" } | Select-Object -First 1
  if ($null -eq $line) { return "" }
  return $line.Substring($Key.Length + 1)
}

function Set-EnvValue([string]$Key, [string]$Value) {
  $lines = [System.Collections.Generic.List[string]]::new()
  foreach ($l in (Get-Content -LiteralPath ".env")) { $lines.Add($l) }
  $found = $false
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^$([regex]::Escape($Key))=") { $lines[$i] = "$Key=$Value"; $found = $true; break }
  }
  if (-not $found) { $lines.Add("$Key=$Value") }
  [System.IO.File]::WriteAllText((Join-Path $PWD ".env"), (($lines -join "`n") + "`n"), $Utf8NoBom)
}

# Cada copia del repositorio usa su propio proyecto de Compose (profelink-<carpeta>), de modo que dos copias
# en la misma maquina no se pisan los contenedores, los volumenes ni las imagenes.
function Get-Slug([string]$Text) {
  $s = ($Text.ToLowerInvariant() -replace "[^a-z0-9]", "-") -replace "-+", "-"
  return $s.Trim("-")
}
$slug = Get-Slug (Split-Path -Leaf $PSScriptRoot)
$ProjectDefault = if ($slug) { "profelink-$slug" } else { "profelink" }

# "volume ls" no escribe errores si el volumen no existe (con "inspect" PowerShell 5.1 abortaria).
function Test-Volume([string]$Name) {
  $found = docker volume ls -q --filter "name=^$Name$"
  return [bool]$found
}

if (-not (Test-Path -LiteralPath ".env")) {
  if (Test-Volume "$($ProjectDefault)_pgdata") {
    throw ("Existen datos de una ejecucion anterior de este proyecto (volumen $($ProjectDefault)_pgdata) pero falta el archivo .env. " +
      "Sin el .env original la contrasena de la base de datos no coincide. Restaure el .env anterior o borre los datos " +
      "con .\stop.ps1 -Purge y vuelva a ejecutar .\start.ps1.")
  }
  Copy-Item -LiteralPath ".env.example" -Destination ".env"
  Write-Host "Se creo .env desde .env.example"
}

# Nunca se comparte el proyecto con otra copia: sin nombre en .env se usa siempre profelink-<carpeta>.
if ((Get-EnvValue "COMPOSE_PROJECT_NAME") -eq "") { Set-EnvValue "COMPOSE_PROJECT_NAME" $ProjectDefault }
$env:COMPOSE_PROJECT_NAME = Get-EnvValue "COMPOSE_PROJECT_NAME"

$pg = Get-EnvValue "POSTGRES_PASSWORD"
if ($pg -eq "" -or $pg -eq "cambiar_esto") { Set-EnvValue "POSTGRES_PASSWORD" (New-RandomHex) }
$gf = Get-EnvValue "GRAFANA_ADMIN_PASSWORD"
if ($gf -eq "" -or $gf -eq "cambiar_esto") { Set-EnvValue "GRAFANA_ADMIN_PASSWORD" (New-RandomHex) }
if ((Get-EnvValue "DEMO_PASSWORD") -eq "") { Set-EnvValue "DEMO_PASSWORD" ("Demo" + (New-RandomHex)) }

if ($Lan) {
  $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" -and $_.PrefixOrigin -ne "WellKnown" } |
    Select-Object -First 1 -ExpandProperty IPAddress
  if (-not $ip) { throw "No se pudo detectar la IP; use -PublicUrl http://IP:PUERTO" }
  $PublicUrl = "http://${ip}:$(Get-EnvValue 'WEB_PORT')"
}
if ($PublicUrl -ne "") { Set-EnvValue "PUBLIC_URL" $PublicUrl }
if ($DebugControls) { Set-EnvValue "VITE_ENABLE_DEBUG_CONTROLS" "true" }

$compose = @("compose", "-f", "compose.yaml")
$upArgs = @("up", "-d", "--wait")
if (-not $Images) {
  $compose += @("-f", "compose.build.yaml")
  $upArgs += "--build"
}
if ($Observability) {
  Set-EnvValue "OTEL_EXPORTER_OTLP_ENDPOINT" "http://otel-collector:4318"
  $compose += @("--profile", "observability")
} else {
  Set-EnvValue "OTEL_EXPORTER_OTLP_ENDPOINT" ""
}

if ($Images) {
  Write-Host "Descargando imagenes de Docker Hub..."
  docker @compose pull
  if ($LASTEXITCODE -ne 0) { throw "No se pudieron descargar las imagenes." }
}

Write-Host "Iniciando (la primera vez tarda unos minutos)..."
docker @compose @upArgs
if ($LASTEXITCODE -ne 0) { throw "Los servicios no quedaron sanos. Revise: docker compose logs" }

Write-Host "Cargando datos de demostracion (idempotente)..."
docker @compose run --rm seed-auth
if ($LASTEXITCODE -ne 0) { throw "Fallo el seed de auth-api." }
docker @compose run --rm seed-kahoot
if ($LASTEXITCODE -ne 0) { throw "Fallo el seed de kahoot-api." }

Write-Host ""
Write-Host "RubyMind esta en marcha."
Write-Host "  Proyecto Compose: $($env:COMPOSE_PROJECT_NAME)"
Write-Host "  Aplicacion:      $(Get-EnvValue 'PUBLIC_URL')"
Write-Host "  Usuario demo:    $(Get-EnvValue 'DEMO_EMAIL')"
Write-Host "  Contrasena demo: $(Get-EnvValue 'DEMO_PASSWORD')   (guardada en .env)"
Write-Host "  API de auth:     http://localhost:$(Get-EnvValue 'AUTH_PORT')/docs     (solo en esta maquina)"
Write-Host "  API de kahoot:   http://localhost:$(Get-EnvValue 'KAHOOT_PORT')/docs   (solo en esta maquina)"
if ($Observability) {
  Write-Host "  Grafana:         http://localhost:$(Get-EnvValue 'GRAFANA_PORT')  (usuario $(Get-EnvValue 'GRAFANA_ADMIN_USER'), contrasena en .env)"
}
Write-Host "Detener: .\stop.ps1   |   Detener y borrar datos: .\stop.ps1 -Purge"
