require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

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

// Rotas de exemplo
app.get('/', (req, res) => {
  res.send('API DeskHelp rodando!');
});

// Exporta io para uso nas rotas (antes de importar as rotas)
module.exports.io = io;

// Rotas
app.use('/api/users', require('./routes/users'));
app.use('/api/chamados', require('./routes/chamados'));
app.use('/api/departamentos', require('./routes/departamentos'));
app.use('/api/email-config', require('./routes/emailConfig')); // Reativado - sistema de email habilitado

// Socket.IO conexão básica
io.on('connection', (socket) => {
  const email = socket.handshake.query.email;
  if (email) {
    socket.join(email); // Cada usuário entra em uma sala com seu email
  }
  // Permitir que o frontend peça para entrar em uma room personalizada
  socket.on('joinRoom', (room) => {
    if (room) socket.join(room);
  });
  console.log('Novo cliente conectado:', socket.id, 'email:', email);
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Conexão MongoDB
const PORT = process.env.PORT || 5000;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/deskhelp';

mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
  })
  .catch(err => console.error('Erro ao conectar no MongoDB:', err));
