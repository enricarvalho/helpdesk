// Script de teste para verificar se o backend pode ser iniciado
console.log('🚀 Iniciando teste do backend...');

try {
  require('dotenv').config();
  console.log('✅ dotenv carregado');
  
  const express = require('express');
  console.log('✅ express carregado');
  
  const mongoose = require('mongoose');
  console.log('✅ mongoose carregado');
  
  const cors = require('cors');
  console.log('✅ cors carregado');
  
  const http = require('http');
  console.log('✅ http carregado');
  
  const { Server } = require('socket.io');
  console.log('✅ socket.io carregado');
  
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    },
  });
  
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ limit: '2mb', extended: true }));
  
  app.get('/', (req, res) => {
    res.send('API DeskHelp Test OK!');
  });
  
  const PORT = process.env.PORT || 5000;
  
  // Tenta conectar sem MongoDB primeiro
  server.listen(PORT, () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
    console.log('🌐 Teste em: http://localhost:' + PORT);
  });
  
} catch (error) {
  console.error('❌ Erro ao iniciar:', error.message);
  console.error('Stack:', error.stack);
}
