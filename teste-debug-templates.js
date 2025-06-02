const fetch = require('node-fetch');

async function testarTemplates() {
  try {
    console.log('🧪 Testando carregamento de templates...\n');
    
    // 1. Fazer login para obter token
    console.log('1. Fazendo login...');
    const loginResponse = await fetch('http://localhost:5000/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },      body: JSON.stringify({
        email: 'admin@deskhelp.com',
        senha: '123456'
      })
    });
    
    const loginData = await loginResponse.json();
    if (!loginData.token) {
      throw new Error('Falha no login: ' + JSON.stringify(loginData));
    }
    console.log('✅ Login realizado com sucesso');
    
    // 2. Buscar configurações de email
    console.log('\n2. Buscando configurações de email...');
    const configResponse = await fetch('http://localhost:5000/api/email-config', {
      headers: { 
        'Authorization': `Bearer ${loginData.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const configData = await configResponse.json();
    
    console.log('\n📧 Resposta da API:');
    console.log('Status:', configResponse.status);
    console.log('Headers:', Object.fromEntries(configResponse.headers));
    
    if (configData.templates) {
      console.log('\n📝 Templates encontrados:');
      Object.keys(configData.templates).forEach(tipo => {
        const template = configData.templates[tipo];
        console.log(`\n${tipo}:`);
        console.log(`  - Assunto: ${template.assunto ? `"${template.assunto.substring(0, 100)}..."` : 'VAZIO'}`);
        console.log(`  - Corpo: ${template.corpo ? `${template.corpo.length} caracteres` : 'VAZIO'}`);
      });
    } else {
      console.log('❌ Nenhum template encontrado na resposta!');
    }
    
    console.log('\n📊 Resumo da resposta:');
    console.log(JSON.stringify(configData, null, 2));
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Executar teste
testarTemplates();
