// Teste simples para verificar modelo EmailConfig

require('dotenv').config();
const mongoose = require('mongoose');
const EmailConfig = require('./models/EmailConfig');

async function testeModelo() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado ao MongoDB');

    // Criar uma nova configuração
    console.log('\n🧪 Testando criação de nova configuração...');
    const novaConfig = new EmailConfig({
      emailUser: 'teste@exemplo.com',
      emailPassword: 'senha123',
      emailEnabled: true,
      criadoPor: new mongoose.Types.ObjectId()
    });

    console.log('📧 Templates padrão antes de salvar:');
    Object.entries(novaConfig.templates).forEach(([tipo, template]) => {
      console.log(`${tipo}:`);
      console.log(`  Assunto: "${template.assunto}" (${template.assunto?.length} chars)`);
      console.log(`  Corpo: ${template.corpo ? 'Presente' : 'Ausente'} (${template.corpo?.length} chars)`);
    });

    await novaConfig.save();
    console.log('\n✅ Configuração salva com sucesso!');

    // Buscar a configuração salva
    const configSalva = await EmailConfig.findById(novaConfig._id);
    console.log('\n📧 Templates após salvar no banco:');
    Object.entries(configSalva.templates).forEach(([tipo, template]) => {
      console.log(`${tipo}:`);
      console.log(`  Assunto: "${template.assunto}" (${template.assunto?.length} chars)`);
      console.log(`  Corpo: ${template.corpo ? 'Presente' : 'Ausente'} (${template.corpo?.length} chars)`);
    });

    // Limpar teste
    await EmailConfig.deleteOne({ _id: novaConfig._id });
    console.log('\n🧹 Configuração de teste removida');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado');
  }
}

testeModelo();
