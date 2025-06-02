// Script para atualizar todos os chamados antigos e garantir que todos tenham o campo numeroChamado
const mongoose = require('mongoose');
const Chamado = require('../models/Chamado');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/deskhelp';

async function atualizarNumeroChamado() {
  await mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
  const chamadosSemNumero = await Chamado.find({ $or: [ { numeroChamado: { $exists: false } }, { numeroChamado: null }, { numeroChamado: '' } ] });
  let count = 0;
  for (const chamado of chamadosSemNumero) {
    chamado.numeroChamado = 'C' + (chamado._id.getTimestamp().getTime ? chamado._id.getTimestamp().getTime() : Date.now());
    await chamado.save();
    count++;
  }
  console.log(`Atualizados ${count} chamados sem numeroChamado.`);
  await mongoose.disconnect();
}

atualizarNumeroChamado().catch(err => {
  console.error('Erro ao atualizar chamados:', err);
  process.exit(1);
});
