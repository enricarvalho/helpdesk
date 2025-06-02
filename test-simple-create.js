// Teste simples de criação de chamado
const http = require('http');

async function testarCriacaoChamado() {
  console.log('🧪 Testando criação de chamado...\n');

  try {
    // 1. Login
    console.log('🔐 Fazendo login...');
    const loginData = JSON.stringify({
      email: 'admin@deskhelp.com',
      senha: '123456'
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
          console.log(`Status: ${res.statusCode}`);
          if (res.statusCode === 200) {
            const data = JSON.parse(body);
            console.log('✅ Login realizado com sucesso');
            resolve(data.token);
          } else {
            console.log('❌ Erro no login:', body);
            reject(new Error(`Login falhou: ${body}`));
          }
        });
      });
      req.on('error', reject);
      req.write(loginData);
      req.end();
    });

    // 2. Criar chamado
    console.log('\n🎫 Criando chamado...');
    const chamadoData = JSON.stringify({
      titulo: 'Teste de Notificação por Email',
      descricao: 'Este é um teste das notificações por email.',
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
          console.log(`Status: ${res.statusCode}`);
          console.log(`Resposta: ${body}`);
          
          if (res.statusCode === 201) {
            const data = JSON.parse(body);
            console.log(`✅ Chamado criado: ${data.numeroChamado} - ${data.titulo}`);
            resolve(data);
          } else {
            console.log('❌ Erro ao criar chamado');
            reject(new Error(`Erro ao criar chamado: ${body}`));
          }
        });
      });
      req.on('error', (error) => {
        console.log('❌ Erro de conexão:', error.message);
        reject(error);
      });
      req.write(chamadoData);
      req.end();
    });

    console.log('\n🎉 Teste concluído com sucesso!');
    console.log('📧 Verifique os logs do backend para confirmar o envio de email');

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testarCriacaoChamado();
