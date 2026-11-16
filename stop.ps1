<#
.SYNOPSIS
Detiene RubyMind.

.DESCRIPTION
  .\stop.ps1          Detiene y elimina los contenedores; CONSERVA los datos (perfiles, cuestionarios, imagenes, resultados)
  .\stop.ps1 -Purge   Ademas BORRA los volumenes: se pierden todos los datos
#>
[CmdletBinding()]
param([switch]$Purge)
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

# Sin .env Compose no puede interpolar las variables obligatorias; para detener basta cualquier valor.
if (-not (Test-Path -LiteralPath ".env")) {
  $env:POSTGRES_PASSWORD = "x"; $env:DEMO_PASSWORD = "x"; $env:GRAFANA_ADMIN_PASSWORD = "x"
}

# Mismo nombre de proyecto que usa start.ps1 (profelink-<carpeta>), salvo que .env ya lo fije.
function Get-Slug([string]$Text) {
  $s = ($Text.ToLowerInvariant() -replace "[^a-z0-9]", "-") -replace "-+", "-"
  return $s.Trim("-")
}
$fromEnv = ""
if (Test-Path -LiteralPath ".env") {
  $line = Get-Content -LiteralPath ".env" | Where-Object { $_ -match "^COMPOSE_PROJECT_NAME=.+" } | Select-Object -First 1
  if ($line) { $fromEnv = $line.Substring("COMPOSE_PROJECT_NAME=".Length) }
}
if ($fromEnv -ne "") {
  $env:COMPOSE_PROJECT_NAME = $fromEnv
} else {
  $slug = Get-Slug (Split-Path -Leaf $PSScriptRoot)
  $env:COMPOSE_PROJECT_NAME = if ($slug) { "profelink-$slug" } else { "profelink" }
}
Write-Host "Proyecto Compose: $($env:COMPOSE_PROJECT_NAME)"

$compose = @("compose", "-f", "compose.yaml", "--profile", "observability", "--profile", "seed")
if ($Purge) {
  $answer = Read-Host 'Esto borrara TODOS los datos (base de datos, imagenes, claves). Escriba "borrar" para continuar'
  if ($answer -ne "borrar") { Write-Host "Cancelado."; exit 1 }
  docker @compose down -v --remove-orphans
  if ($LASTEXITCODE -ne 0) { throw "No se pudo eliminar todo. Revise el mensaje de Docker." }
  Write-Host "Contenedores y datos eliminados."
} else {
  docker @compose down --remove-orphans
  if ($LASTEXITCODE -ne 0) { throw "No se pudo detener. Revise el mensaje de Docker." }
  Write-Host "Contenedores detenidos. Los datos se conservan; .\start.ps1 los recupera."
}
