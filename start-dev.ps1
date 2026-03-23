$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

$backendPath = Join-Path $repoRoot 'backend'
$frontendPath = Join-Path $repoRoot 'frontend'

Write-Host 'Starting backend watcher on http://127.0.0.1:3001 ...'
Start-Process powershell -ArgumentList @(
    '-NoExit',
    '-Command',
    "Set-Location '$backendPath'; npm run dev"
)

Write-Host 'Starting Vite dev server on http://0.0.0.0:3000 ...'
Start-Process powershell -ArgumentList @(
    '-NoExit',
    '-Command',
    "Set-Location '$frontendPath'; npm run dev"
)

Write-Host 'Open http://192.168.2.217:3000/ in the browser.'
