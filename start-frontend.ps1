# Script para iniciar frontend automaticamente
$ErrorActionPreference = "Stop"

Write-Host "=== Iniciando Frontend Vite (Porta 3000) ===" -ForegroundColor Cyan

# Verifica npm disponível
$npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npmCmd) {
    Write-Host "npm não encontrado. Instale NVM (Windows) e Node 22 LTS, reinicie o terminal e tente novamente." -ForegroundColor Red
    exit 1
}

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

# Aguarda servidor ficar pronto e abre navegador
Write-Host "Aguardando http://localhost:3000 ficar disponível..." -ForegroundColor Yellow
$ready = $false
for ($i = 1; $i -le 10; $i++) {
    try {
        $res = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:3000" -TimeoutSec 3
        if ($res.StatusCode -ge 200 -and $res.StatusCode -lt 500) {
            $ready = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 2
    }
}

if ($ready) {
    Write-Host "Abrindo navegador em http://localhost:3000" -ForegroundColor Cyan
    Start-Process "http://localhost:3000"
} else {
    Write-Host "Servidor não respondeu a tempo. Abra manualmente: http://localhost:3000" -ForegroundColor Yellow
}
