const axios = require('axios');

async function testarTemplates() {
  try {
    console.log('🧪 Testando salvamento de templates...\n');

    // 1. Fazer login
    console.log('1. Fazendo login...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@admin.com',
      senha: '123456'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login realizado com sucesso\n');

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 2. Buscar configuração atual
    console.log('2. Buscando configuração atual...');
    const configAtual = await axios.get('http://localhost:5000/api/email-config', { headers });
    
    console.log('📧 Templates atuais:');
    Object.keys(configAtual.data.templates || {}).forEach(tipo => {
      const template = configAtual.data.templates[tipo];
      console.log(`  ${tipo}:`);
      console.log(`    Assunto: ${template.assunto ? template.assunto.substring(0, 50) + '...' : 'VAZIO'}`);
      console.log(`    Corpo: ${template.corpo ? template.corpo.substring(0, 50) + '...' : 'VAZIO'}`);
    });
    console.log('');

    // 3. Salvar um template de teste
    console.log('3. Salvando template de teste...');
    const novaConfig = {
      ...configAtual.data,
      templates: {
        ...configAtual.data.templates,
        novoChamado: {
          assunto: 'TESTE SALVAMENTO - Chamado #{numeroChamado}',
          corpo: '<p>Este é um teste de salvamento de template.</p><p>Data: ' + new Date().toISOString() + '</p>'
        }
      }
    };

    // Remove a senha para não enviá-la de volta
    delete novaConfig.emailPassword;
    novaConfig.emailPassword = '***configurado***';

    console.log('📤 Enviando dados:', JSON.stringify({
      templates: novaConfig.templates.novoChamado
    }, null, 2));

    const saveResponse = await axios.put('http://localhost:5000/api/email-config', novaConfig, { headers });
    console.log('✅ Configuração salva com sucesso\n');

    // 4. Verificar se realmente salvou
    console.log('4. Verificando se salvou...');
    const configVerifica = await axios.get('http://localhost:5000/api/email-config', { headers });
    
    console.log('📧 Template novoChamado após salvamento:');
    const templateSalvo = configVerifica.data.templates?.novoChamado;
    if (templateSalvo) {
      console.log(`  Assunto: ${templateSalvo.assunto || 'VAZIO'}`);
      console.log(`  Corpo: ${templateSalvo.corpo || 'VAZIO'}`);
      
      // Verificar se o conteúdo foi salvo corretamente
      if (templateSalvo.assunto && templateSalvo.assunto.includes('TESTE SALVAMENTO')) {
        console.log('✅ ASSUNTO FOI SALVO CORRETAMENTE!');
      } else {
        console.log('❌ ASSUNTO NÃO FOI SALVO!');
      }
      
      if (templateSalvo.corpo && templateSalvo.corpo.includes('teste de salvamento')) {
        console.log('✅ CORPO FOI SALVO CORRETAMENTE!');
      } else {
        console.log('❌ CORPO NÃO FOI SALVO!');
      }
    } else {
      console.log('❌ TEMPLATE NÃO ENCONTRADO!');
    }

  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

testarTemplates();
