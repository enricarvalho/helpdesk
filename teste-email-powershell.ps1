# Teste PowerShell para API de email

# 1. Login para obter token
Write-Host "🧪 Testando API de configuração de email..." -ForegroundColor Green
Write-Host ""

Write-Host "1. Fazendo login..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@deskhelp.com"
    senha = "123456"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/users/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "✅ Login realizado com sucesso" -ForegroundColor Green
    Write-Host "Token: $($token.Substring(0,20))..." -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erro no login: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 2. Buscar configuração de email
Write-Host ""
Write-Host "2. Buscando configuração de email..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $emailConfig = Invoke-RestMethod -Uri "http://localhost:5000/api/email-config" -Method GET -Headers $headers
    Write-Host "✅ Configuração obtida com sucesso" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "📧 Detalhes da configuração:" -ForegroundColor Cyan
    Write-Host "  Email habilitado: $($emailConfig.emailEnabled)"
    Write-Host "  Serviço: $($emailConfig.emailService)"
    Write-Host "  Usuário: $($emailConfig.emailUser)"
    Write-Host "  Templates disponíveis: $($emailConfig.templates.PSObject.Properties.Name -join ', ')"
    
    Write-Host ""    Write-Host "📧 Verificação de templates:" -ForegroundColor Cyan
    foreach ($templateName in $emailConfig.templates.PSObject.Properties.Name) {
        $template = $emailConfig.templates.$templateName
        $assuntoLength = if ($template.assunto) { $template.assunto.Length } else { 0 }
        $corpoLength = if ($template.corpo) { $template.corpo.Length } else { 0 }
        
        Write-Host "  ${templateName}:"
        Write-Host "    Assunto: $($assuntoLength) caracteres"
        Write-Host "    Corpo: $($corpoLength) caracteres"
        
        if ($assuntoLength -eq 0) {
            Write-Host "    ⚠️  ASSUNTO VAZIO!" -ForegroundColor Red
        }
        if ($corpoLength -eq 0) {
            Write-Host "    ⚠️  CORPO VAZIO!" -ForegroundColor Red
        }
    }
    
} catch {
    Write-Host "❌ Erro ao buscar configuração: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Detalhes: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

# 3. Testar salvamento de template
Write-Host ""
Write-Host "3. Testando salvamento de template..." -ForegroundColor Yellow

$saveBody = @{
    emailEnabled = $true
    emailService = "gmail"
    emailUser = "teste@exemplo.com"
    emailPassword = "senha-teste"
    templates = @{
        novoChamado = @{
            assunto = "TESTE - Novo Chamado #{numeroChamado}"
            corpo = "<p>Este é um teste de template.</p>"
        }
    }
} | ConvertTo-Json -Depth 10

try {
    $saveResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/email-config" -Method PUT -Body $saveBody -Headers $headers
    Write-Host "✅ Configuração salva com sucesso" -ForegroundColor Green
    
    # Verificar se realmente salvou
    Write-Host ""
    Write-Host "4. Verificando se salvou..." -ForegroundColor Yellow
    $configVerifica = Invoke-RestMethod -Uri "http://localhost:5000/api/email-config" -Method GET -Headers $headers
    Write-Host "📧 Template novoChamado após salvamento:"
    Write-Host "  Assunto: $($configVerifica.templates.novoChamado.assunto)"
    Write-Host "  Corpo: $($configVerifica.templates.novoChamado.corpo)"
    
} catch {
    Write-Host "❌ Erro ao salvar: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🏁 Teste concluído!" -ForegroundColor Green
