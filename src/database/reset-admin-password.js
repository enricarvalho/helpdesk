require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

console.log('Iniciando reset de senha...');

async function resetAdminPassword() {
  try {
    console.log('Resetando senha do admin...');
    await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/deskhelp');
    console.log('Conectado ao MongoDB');

    // Buscar o usuário admin
    const user = await User.findOne({ email: 'admin@deskhelp.com' });
    if (!user) {
      console.log('❌ Usuário admin não encontrado');
      return;
    }

    // Resetar senha para '123456'
    const senhaHash = await bcrypt.hash('123456', 10);
    user.senha = senhaHash;
    await user.save();

    console.log('✅ Senha resetada com sucesso!');
    console.log('Email: admin@deskhelp.com');
    console.log('Nova Senha: 123456');

    // Testar a nova senha
    const senhaValida = await bcrypt.compare('123456', user.senha);
    console.log('✅ Teste da nova senha:', senhaValida);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    mongoose.disconnect();
  }
}

resetAdminPassword();
