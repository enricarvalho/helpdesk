# 📧 Configuração do Sistema de Email - DeskHelp

## Visão Geral

O DeskHelp possui um sistema completo de notificações por email que complementa as notificações em tempo real via Socket.io. O sistema envia emails para:

- **Novos chamados** → Notifica todos os administradores
- **Comentários** → Notifica bidireccionalmente (usuário ↔ admin/responsável)
- **Atribuições/Transferências** → Notifica o responsável atribuído
- **Finalizações** → Notifica o usuário que criou o chamado

## 🔧 Configuração

### 1. Configurar Variáveis de Ambiente

Edite o arquivo `.env` na pasta `database`:

```env
# Configurações de Email
ENABLE_EMAIL_NOTIFICATIONS=true
EMAIL_SERVICE=gmail
EMAIL_USER=seu-email@gmail.com
EMAIL_PASSWORD=sua-senha-de-app
EMAIL_FROM=DeskHelp <noreply@deskhelp.com>

# URL do frontend (para links nos emails)
FRONTEND_URL=http://localhost:3000
```

### 2. Configuração para Gmail

Para usar o Gmail, você precisa:

1. **Ativar Autenticação em 2 Fatores** na sua conta Google
2. **Gerar uma Senha de App**:
   - Acesse: [Google Account Security](https://myaccount.google.com/security)
   - Clique em "Senhas de app"
   - Selecione "Mail" e "Windows Computer"
   - Use a senha gerada no campo `EMAIL_PASSWORD`

⚠️ **IMPORTANTE**: Nunca use sua senha normal do Gmail!

### 3. Configuração para SMTP Personalizado

Se preferir usar outro provedor de email:

```env
# Desabilite o Gmail
EMAIL_SERVICE=smtp

# Configure SMTP
SMTP_HOST=smtp.seuservidor.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=seu-email@seudominio.com
EMAIL_PASSWORD=sua-senha
```

## 🧪 Testar Configuração

Execute o script de teste para verificar se tudo está funcionando:

```bash
cd database
node test-email.js
```

O teste verifica:
- ✅ Configuração das variáveis de ambiente
- ✅ Geração dos templates de email
- ✅ Conectividade com servidor de email

## 📋 Templates de Email

O sistema inclui templates profissionais para:

### 🎫 Novo Chamado
- Enviado para todos os administradores
- Inclui detalhes completos do chamado
- Link direto para visualização

### 💬 Comentários
- Notificação bidirecional
- Design diferente para admin vs usuário
- Contexto do comentário

### 👤 Atribuição/Transferência
- Notifica o responsável atribuído
- Distingue entre nova atribuição e transferência
- Informações de prioridade

### ✅ Finalização
- Notifica o criador do chamado
- Inclui solução (se disponível)
- Convite para avaliação

## 🔄 Integração no Sistema

O sistema está integrado em todas as rotas de chamados:

```javascript
// Exemplo de uso
await notificarNovoChamadoPorEmail(chamado, usuario, admins);
await notificarComentarioPorEmail(chamado, autor, comentario, destinatarios);
await notificarAtribuicaoPorEmail(chamado, email, nome, isTransferencia);
await notificarFinalizacaoPorEmail(chamado, usuario, solucao);
```

## ⚡ Características

- **Fallback gracioso**: Se o email falhar, o sistema continua funcionando
- **Templates responsivos**: Emails otimizados para mobile e desktop
- **Configuração flexível**: Suporta Gmail, SMTP personalizado ou modo desenvolvimento
- **Logs detalhados**: Rastreamento de sucesso/falha de envios
- **Segurança**: Não expõe credenciais nos logs

## 🚨 Troubleshooting

### Erro "Username and Password not accepted"
- Verifique se está usando senha de app (não senha normal)
- Confirme que 2FA está ativado no Gmail

### Emails não chegam
- Verifique pasta de spam
- Confirme configurações de SMTP
- Teste conectividade com `node test-email.js`

### Erro "createTransporter is not a function"
- Reinstale nodemailer: `npm install nodemailer`
- Verifique versão do Node.js (recomendado: 14+)

### Modo Desenvolvimento
Para testar sem enviar emails reais:
```env
ENABLE_EMAIL_NOTIFICATIONS=false
```

## 📊 Monitoramento

O sistema registra logs detalhados:
- ✅ Emails enviados com sucesso
- ❌ Falhas de envio (com motivo)
- ⚠️ Warnings para configurações incompletas

Monitore os logs do servidor para acompanhar o funcionamento do sistema de email.
