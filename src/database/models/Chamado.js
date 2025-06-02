const mongoose = require('mongoose');

const chamadoSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  descricao: { type: String, required: true },
  prioridade: { type: String, enum: ['Baixa', 'Média', 'Alta', 'Urgente'], default: 'Média' },
  status: { type: String, default: 'Aberto' },
  responsavel: { type: String },
  atribuido: { type: String },
  departamento: { type: String },
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  historico: {
    type: [{
      data: String,
      autor: String, // campo explicitamente definido
      texto: String,
      anexos: [
        {
          anexo: String, // base64 ou url
          anexoNome: String,
          anexoTipo: String,
          anexoTamanho: Number
        }
      ]
    }],
    default: []
  },
  avaliacao: {
    nota: Number,
    comentario: String
  },
  criadoEm: { type: Date, default: Date.now },
  categoria: { type: String }, // Novo campo adicionado
  comentarioResolucao: { type: String }, // Novo campo para a solução do chamado
  numeroChamado: { type: String } // Número visível do chamado
});

module.exports = mongoose.model('Chamado', chamadoSchema);
