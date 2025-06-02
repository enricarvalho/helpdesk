require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function createAdmin() {
  try {    await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/deskhelp', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Conectado ao MongoDB');

    // Verificar se já existe um admin
    const existingAdmin = await User.findOne({ email: 'admin@deskhelp.com' });
    if (existingAdmin) {
      console.log('Usuário admin já existe!');
      console.log('Email:', existingAdmin.email);
      console.log('É Admin:', existingAdmin.isAdmin);
      process.exit(0);
    }

    // Criar usuário admin
    const senhaHash = await bcrypt.hash('123456', 10);
    const admin = new User({
      nome: 'Administrador',
      email: 'admin@deskhelp.com',
      senha: senhaHash,
      isAdmin: true,
      tipo: 'admin',
      departamento: 'TI'
    });

    await admin.save();
    console.log('✅ Usuário admin criado com sucesso!');
    console.log('Email: admin@deskhelp.com');
    console.log('Senha: 123456');
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    mongoose.disconnect();
  }
}

createAdmin();
