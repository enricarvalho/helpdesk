const http = require('http');

async function testarAuth() {
  console.log('🔐 Testando apenas autenticação...');
  
  // 1. Fazer login
  const loginData = JSON.stringify({
    email: 'usuario@deskhelp.com',
    senha: 'User123!'
  });

  const loginOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/users/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': loginData.length
    }
  };

  console.log('📡 Fazendo login...');
  const result = await new Promise((resolve, reject) => {
    const req = http.request(loginOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log(`📊 Status do login: ${res.statusCode}`);
        console.log(`📝 Resposta do login: "${body}"`);
        
        if (res.statusCode >= 400) {
          reject(new Error(`Login falhou: HTTP ${res.statusCode}: ${body}`));
          return;
        }
        
        try {
          const data = JSON.parse(body);
          console.log('✅ Login bem-sucedido, token recebido');
          resolve(data);
        } catch (e) {
          console.log('❌ Erro ao parsear resposta do login');
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(loginData);
    req.end();
  });

  console.log('🔍 Testando rota protegida sem dados...');
  
  // 2. Testar rota protegida apenas com token
  const testOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/chamados',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${result.token}`
    }
  };

  await new Promise((resolve, reject) => {
    const req = http.request(testOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log(`📊 Status da listagem: ${res.statusCode}`);
        console.log(`📝 Resposta da listagem: "${body.substring(0, 200)}..."`);
        resolve();
      });
    });
    req.on('error', reject);
    req.end();
  });
}

testarAuth().catch(console.error);
