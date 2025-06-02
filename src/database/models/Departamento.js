const mongoose = require('mongoose');

const departamentoSchema = new mongoose.Schema({
  nome: { type: String, required: true, unique: true },
  criadoEm: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Departamento', departamentoSchema);
