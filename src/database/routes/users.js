const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const multer = require('multer');
const sharp = require('sharp');
const crypto = require('crypto');

const router = express.Router();

// Multer para upload de foto de perfil (até 2MB)
const upload = multer({
  limits: { fileSize: 2 * 1024 * 1024 },
  storage: multer.memoryStorage(),
});

// Registrar novo usuário
router.post('/register', async (req, res) => {
  try {
    let { nome, email, senha, departamento, isAdmin } = req.body;
    const existe = await User.findOne({ email });
    if (existe) return res.status(400).json({ error: 'E-mail já cadastrado.' });
    const hash = await bcrypt.hash(senha, 10);
    const tokenCadastro = crypto.randomBytes(32).toString('hex');
    if (departamento === 'TI') isAdmin = true;
    else isAdmin = false;
    // Sempre senha temporária no cadastro
    const user = new User({ nome, email, senha: hash, departamento, isAdmin, tokenCadastro, senhaTemporaria: true });
    await user.save();
    res.status(201).json({ message: 'Usuário criado com sucesso!', tokenCadastro });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao registrar usuário.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Usuário não encontrado.' });
    const ok = await bcrypt.compare(senha, user.senha);
    if (!ok) return res.status(400).json({ error: 'Senha inválida.' });
    // Inclui email no payload do JWT
    const token = jwt.sign({ id: user._id, isAdmin: user.isAdmin, email: user.email }, process.env.JWT_SECRET || 'segredo', { expiresIn: '8h' });
    // Garante que senhaTemporaria seja false após troca de senha
    if (user.senhaTemporaria && !user.tokenCadastro) {
      user.senhaTemporaria = false;
      await user.save();
    }
    res.json({
      token,
      user: {
        _id: user._id,
        nome: user.nome,
        email: user.email,
        departamento: user.departamento,
        isAdmin: user.isAdmin,
        fotoPerfil: user.fotoPerfil,
        senhaTemporaria: user.senhaTemporaria // frontend pode forçar troca de senha
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro no login.' });
  }
});

// Listar todos os usuários (admin)
router.get('/', auth, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Acesso restrito a administradores.' });
  try {
    const users = await User.find().select('-senha');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar usuários.' });
  }
});

// Buscar usuário por tokenCadastro (para página de finalização)
router.get('/finalizar/:token', async (req, res) => {
  try {
    const userFinalizacao = await User.findOne({ tokenCadastro: req.params.token });
    if (!userFinalizacao) return res.status(404).json({ error: 'Token inválido ou expirado.' });
    res.json({ email: userFinalizacao.email, departamento: userFinalizacao.departamento });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar usuário.' });
  }
});

// Finalizar cadastro: troca senha temporária por nova senha
router.post('/finalizar/:token', async (req, res) => {
  try {
    const { senhaTemp, novaSenha } = req.body;
    const userFinalizacao = await User.findOne({ tokenCadastro: req.params.token });
    if (!userFinalizacao) return res.status(404).json({ error: 'Token inválido ou expirado.' });
    const ok = await bcrypt.compare(senhaTemp, userFinalizacao.senha);
    if (!ok) return res.status(400).json({ error: 'Senha temporária incorreta.' });
    userFinalizacao.senha = await bcrypt.hash(novaSenha, 10);
    userFinalizacao.tokenCadastro = undefined;
    userFinalizacao.senhaTemporaria = false;
    await userFinalizacao.save();
    res.json({ message: 'Cadastro finalizado com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao finalizar cadastro.' });
  }
});

// Endpoint para retornar o usuário autenticado (qualquer usuário)
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-senha');
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar usuário autenticado.' });
  }
});

// Atualizar usuário (admin ou próprio usuário)
router.put('/:id', auth, upload.single('fotoPerfil'), async (req, res) => {
  try {
    if (req.user.id !== req.params.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }
    let body = req.body;
    // Corrige para multipart/form-data: req.body pode ser objeto ou string
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    // LOG DE DEPURAÇÃO
    console.log('REQ.BODY:', body);
    // Garante que senhaAtual seja lida corretamente
    const senhaAtual = body.senhaAtual || (req.body && req.body.senhaAtual);
    const permitido = ['nome', 'departamento', 'isAdmin', 'email'];
    const atualizacoes = {};
    for (const campo of permitido) {
      if (body[campo] !== undefined) {
        atualizacoes[campo] = body[campo];
      }
    }    // Lógica corrigida: só altera isAdmin se explicitamente definido ou se for criação de usuário TI
    // Para perfis existentes, mantém o isAdmin atual a menos que seja explicitamente alterado
    if (atualizacoes.departamento === 'TI' && body.isAdmin !== false) {
      // Se mudou para TI e não foi explicitamente definido como false, mantém como admin
      if (atualizacoes.isAdmin === undefined) {
        atualizacoes.isAdmin = true;
      }
    } else if (atualizacoes.departamento && atualizacoes.departamento !== 'TI' && body.isAdmin === undefined) {
      // Se mudou para departamento não-TI e isAdmin não foi explicitamente definido, mantém o valor atual
      delete atualizacoes.isAdmin; // Remove da atualização para manter valor existente
    }
    if (req.file) {
      const webpBuffer = await sharp(req.file.buffer).resize(256, 256, { fit: 'cover' }).webp({ quality: 80 }).toBuffer();
      atualizacoes.fotoPerfil = `data:image/webp;base64,${webpBuffer.toString('base64')}`;
    } else if (body.fotoPerfil && body.fotoPerfil.startsWith('data:image/')) {
      atualizacoes.fotoPerfil = body.fotoPerfil;
    }
    // Alteração de senha
    if (body.senha) {
      if (req.user.isAdmin) {
        atualizacoes.senha = await bcrypt.hash(body.senha, 10);
        atualizacoes.senhaTemporaria = true; // Sempre senha temporária ao alterar pelo admin
      } else {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
        // LOG DE DEPURAÇÃO
        console.log('Comparando senhaAtual recebida:', senhaAtual, 'com hash:', user.senha);
        const ok = await bcrypt.compare(senhaAtual || '', user.senha);
        if (!ok) return res.status(400).json({ error: 'Senha atual incorreta.' });
        atualizacoes.senha = await bcrypt.hash(body.senha, 10);
        atualizacoes.senhaTemporaria = false;
      }
    }
    let user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    for (const campo of Object.keys(atualizacoes)) {
      user[campo] = atualizacoes[campo];
    }
    // LOG: Mostra os campos que serão salvos no usuário, incluindo o e-mail
    console.log('ATUALIZANDO USUÁRIO:', user._id, 'Campos:', atualizacoes);
    await user.save();
    const userRetorno = user.toObject();
    delete userRetorno.senha;
    res.json(userRetorno);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar usuário.', detalhe: err.message });
  }
});

// Deletar usuário (apenas admin)
router.delete('/:id', auth, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Acesso restrito a administradores.' });
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.json({ message: 'Usuário removido com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover usuário.' });
  }
});

module.exports = router;
