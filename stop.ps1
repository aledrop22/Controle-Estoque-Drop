# Para os servidores backend e frontend
Write-Host "Encerrando servidores..." -ForegroundColor Yellow

# Para processos nas portas 3000 e 4000
$ports = @(3000, 4000)
foreach ($port in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conn) {
        $pid = $conn.OwningProcess
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        Write-Host "Encerrado processo na porta $port (PID: $pid)" -ForegroundColor Green
    }
}

# Para e remove jobs
Get-Job | Stop-Job -ErrorAction SilentlyContinue
Get-Job | Remove-Job -ErrorAction SilentlyContinue

Write-Host "Servidores encerrados!" -ForegroundColor Green
