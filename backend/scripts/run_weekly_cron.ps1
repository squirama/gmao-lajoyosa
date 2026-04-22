$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Split-Path -Parent $scriptDir
$logDir = Join-Path $backendDir 'logs'
$logFile = Join-Path $logDir 'weekly_cron.log'

if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

function Write-Log {
    param(
        [string]$Message
    )

    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -Path $logFile -Value "[$timestamp] $Message"
}

function Resolve-BackendBaseUrl {
    $candidates = @(
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001'
    )

    foreach ($baseUrl in $candidates) {
        try {
            $health = Invoke-RestMethod -Method Get -Uri "$baseUrl/health" -TimeoutSec 10
            if ($health.status -eq 'ok' -or $health.database) {
                return $baseUrl
            }
        } catch {
            continue
        }
    }

    throw "No se ha encontrado un backend GMAO activo en 3000 ni 3001."
}

try {
    $baseUrl = Resolve-BackendBaseUrl
    Write-Log "Backend detectado en $baseUrl"

    $response = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/cron/generate" -ContentType 'application/json' -Body '{}' -TimeoutSec 120
    $json = $response | ConvertTo-Json -Compress -Depth 6
    Write-Log "Cron ejecutado correctamente: $json"
    exit 0
} catch {
    Write-Log "Error ejecutando cron semanal: $($_.Exception.Message)"
    exit 1
}
