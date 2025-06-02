// Teste HTTP simples para API de email

const http = require('http');

function fazerRequisicao(path, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers.Authorization = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsedData });
        } catch (error) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testeAPI() {
  try {
    console.log('🧪 Testando API de configuração de email...\n');

    // 1. Login
    console.log('1. Fazendo login...');
    const loginResult = await fazerRequisicao('/api/auth/login', 'POST', {
      email: 'admin@admin.com',
      senha: 'admin123'
    });

    if (loginResult.status !== 200) {
      console.log('❌ Erro no login:', loginResult);
      return;
    }

    const token = loginResult.data.token;
    console.log('✅ Login realizado com sucesso');

    // 2. Buscar configuração
    console.log('\n2. Buscando configuração de email...');
    const configResult = await fazerRequisicao('/api/email-config', 'GET', null, token);
    
    console.log('📧 Status da resposta:', configResult.status);
    if (configResult.status === 200) {
      console.log('✅ Configuração obtida');
      console.log('📧 Email habilitado:', configResult.data.emailEnabled);
      console.log('📧 Templates disponíveis:', Object.keys(configResult.data.templates || {}));
      
      // Verificar conteúdo dos templates
      Object.entries(configResult.data.templates || {}).forEach(([tipo, template]) => {
        console.log(`\n📧 ${tipo}:`);
        console.log(`  Assunto: "${template.assunto || 'VAZIO'}" (${(template.assunto || '').length} chars)`);
        console.log(`  Corpo: ${template.corpo ? 'Configurado' : 'VAZIO'} (${(template.corpo || '').length} chars)`);
      });
    } else {
      console.log('❌ Erro ao buscar configuração:', configResult);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testeAPI();
