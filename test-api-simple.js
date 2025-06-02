// Teste simples para verificar se as APIs estão funcionando
const http = require('http');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`${options.method} ${options.path} - Status: ${res.statusCode}`);
        try {
          const result = JSON.parse(body);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function testarAPIs() {
  console.log('🧪 Testando APIs do DeskHelp...\n');
  
  try {
    // 1. Testar endpoint principal
    const health = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/',
      method: 'GET'
    });
    console.log('✅ Health check:', health.data);
    
    // 2. Tentar login com usuário existente
    const loginData = JSON.stringify({
      email: 'usuario@deskhelp.com',
      senha: 'User123!'
    });
    
    const login = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': loginData.length
      }
    }, loginData);
    
    console.log('✅ Login resultado:', login.status === 200 ? 'Sucesso' : 'Falha');
    
    if (login.status === 200 && login.data.token) {
      console.log('🔑 Token obtido com sucesso');
      
      // 3. Criar chamado
      const chamadoData = JSON.stringify({
        titulo: 'Teste API - Chamado de teste',
        descricao: 'Testando criação de chamado via API HTTP',
        prioridade: 'Baixa',
        departamento: 'TI',
        categoria: 'Teste'
      });
      
      const chamado = await makeRequest({
        hostname: 'localhost',
        port: 5000,
        path: '/api/chamados',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': chamadoData.length,
          'Authorization': `Bearer ${login.data.token}`
        }
      }, chamadoData);
        console.log('📋 Chamado criado:', chamado.status === 201 ? 'Sucesso' : 'Falha');
      if (chamado.status === 201) {
        console.log('📋 Número do chamado:', chamado.data.numeroChamado);
        console.log('📋 Título:', chamado.data.titulo);
      } else {
        console.log('❌ Erro ao criar chamado (Status:', chamado.status, '):', chamado.data);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testarAPIs();
