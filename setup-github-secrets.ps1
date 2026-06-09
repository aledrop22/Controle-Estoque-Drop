# Script para configurar secrets no GitHub
# Requer: GitHub Personal Access Token com permissão 'repo'

$REPO = "aledrop22/Controle-Estoque-Drop"
$GITHUB_TOKEN = Read-Host "Digite seu GitHub Personal Access Token (com permissão repo)"

$headers = @{
    Authorization = "token $GITHUB_TOKEN"
    Accept = "application/vnd.github.v3+json"
}

# Função para adicionar secret
function Add-GitHubSecret {
    param(
        [string]$Name,
        [string]$Value
    )
    
    # Criar um script PowerShell para codificar em base64
    $encodedValue = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($Value))
    
    $body = @{
        encrypted_value = $encodedValue
        key_id = ""  # Será gerado automaticamente pelo GitHub
    } | ConvertTo-Json
    
    $url = "https://api.github.com/repos/$REPO/actions/secrets/$Name"
    
    try {
        # Primeiro, precisamos obter a public key do repositório
        $keyUrl = "https://api.github.com/repos/$REPO/actions/secrets/public-key"
        $keyResponse = Invoke-RestMethod -Uri $keyUrl -Headers $headers -Method Get
        
        # Criptografar o valor usando a public key
        # Para simplificar, vamos usar a API moderna que aceita o valor direto
        $body = @{
            secret_name = $Name
            secret_value = $Value
        } | ConvertTo-Json
        
        $url = "https://api.github.com/repos/$REPO/actions/secrets/$Name"
        $response = Invoke-RestMethod -Uri $url -Headers $headers -Method Put -Body $body -ContentType "application/json"
        
        Write-Host "✅ Secret '$Name' adicionado com sucesso" -ForegroundColor Green
    } catch {
        Write-Host "❌ Erro ao adicionar secret '$Name': $_" -ForegroundColor Red
    }
}

# Ler valores do .env
if (Test-Path ".env") {
    $envContent = Get-Content ".env" | Where-Object { $_ -match "=" } | ForEach-Object {
        $key, $value = $_.split("=", 2)
        [PSCustomObject]@{ Key = $key.Trim(); Value = $value.Trim() }
    }
    
    Write-Host "📋 Lendo valores do .env..." -ForegroundColor Yellow
    
    # Configurar secrets
    $seuEmail = ($envContent | Where-Object { $_.Key -eq "EMAIL" }).Value
    $seuPassword = ($envContent | Where-Object { $_.Key -eq "PASSWORD" }).Value
    $supabaseUrl = ($envContent | Where-Object { $_.Key -eq "VITE_SUPABASE_URL" }).Value
    $supabaseKey = ($envContent | Where-Object { $_.Key -eq "SUPABASE_SERVICE_KEY" }).Value
    $supabaseUserId = ($envContent | Where-Object { $_.Key -eq "SUPABASE_USER_ID" }).Value
    
    if (-not $seuEmail) {
        $seuEmail = Read-Host "Digite EMAIL"
    }
    if (-not $seuPassword) {
        $seuPassword = Read-Host "Digite PASSWORD" -AsSecureString | ConvertFrom-SecureString -AsPlainText
    }
    if (-not $supabaseUrl) {
        $supabaseUrl = "https://lroxouwlciplbvitqzmh.supabase.co"
    }
    if (-not $supabaseKey) {
        $supabaseKey = Read-Host "Digite SUPABASE_SERVICE_KEY"
    }
    if (-not $supabaseUserId) {
        $supabaseUserId = "default-user"
    }
    
    Write-Host "`n🔐 Adicionando secrets ao GitHub..." -ForegroundColor Yellow
    
    # Usar a API moderna do GitHub Actions
    $apiUrl = "https://api.github.com/repos/$REPO/actions/secrets"
    
    # Obter public key
    $keyUrl = "https://api.github.com/repos/$REPO/actions/secrets/public-key"
    $keyResponse = Invoke-RestMethod -Uri $keyUrl -Headers $headers -Method Get
    
    # Função para criptografar valor
    function Encrypt-Secret {
        param($Value)
        
        # Usar Python para criptografar (mais simples)
        $pythonScript = @"
import base64
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization, hashes
import sys

public_key = """ + $keyResponse.key + @"""
value = """ + $Value + @"""

# Carregar public key
pub_key = serialization.load_pem_public_key(public_key.encode())

# Criptografar
encrypted = pub_key.encrypt(
    value.encode(),
    padding.OAEP(
        mgf=padding.MGF1(algorithm=hashes.SHA256()),
        algorithm=hashes.SHA256(),
        label=None
    )
)

print(base64.b64encode(encrypted).decode())
"@
        
        $result = python -c $pythonScript 2>&1
        if ($LASTEXITCODE -eq 0) {
            return $result.Trim()
        } else {
            return $null
        }
    }
    
    # Adicionar secrets
    $secrets = @{
        "EMAIL" = $seuEmail
        "PASSWORD" = $seuPassword
        "VITE_SUPABASE_URL" = $supabaseUrl
        "SUPABASE_SERVICE_KEY" = $supabaseKey
        "SUPABASE_USER_ID" = $supabaseUserId
    }
    
    foreach ($secret in $secrets.GetEnumerator()) {
        $encrypted = Encrypt-Secret -Value $secret.Value
        if ($encrypted) {
            $body = @{
                encrypted_value = $encrypted
                key_id = $keyResponse.key_id
            } | ConvertTo-Json
            
            $url = "https://api.github.com/repos/$REPO/actions/secrets/$($secret.Key)"
            try {
                $response = Invoke-RestMethod -Uri $url -Headers $headers -Method Put -Body $body -ContentType "application/json"
                Write-Host "✅ Secret '$($secret.Key)' adicionado" -ForegroundColor Green
            } catch {
                Write-Host "❌ Erro ao adicionar '$($secret.Key)': $_" -ForegroundColor Red
            }
        } else {
            Write-Host "⚠️  Não foi possível criptografar '$($secret.Key)'" -ForegroundColor Yellow
        }
    }
    
    Write-Host "`n✅ Configuração de secrets concluída!" -ForegroundColor Green
} else {
    Write-Host "❌ Arquivo .env não encontrado" -ForegroundColor Red
}
