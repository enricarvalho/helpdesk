require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const jwt = require('jsonwebtoken');

async function testLogin() {
  try {
    console.log('Iniciando teste de login...');
    await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/deskhelp');
    console.log('Conectado ao MongoDB');

    // Buscar o usuário admin
    const user = await User.findOne({ email: 'admin@deskhelp.com' });
    if (!user) {
      console.log('❌ Usuário não encontrado');
      return;
    }

    console.log('✅ Usuário encontrado:', user.email);
    console.log('✅ É Admin:', user.isAdmin);

    // Testar senha
    const senhaValida = await bcrypt.compare('123456', user.senha);
    console.log('✅ Senha válida:', senhaValida);

    if (senhaValida) {
      const token = jwt.sign(
        { id: user._id, email: user.email, isAdmin: user.isAdmin },
        process.env.JWT_SECRET || 'deskhelpsecret',
        { expiresIn: '7d' }
      );
      console.log('✅ Token gerado:', token);
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    mongoose.disconnect();
  }
}

testLogin();
