const io = require('socket.io-client');

console.log('=== TESTE SIMPLES DE SOCKET.IO ===');

const socket = io('http://localhost:5000');

socket.on('connect', () => {
  console.log('✅ Conectado ao servidor Socket.io:', socket.id);
  
  // Simula entrada em uma sala de usuário
  socket.emit('user_connected', {
    userId: 'test123',
    email: 'test@example.com'
  });
  
  console.log('📤 Evento user_connected enviado');
});

socket.on('disconnect', () => {
  console.log('❌ Desconectado do servidor');
});

socket.on('notificacao_personalizada', (data) => {
  console.log('🔔 Notificação recebida:', data);
});

socket.on('chamado_modificado', (data) => {
  console.log('📋 Chamado modificado:', data);
});

socket.on('connect_error', (error) => {
  console.error('❌ Erro de conexão:', error.message);
});

// Encerra após 5 segundos
setTimeout(() => {
  console.log('🔚 Encerrando teste');
  socket.disconnect();
  process.exit(0);
}, 5000);
