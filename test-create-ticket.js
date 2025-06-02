const http = require('http');

async function testarNotificacoes() {
  console.log('🚀 Iniciando teste de notificações...');
  
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

  const token = await new Promise((resolve, reject) => {
    const req = http.request(loginOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          console.log('✅ Login realizado com sucesso');
          resolve(data.token);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(loginData);
    req.end();
  });

  // 2. Criar chamado
  const chamadoData = JSON.stringify({
    titulo: 'Teste de notificação via API',
    descricao: 'Verificando se as notificações chegam aos administradores',
    prioridade: 'Alta',
    departamento: 'TI',
    categoria: 'Teste'
  });

  const chamadoOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/chamados',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': chamadoData.length,
      'Authorization': `Bearer ${token}`
    }
  };
  const chamado = await new Promise((resolve, reject) => {
    const req = http.request(chamadoOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log(`📊 Status da resposta: ${res.statusCode}`);
        console.log(`📝 Corpo da resposta: "${body}"`);
        
        if (res.statusCode >= 400) {
          console.log('❌ Erro HTTP:', res.statusCode);
          try {
            const errorData = JSON.parse(body);
            console.log('❌ Detalhes do erro:', errorData);
          } catch (e) {
            console.log('❌ Resposta não é JSON válido');
          }
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          return;
        }
        
        try {
          const data = JSON.parse(body);
          console.log('✅ Chamado criado:', data.numeroChamado, '-', data.titulo);
          resolve(data);
        } catch (e) {
          console.log('❌ Erro ao parsear JSON:', body);
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(chamadoData);
    req.end();
  });

  console.log('📋 Chamado ID:', chamado._id);
  return chamado;
}

testarNotificacoes().catch(console.error);
