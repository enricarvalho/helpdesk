// Teste final da funcionalidade de templates
const axios = require('axios');

const baseURL = 'http://localhost:5000/api';

async function testarTemplates() {
  try {
    console.log('🧪 Testando salvamento de templates corrigido...\n');

    // 1. Login
    console.log('1. Fazendo login...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'admin@admin.com',
      senha: '123456'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login realizado com sucesso\n');

    // 2. Buscar configuração atual
    console.log('2. Buscando configuração atual...');
    const configResponse = await axios.get(`${baseURL}/email-config`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('✅ Configuração carregada');
    console.log('📧 Templates atuais:');
    Object.keys(configResponse.data.templates).forEach(tipo => {
      const template = configResponse.data.templates[tipo];
      console.log(`  ${tipo}:`);
      console.log(`    Assunto: ${template.assunto ? template.assunto.substring(0, 50) + '...' : 'VAZIO'}`);
      console.log(`    Corpo: ${template.corpo ? template.corpo.substring(0, 50) + '...' : 'VAZIO'}`);
    });
    console.log('');

    // 3. Testar salvamento de um template específico
    console.log('3. Testando salvamento do template "novoChamado"...');
    const novoTemplate = {
      emailEnabled: true,
      emailService: 'gmail',
      emailUser: 'teste@teste.com',
      templates: {
        novoChamado: {
          assunto: 'TESTE FINAL - Novo Chamado #{numeroChamado}',
          corpo: '<h1>Este é um teste FINAL do template</h1><p>Chamado: {titulo}</p>'
        }
      }
    };

    const saveResponse = await axios.put(`${baseURL}/email-config`, novoTemplate, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Template salvo com sucesso');

    // 4. Verificar se realmente salvou
    console.log('4. Verificando se salvou...');
    const verificaResponse = await axios.get(`${baseURL}/email-config`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const templateSalvo = verificaResponse.data.templates.novoChamado;
    console.log('📧 Template após salvamento:');
    console.log(`  Assunto: ${templateSalvo.assunto}`);
    console.log(`  Corpo: ${templateSalvo.corpo}`);

    if (templateSalvo.assunto === 'TESTE FINAL - Novo Chamado #{numeroChamado}' && 
        templateSalvo.corpo === '<h1>Este é um teste FINAL do template</h1><p>Chamado: {titulo}</p>') {
      console.log('\n🎉 SUCESSO! Template foi salvo corretamente!');
    } else {
      console.log('\n❌ FALHA! Template não foi salvo corretamente');
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error.response?.data || error.message);
  }
}

// Aguarda um pouco para o servidor iniciar e então executa o teste
setTimeout(testarTemplates, 3000);
