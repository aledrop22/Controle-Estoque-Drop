# Script para iniciar backend automaticamente
$ErrorActionPreference = "Stop"

Write-Host "=== Iniciando Backend API (Porta 4000) ===" -ForegroundColor Cyan

# Mata processos na porta 4000 se existirem
$port4000 = Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue
if ($port4000) {
    $pid = $port4000.OwningProcess
    Write-Host "Encerrando processo existente na porta 4000 (PID: $pid)..." -ForegroundColor Yellow
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Inicia o servidor
Write-Host "Iniciando servidor backend (oculto)..." -ForegroundColor Green
$proc = Start-Process -FilePath "node" -ArgumentList "server/sheetServer.mjs" -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru
Write-Host "Backend PID: $($proc.Id)" -ForegroundColor DarkGray
