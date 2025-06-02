// Teste simples da API de configuração de email

async function testarAPI() {
  try {
    console.log('🧪 Testando API de configuração de email...\n');

    // Primeiro, vamos fazer login para obter um token
    console.log('1. Fazendo login...');
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@admin.com',
        senha: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Erro no login: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login realizado com sucesso');

    // Testar buscar configuração
    console.log('\n2. Buscando configuração de email...');
    const configResponse = await fetch('http://localhost:5000/api/email-config', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!configResponse.ok) {
      throw new Error(`Erro ao buscar config: ${configResponse.status} - ${await configResponse.text()}`);
    }

    const config = await configResponse.json();
    console.log('✅ Configuração obtida:');
    console.log('- Email habilitado:', config.emailEnabled);
    console.log('- Serviço:', config.emailService);
    console.log('- Usuário:', config.emailUser);
    console.log('- Templates disponíveis:', Object.keys(config.templates));
    
    // Verificar se templates têm conteúdo
    console.log('\n📧 Verificação de templates:');
    Object.entries(config.templates).forEach(([tipo, template]) => {
      console.log(`${tipo}:`);
      console.log(`  - Assunto: ${template.assunto ? `"${template.assunto.slice(0, 50)}..."` : 'VAZIO'}`);
      console.log(`  - Corpo: ${template.corpo ? `${template.corpo.length} caracteres` : 'VAZIO'}`);
    });

    // Testar salvar uma configuração simples
    console.log('\n3. Testando salvamento...');
    const saveResponse = await fetch('http://localhost:5000/api/email-config', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        emailEnabled: true,
        emailService: 'gmail',
        emailUser: 'teste@exemplo.com',
        emailPassword: 'senha-teste',
        templates: {
          novoChamado: {
            assunto: 'TESTE - Novo Chamado #{numeroChamado}',
            corpo: '<p>Este é um teste de template.</p>'
          }
        }
      })
    });

    if (!saveResponse.ok) {
      throw new Error(`Erro ao salvar: ${saveResponse.status} - ${await saveResponse.text()}`);
    }

    console.log('✅ Configuração salva com sucesso');

    // Verificar se realmente salvou
    console.log('\n4. Verificando se salvou...');
    const verificaResponse = await fetch('http://localhost:5000/api/email-config', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const configVerifica = await verificaResponse.json();
    console.log('✅ Verificação:', {
      templateAssunto: configVerifica.templates.novoChamado.assunto,
      templateCorpo: configVerifica.templates.novoChamado.corpo?.slice(0, 50) + '...'
    });

    // Testar o envio de email de teste
    console.log('\n5. Testando envio de email...');
    const testResponse = await fetch('http://localhost:5000/api/email-config/test', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        destinatario: 'teste@exemplo.com'
      })
    });

    const testResult = await testResponse.json();
    console.log('📧 Resultado do teste de email:', testResult);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

// Verificar se fetch está disponível
if (typeof fetch === 'undefined') {
  const { default: fetch } = require('node-fetch');
  global.fetch = fetch;
}

testarAPI();
