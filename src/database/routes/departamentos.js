const express = require('express');
const Departamento = require('../models/Departamento');
const auth = require('../middleware/auth');

const router = express.Router();

// Criar departamento (apenas admin)
router.post('/', auth, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Acesso restrito a administradores.' });
  try {
    const { nome } = req.body;
    const existe = await Departamento.findOne({ nome });
    if (existe) return res.status(400).json({ error: 'Departamento já existe.' });
    const departamento = new Departamento({ nome });
    await departamento.save();
    res.status(201).json(departamento);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar departamento.' });
  }
});

// Listar departamentos (autenticado)
router.get('/', auth, async (req, res) => {
  try {
    const departamentos = await Departamento.find();
    res.json(departamentos);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar departamentos.' });
  }
});

// Remover departamento (apenas admin)
router.delete('/:nome', auth, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Acesso restrito a administradores.' });
  try {
    const { nome } = req.params;
    const removido = await Departamento.findOneAndDelete({ nome });
    if (!removido) return res.status(404).json({ error: 'Departamento não encontrado.' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover departamento.' });
  }
});

module.exports = router;
