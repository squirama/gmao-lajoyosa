# Configuracion
$pgDumpPath = "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe"
$backupDir = "C:\Backups\GMAO"
$dbName = "gmao"
$dbUser = "postgres"
$date = Get-Date -Format "yyyy-MM-dd_HH-mm"
$backupFile = "$backupDir\gmao_backup_$date.sql"

if (-not (Test-Path $backupDir)) {
    Write-Host "El directorio de backup no existe: $backupDir" -ForegroundColor Red
    exit
}

# Requiere que PGPASSWORD exista en el entorno del sistema o en un archivo .pgpass.
& $pgDumpPath -U $dbUser -F p -f $backupFile $dbName

if ($LASTEXITCODE -eq 0) {
    Write-Host "Backup completado: $backupFile" -ForegroundColor Green

    Get-ChildItem -Path $backupDir -Filter "gmao_backup_*.sql" |
        Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
        Remove-Item

    Write-Host "Limpieza de backups antiguos completada."
}
else {
    Write-Host "Error al realizar backup." -ForegroundColor Red
}
