# Inicia backend e frontend automaticamente (oculto)
Write-Host "`n=== CONTROLE DE ESTOQUE - Inicializando ===" -ForegroundColor Cyan

# Verifica npm disponível (Node/NVM instalados)
$npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npmCmd) {
    Write-Host "npm não encontrado. Instale NVM (Windows) e Node 22 LTS, reinicie o terminal e tente novamente." -ForegroundColor Red
    Write-Host "Guia rápido: https://github.com/coreybutler/nvm-windows/releases -> nvm install 22.11.0; nvm use 22.11.0" -ForegroundColor Yellow
    exit 1
}

# Limpa portas
Write-Host "[1/4] Limpando portas..." -ForegroundColor Yellow
Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 1

# Inicia backend em segundo plano (janela oculta)
Write-Host "[2/4] Iniciando Backend (porta 4000)..." -ForegroundColor Yellow
# Executa via npm para evitar dependência do PATH do Node
$backendProc = Start-Process -FilePath "npm.cmd" -ArgumentList @("run", "api") -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 2

# Valida backend
Write-Host "[3/4] Validando backend..." -ForegroundColor Yellow
$backendOk = $false
for ($i = 1; $i -le 8; $i++) {
    try {
        $health = Invoke-RestMethod -Uri http://localhost:4000/api/health -TimeoutSec 2
        Write-Host "  OK Backend (PID: $($health.pid))" -ForegroundColor Green
        $backendOk = $true
        break
    }
    catch {
        Start-Sleep -Seconds 2
    }
}

# Inicia frontend em segundo plano (janela oculta)
Write-Host "[4/4] Iniciando Frontend (porta 3000)..." -ForegroundColor Yellow
# Usar npm.cmd diretamente para evitar shells extras
$frontendProc = Start-Process -FilePath "npm.cmd" -ArgumentList @("run", "dev") -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 6

# Resultado final
Write-Host "`n=== SISTEMA PRONTO ===" -ForegroundColor Green
Write-Host "Dashboard: http://localhost:3000" -ForegroundColor Cyan
Write-Host "API: http://localhost:4000" -ForegroundColor Cyan

if ($backendOk) {
    try {
        $resp = Invoke-RestMethod -Uri http://localhost:4000/api/inventory?today=1 -TimeoutSec 5
        Write-Host "Produtos: $($resp.products.Count) | Data: $($resp.filterDate)" -ForegroundColor Yellow
    }
    catch {}
}

Write-Host "`nAbrindo navegador..." -ForegroundColor Gray
Start-Sleep -Seconds 1
Start-Process "http://localhost:3000"

Write-Host "`n=== SERVIDORES RODANDO EM SEGUNDO PLANO ===" -ForegroundColor Green
Write-Host "PIDs -> Backend: $($backendProc.Id) | Frontend: $($frontendProc.Id)" -ForegroundColor DarkGray
Write-Host "Para encerrar, execute o script: .\\stop.ps1" -ForegroundColor Yellow
