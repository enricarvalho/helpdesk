const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  senha: { type: String, required: true },
  departamento: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  fotoPerfil: { type: String },
  criadoEm: { type: Date, default: Date.now },
  tokenCadastro: { type: String },
  senhaTemporaria: { type: Boolean, default: false } // Indica se é senha temporária
});

module.exports = mongoose.model('User', userSchema);
