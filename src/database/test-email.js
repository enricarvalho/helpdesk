// Script para testar notificações por email do DeskHelp
require('dotenv').config();
const {
  notificarNovoChamadoPorEmail,
  notificarComentarioPorEmail,
  notificarAtribuicaoPorEmail,
  notificarFinalizacaoPorEmail,
  enviarEmail,
  templateEmail
} = require('./services/emailService');

console.log('🧪 Teste de Notificações por Email - DeskHelp\n');

// Simula dados de teste
const dadosTeste = {
  chamado: {
    _id: '507f1f77bcf86cd799439011',
    numeroChamado: 'CH-0999',
    titulo: 'Teste de Email',
    descricao: 'Verificando se os emails estão sendo enviados corretamente',
    prioridade: 'Alta',
    departamento: 'TI',
    categoria: 'Teste',
    status: 'Aberto',
    criadoEm: new Date()
  },
  usuario: {
    nome: 'João Silva',
    email: 'joao.silva@empresa.com',
    departamento: 'Vendas'
  },
  admin: {
    nome: 'Admin Sistema',
    email: 'admin@empresa.com',
    departamento: 'TI'
  }
};

// Função para simular configuração de email
function verificarConfiguracaoEmail() {
  console.log('📧 Verificando configuração de email...');
  
  const configs = [
    { nome: 'ENABLE_EMAIL_NOTIFICATIONS', valor: process.env.ENABLE_EMAIL_NOTIFICATIONS },
    { nome: 'EMAIL_SERVICE', valor: process.env.EMAIL_SERVICE },
    { nome: 'EMAIL_USER', valor: process.env.EMAIL_USER ? '***configurado***' : 'não configurado' },
    { nome: 'EMAIL_PASSWORD', valor: process.env.EMAIL_PASSWORD ? '***configurado***' : 'não configurado' },
    { nome: 'EMAIL_FROM', valor: process.env.EMAIL_FROM },
    { nome: 'FRONTEND_URL', valor: process.env.FRONTEND_URL }
  ];
  
  configs.forEach(config => {
    const status = config.valor ? '✅' : '❌';
    console.log(`${status} ${config.nome}: ${config.valor || 'não definido'}`);
  });
  
  return configs.every(config => config.valor);
}

// Função para testar template de email
function testarTemplates() {
  console.log('\n📝 Testando templates de email...');
  
  try {
    // Testar template de novo chamado
    const templateNovoChamado = templateEmail.novoChamado(
      dadosTeste.chamado, 
      dadosTeste.usuario
    );
    console.log('✅ Template "novo chamado" gerado');
    console.log(`   Assunto: ${templateNovoChamado.assunto}`);
    
    // Testar template de comentário
    const templateComentario = templateEmail.comentarioChamado(
      dadosTeste.chamado,
      'Admin Sistema',
      'Olá! Estamos verificando sua solicitação. Em breve retornaremos com uma solução.',
      false
    );
    console.log('✅ Template "comentário" gerado');
    console.log(`   Assunto: ${templateComentario.assunto}`);
    
    // Testar template de atribuição
    const templateAtribuicao = templateEmail.chamadoAtribuido(
      dadosTeste.chamado,
      'Admin Sistema',
      false
    );
    console.log('✅ Template "atribuição" gerado');
    console.log(`   Assunto: ${templateAtribuicao.assunto}`);
    
    // Testar template de finalização
    const templateFinalizado = templateEmail.chamadoFinalizado(
      dadosTeste.chamado,
      'Problema resolvido através de reinicialização do sistema.'
    );
    console.log('✅ Template "finalização" gerado');    return true;
  } catch (error) {
    console.error('❌ Erro ao testar templates:', error.message);
    return false;
  }
}

