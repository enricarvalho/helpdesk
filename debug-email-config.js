// Script para debugar problemas com configuração de email

require('dotenv').config({ path: './src/database/.env' });
const mongoose = require('mongoose');
const EmailConfig = require('./src/database/models/EmailConfig');

async function debugEmailConfig() {
  try {    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado ao MongoDB');

    // Buscar configuração atual
    const config = await EmailConfig.findOne().sort({ criadoEm: -1 });
    
    if (!config) {
      console.log('❌ Nenhuma configuração encontrada no banco');
      
      // Criar uma configuração padrão para teste
      const novaConfig = new EmailConfig({
        emailUser: 'teste@email.com',
        emailPassword: 'senha123',
        emailEnabled: true,
        criadoPor: new mongoose.Types.ObjectId()
      });
      
      await novaConfig.save();
      console.log('✅ Configuração padrão criada');
      console.log('Templates padrão:', JSON.stringify(novaConfig.templates, null, 2));
    } else {
      console.log('✅ Configuração encontrada:');
      console.log('Email habilitado:', config.emailEnabled);
      console.log('Serviço:', config.emailService);
      console.log('Usuário:', config.emailUser);
      console.log('Senha configurada:', config.emailPassword ? 'Sim' : 'Não');
      
      // Verificar estrutura dos templates
      console.log('\n📧 Templates disponíveis:');
      Object.entries(config.templates).forEach(([tipo, template]) => {
        console.log(`\n${tipo}:`);
        console.log(`  Assunto: "${template.assunto || 'VAZIO'}" (${template.assunto?.length || 0} chars)`);
        console.log(`  Corpo: ${template.corpo ? 'Configurado' : 'VAZIO'} (${template.corpo?.length || 0} chars)`);
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado do MongoDB');
  }
}

debugEmailConfig();
