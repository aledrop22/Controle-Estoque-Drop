# Script para iniciar frontend automaticamente
$ErrorActionPreference = "Stop"

Write-Host "=== Iniciando Frontend Vite (Porta 3000) ===" -ForegroundColor Cyan

# Mata processos na porta 3000 se existirem
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($port3000) {
    $pid = $port3000.OwningProcess
    Write-Host "Encerrando processo existente na porta 3000 (PID: $pid)..." -ForegroundColor Yellow
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Inicia o Vite
Write-Host "Iniciando servidor de desenvolvimento (oculto)..." -ForegroundColor Green
$proc = Start-Process -FilePath "npm.cmd" -ArgumentList @("run","dev") -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru
Write-Host "Frontend PID: $($proc.Id)" -ForegroundColor DarkGray