// Função para testar envio de email (simulado)
async function testarEnvioEmail() {  console.log('\n📤 Testando envio de email...');
  
  try {
    // Simular envio para desenvolvimento (não envia email real)
    if (!process.env.ENABLE_EMAIL_NOTIFICATIONS) {
      console.log('⚠️ ENABLE_EMAIL_NOTIFICATIONS não está definido');
      console.log('   Emails não serão enviados (modo desenvolvimento)');
      return false;
    }
    
    if (process.env.ENABLE_EMAIL_NOTIFICATIONS === 'false') {
      console.log('📴 Notificações por email desabilitadas');
      return false;
    }
    
    // Verificar se tem Nodemailer
    try {
      require('nodemailer');
      console.log('✅ Nodemailer está disponível');
    } catch (e) {
      console.log('❌ Nodemailer não está instalado');
      console.log('   Execute: npm install nodemailer');
      return false;
    }
    
    console.log('🔄 Tentando enviar email de teste...');
    
    const resultado = await enviarEmail({
      destinatario: 'teste@exemplo.com',
      assunto: '🧪 Teste DeskHelp - Email de Configuração',
      html: `
        <h2>✅ Teste de Email Bem-sucedido!</h2>
        <p>Se você recebeu este email, as notificações do DeskHelp estão funcionando corretamente.</p>
        <p><strong>Data do teste:</strong> ${new Date().toLocaleString('pt-BR')}</p>
      `,
      texto: 'Teste de email do DeskHelp - Notificações funcionando!'
    });
    
    if (resultado.success) {
      console.log('✅ Email enviado com sucesso!');
      console.log(`   Message ID: ${resultado.messageId}`);
      return true;
    } else {
      console.log('❌ Falha ao enviar email:', resultado.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Erro no teste de envio:', error.message);
    return false;
  }
}

// Função principal do teste
async function executarTeste() {
  console.log('🚀 Iniciando teste completo de email...\n');
  
  let resultados = {
    configuracao: false,
    templates: false,
    envio: false
  };
  
  // Teste 1: Verificar configuração
  resultados.configuracao = verificarConfiguracaoEmail();
  
  // Teste 2: Verificar templates
  resultados.templates = testarTemplates();
  
  // Teste 3: Testar envio (apenas se configuração estiver OK)
  if (resultados.configuracao) {
    resultados.envio = await testarEnvioEmail();
  } else {
    console.log('\n⚠️ Pulando teste de envio (configuração incompleta)');
  }
  
  // Resumo final
  console.log('\n📊 RESUMO DO TESTE:');
  console.log(`   Configuração: ${resultados.configuracao ? '✅ OK' : '❌ Incompleta'}`);
  console.log(`   Templates: ${resultados.templates ? '✅ OK' : '❌ Erro'}`);
  console.log(`   Envio: ${resultados.envio ? '✅ OK' : '❌ Falha'}`);
  
  if (resultados.configuracao && resultados.templates && resultados.envio) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM! Sistema de email pronto para uso.');
  } else {
    console.log('\n⚠️ Alguns testes falharam. Verifique a configuração.');
    console.log('\n📋 PRÓXIMOS PASSOS:');
    if (!resultados.configuracao) {
      console.log('   1. Configure as variáveis de ambiente no arquivo .env');
      console.log('   2. Para Gmail: ative autenticação em 2 fatores e gere uma senha de app');
      console.log('   3. Defina ENABLE_EMAIL_NOTIFICATIONS=true');
    }
    if (!resultados.templates) {
      console.log('   1. Verifique se o arquivo emailService.js está correto');
      console.log('   2. Instale dependências: npm install nodemailer');
    }
    if (!resultados.envio) {
      console.log('   1. Verifique suas credenciais de email');
      console.log('   2. Para Gmail: use senha de app, não sua senha normal');
      console.log('   3. Verifique conexão com internet');
    }
  }
}

// Executar teste se chamado diretamente
if (require.main === module) {
  executarTeste().catch(console.error);
}

module.exports = { executarTeste, verificarConfiguracaoEmail, testarTemplates, testarEnvioEmail };

module.exports = { executarTeste, dadosTeste };
