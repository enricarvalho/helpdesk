// Test script para verificar conexão Socket.io
const io = require('socket.io-client');

console.log('Iniciando teste de conexão Socket.io...');

const socket = io('http://localhost:5000', {
  transports: ['websocket'],
  query: { email: 'admin@test.com' }
});

socket.on('connect', () => {
  console.log('✅ Socket.io conectado com sucesso!');
  console.log('Socket ID:', socket.id);
  
  // Teste de notificação
  socket.emit('teste', { mensagem: 'Teste de conexão' });
});

socket.on('connect_error', (error) => {
  console.log('❌ Erro de conexão:', error.message);
});

socket.on('notificacao_personalizada', (data) => {
  console.log('📧 Notificação recebida:', data);
});

socket.on('chamado_modificado', (data) => {
  console.log('🔄 Chamado modificado:', data);
});

socket.on('disconnect', () => {
  console.log('🔌 Socket desconectado');
});

// Mantém o script rodando por 10 segundos
setTimeout(() => {
  console.log('Encerrando teste...');
  socket.disconnect();
  process.exit(0);
}, 10000);
