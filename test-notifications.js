const io = require('socket.io-client');

// Simula dois usuários conectados
console.log('=== TESTE DE NOTIFICAÇÕES DESKHELP ===\n');

// Conecta como admin
console.log('🔗 Tentando conectar sockets...');
const adminSocket = io('http://localhost:5000', {
  timeout: 5000,
  transports: ['websocket', 'polling']
});
const userSocket = io('http://localhost:5000', {
  timeout: 5000,
  transports: ['websocket', 'polling']
});

adminSocket.on('connect', () => {
  console.log('✅ Admin conectado:', adminSocket.id);
  
  // Simula autenticação do admin
  adminSocket.emit('user_connected', {
    userId: '638888000f3eedd4f7a8549e8', // ID fictício do admin
    email: 'admin@deskhelp.com'
  });
});

adminSocket.on('connect_error', (error) => {
  console.error('❌ Erro de conexão Admin:', error.message);
});

adminSocket.on('disconnect', (reason) => {
  console.log('⚠️ Admin desconectado:', reason);
});

userSocket.on('connect', () => {
  console.log('✅ Usuário conectado:', userSocket.id);
  
  // Simula autenticação do usuário
  userSocket.emit('user_connected', {
    userId: '638888c26f3eedd4f7a8549e8', // ID fictício do usuário
    email: 'usuario@deskhelp.com'
  });
});

userSocket.on('connect_error', (error) => {
  console.error('❌ Erro de conexão Usuário:', error.message);
});

userSocket.on('disconnect', (reason) => {
  console.log('⚠️ Usuário desconectado:', reason);
});

// Escuta notificações do admin
adminSocket.on('notificacao_personalizada', (data) => {
  console.log('🔔 ADMIN recebeu notificação:', data);
});

// Escuta notificações do usuário
userSocket.on('notificacao_personalizada', (data) => {
  console.log('🔔 USUÁRIO recebeu notificação:', data);
});

// Escuta atualizações de chamados
adminSocket.on('chamado_modificado', (data) => {
  console.log('📋 ADMIN - Chamado modificado:', data._id, '-', data.titulo);
});

userSocket.on('chamado_modificado', (data) => {
  console.log('📋 USUÁRIO - Chamado modificado:', data._id, '-', data.titulo);
});

// Aguarda 2 segundos e então cria um chamado via API
setTimeout(async () => {
  console.log('\n⏳ Criando chamado de teste...');
  
  try {
    const fetch = require('node-fetch');
    
    // Primeiro faz login para obter token
    const loginResponse = await fetch('http://localhost:5000/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'usuario@deskhelp.com',
        senha: 'User123!'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('🔑 Login realizado, token obtido');
    
    // Cria chamado
    const chamadoResponse = await fetch('http://localhost:5000/api/chamados', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.token}`
      },
      body: JSON.stringify({
        titulo: 'Teste de notificação Socket.io',
        descricao: 'Verificando se as notificações em tempo real estão funcionando',
        prioridade: 'Alta',
        departamento: 'TI',
        categoria: 'Teste'
      })
    });
    
    if (chamadoResponse.ok) {
      const chamadoData = await chamadoResponse.json();
      console.log('✅ Chamado criado:', chamadoData.numeroChamado, '-', chamadoData.titulo);
    } else {
      const error = await chamadoResponse.text();
      console.log('❌ Erro ao criar chamado:', error);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}, 2000);

// Encerra teste após 10 segundos
setTimeout(() => {
  console.log('\n📊 Teste finalizado');
  adminSocket.disconnect();
  userSocket.disconnect();
  process.exit(0);
}, 10000);
