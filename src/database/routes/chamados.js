const express = require('express');
const Chamado = require('../models/Chamado');
const User = require('../models/User');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly'); // Importar o novo middleware
const multer = require('multer');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const { io } = require('../index');
const aiService = require('../services/aiService');
const emailService = require('../services/emailService');

const router = express.Router();

// ROTA DE TESTE PARA DIAGNÓSTICO
router.get('/teste-rota', (req, res) => {
  res.json({ ok: true, msg: 'Rota de teste funcionando!' });
});

// ROTA: Relatório de problemas recorrentes (com proteção contra dados corrompidos)
router.get('/relatorios/problemas-recorrentes', auth, adminOnly, async (req, res) => {
  console.log('BACKEND: Rota /relatorios/problemas-recorrentes acessada (PROTEÇÃO UTF-8) em:', new Date().toISOString());
  try {
    // Estratégia 1: Busca simples com processamento em memória para evitar agregação com dados corrompidos
    console.log('Buscando chamados finalizados com find() simples...');
    
    const chamados = await Chamado.find({
      status: { $in: ['Finalizado', 'Resolvido', 'Encerrado'] },
      categoria: { $exists: true, $ne: null, $ne: '' }
    }).lean();

    console.log(`Encontrados ${chamados.length} chamados finalizados`);

    // Processamento em memória para filtrar dados válidos
    const dadosLimpos = [];
    let chamadosDescartados = 0;

    for (const chamado of chamados) {
      try {
        // Verificações de segurança
        if (!chamado.categoria || typeof chamado.categoria !== 'string') {
          chamadosDescartados++;
          continue;
        }

        if (!chamado.criadoEm || !(chamado.criadoEm instanceof Date)) {
          chamadosDescartados++;
          continue;
        }

        // Verificar se historico é array válido
        if (!Array.isArray(chamado.historico) || chamado.historico.length === 0) {
          chamadosDescartados++;
          continue;
        }

        // Encontrar data de finalização no histórico
        let dataFinalizacao = null;
        for (let i = chamado.historico.length - 1; i >= 0; i--) {
          const item = chamado.historico[i];
          if (item && item.data && typeof item.data === 'string') {
            try {
              dataFinalizacao = new Date(item.data);
              if (!isNaN(dataFinalizacao)) {
                break;
              }
            } catch (parseError) {
              continue;
            }
          }
        }

        if (!dataFinalizacao) {
          chamadosDescartados++;
          continue;
        }

        // Calcular tempo de resolução
        const tempoResolucaoMs = dataFinalizacao.getTime() - chamado.criadoEm.getTime();
        const tempoResolucaoHoras = tempoResolucaoMs / (1000 * 60 * 60);

        dadosLimpos.push({
          categoria: chamado.categoria,
          tempoResolucaoHoras: tempoResolucaoHoras > 0 ? tempoResolucaoHoras : null
        });

      } catch (itemError) {
        console.warn('Erro ao processar chamado individual:', itemError.message);
        chamadosDescartados++;
        continue;
      }
    }

    console.log(`Processados ${dadosLimpos.length} chamados válidos, ${chamadosDescartados} descartados`);

    // Agrupamento manual por categoria
    const agrupamento = {};
    
    dadosLimpos.forEach(item => {
      if (!agrupamento[item.categoria]) {
        agrupamento[item.categoria] = {
          totalOcorrencias: 0,
          tempos: []
        };
      }
      
      agrupamento[item.categoria].totalOcorrencias++;
      
      if (item.tempoResolucaoHoras && item.tempoResolucaoHoras > 0) {
        agrupamento[item.categoria].tempos.push(item.tempoResolucaoHoras);
      }
    });

    // Gerar resultado final
    const resultados = Object.keys(agrupamento).map(categoria => {
      const dados = agrupamento[categoria];
      const avgTempoResolucaoHoras = dados.tempos.length > 0 
        ? Math.round((dados.tempos.reduce((a, b) => a + b, 0) / dados.tempos.length) * 100) / 100
        : null;

      return {
        tipoProblema: categoria,
        totalOcorrencias: dados.totalOcorrencias,
        avgTempoResolucaoHoras
      };
    }).sort((a, b) => b.totalOcorrencias - a.totalOcorrencias);

    console.log('RESULTADOS FINAIS /relatorios/problemas-recorrentes:', resultados);
    res.json(resultados);

  } catch (err) {
    console.error('Erro na rota /relatorios/problemas-recorrentes (PROTEÇÃO UTF-8):', err);
    res.status(500).json({ 
      error: 'Erro ao gerar relatório de problemas recorrentes.', 
      detalhe: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Multer para upload de anexo (até 5MB)
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
  storage: multer.memoryStorage(),
});

// Função utilitária para obter nome do autor a partir do req.user
async function obterNomeAutor(req) {
  try {
    if (req.user && req.user.id) {
      const usuarioDb = await User.findById(req.user.id);
      if (usuarioDb && usuarioDb.nome) return usuarioDb.nome;
      if (usuarioDb && usuarioDb.email) return usuarioDb.email;
    }
    if (req.user && req.user.nome) return req.user.nome;
    if (req.user && req.user.email) return req.user.email;
  } catch (e) {
    if (req.user && req.user.email) return req.user.email;
  }
  return 'Desconhecido';
}

// Função para emitir notificação para todos os admins conectados
async function notificarAdmins(mensagem, chamado) {
  if (!io) return;
  // Busca todos os admins
  const admins = await User.find({ $or: [{ tipo: 'admin' }, { isAdmin: true }] });
  admins.forEach(admin => {
    io.to(`user_${admin._id}`).emit('notificacao_personalizada', {
      mensagem,
      chamadoId: chamado._id,
      numeroChamado: chamado.numeroChamado,
      titulo: chamado.titulo,
      link: `/chamados/${chamado._id}`
    });
  });
}

// Função para emitir notificação para o usuário dono do chamado (garante chamado populado)
async function notificarUsuarioDonoPopulado(chamadoId, mensagem) {
  if (!io || !chamadoId) return;
  const chamado = await Chamado.findById(chamadoId);
  if (!chamado) return;
  let usuarioId = chamado.usuario;
  if (typeof usuarioId === 'object' && usuarioId._id) usuarioId = usuarioId._id;
  io.to(`user_${usuarioId}`).emit('notificacao_personalizada', {
    mensagem,
    chamadoId: chamado._id,
    numeroChamado: chamado.numeroChamado,
    titulo: chamado.titulo,
    link: `/chamados/${chamado._id}`
  });
}

// Função para notificar o usuário TI/admin atribuído/transferido
async function notificarUsuarioTI(email, mensagem, chamado) {
  if (!io || !email) return;
  const user = await User.findOne({ email });
  if (!user) return;
  io.to(`user_${user._id}`).emit('notificacao_personalizada', {
    mensagem,
    chamadoId: chamado._id,
    numeroChamado: chamado.numeroChamado,
    titulo: chamado.titulo,
    link: `/chamados/${chamado._id}`
  });
}

// Criar chamado (apenas autenticado)
router.post('/', auth, upload.array('anexos', 10), async (req, res) => {
  try {
    // Garante que req.body sempre é objeto (corrige para multipart/form-data)
    let body = {};
    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
      body = req.body;
    } else if (typeof req.body === 'string') {
      try {
        body = JSON.parse(req.body);
      } catch (e) {
        body = {};
      }
    }
    // Não faz destructuring direto
    const titulo = body.titulo;
    const descricao = body.descricao;
    const prioridade = body.prioridade;
    const departamento = body.departamento;
    const categoria = body.categoria;
    const usuarioId = req.user.id;
    const nomeAutor = await obterNomeAutor(req);
let historico = [];
    if (Array.isArray(req.files) && req.files.length > 0) {
      // Junta todos os anexos em UM histórico só, no array "anexos"
      const anexos = [];
      for (const file of req.files) {
        let anexo = null, anexoNome = file.originalname, anexoTipo = file.mimetype, anexoTamanho = file.size;
        if (anexoTamanho > 5 * 1024 * 1024) {
          return res.status(400).json({ error: `Arquivo ${anexoNome} excede 5MB.` });
        }
        if (anexoTipo === 'image/png' || anexoTipo === 'image/jpeg') {
          const webpBuffer = await sharp(file.buffer).webp({ quality: 80 }).toBuffer();
          anexo = `data:image/webp;base64,${webpBuffer.toString('base64')}`;
          anexoTipo = 'image/webp';
          anexoTamanho = webpBuffer.length;
        } else if (anexoTipo === 'application/pdf') {
          const pdfDoc = await PDFDocument.load(file.buffer);
          pdfDoc.setTitle('');
          pdfDoc.setAuthor('');
          const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
          anexo = `data:application/pdf;base64,${Buffer.from(pdfBytes).toString('base64')}`;
          anexoTamanho = pdfBytes.length;
        } else {
          return res.status(400).json({ error: `Tipo de arquivo não suportado (${anexoNome}). Apenas PNG, JPG, PDF.` });
        }
        anexos.push({ anexo, anexoNome, anexoTipo, anexoTamanho });
      }
      historico.push({
        data: new Date().toISOString(),
        autor: nomeAutor,
        texto: 'Chamado aberto com anexo.',
        anexos
      });
    }
    // Geração sequencial do número do chamado
    let ultimoChamado = await Chamado.findOne({ numeroChamado: { $exists: true, $ne: null } }, {}, { sort: { numeroChamado: -1 } });
    let proximoNumero = 1;
    if (ultimoChamado && ultimoChamado.numeroChamado) {
      const match = String(ultimoChamado.numeroChamado).match(/CH-(\d+)/);
      if (match && match[1]) {
        proximoNumero = parseInt(match[1], 10) + 1;
      }
    }
    const numeroChamado = `CH-${String(proximoNumero).padStart(4, '0')}`;
    // Cria o chamado SEM histórico automático
    const novoChamado = new Chamado({ titulo, descricao, prioridade, departamento, categoria, usuario: usuarioId, historico, numeroChamado });
    await novoChamado.save();
    const chamadoSalvoEPopulado = await Chamado.findById(novoChamado._id).populate('usuario', 'nome email departamento');    // Notifica todos os admins sobre novo chamado (incluindo nome do criador)
    const nomeDonoDoGrammatic = chamadoSalvoEPopulado.usuario?.nome || nomeAutor;
    await notificarAdmins(`Novo chamado aberto por ${nomeDonoDoGrammatic}: #${numeroChamado} - ${titulo}`, chamadoSalvoEPopulado);
    
    // NOTIFICAÇÃO POR EMAIL - Novo chamado para administradores
    try {
      const admins = await User.find({ $or: [{ tipo: 'admin' }, { isAdmin: true }] });
      if (admins.length > 0 && chamadoSalvoEPopulado.usuario) {
        await emailService.notificarNovoChamadoPorEmail(chamadoSalvoEPopulado, chamadoSalvoEPopulado.usuario, admins);
        console.log(`📧 Email de novo chamado enviado para ${admins.length} administradores`);
      }
    } catch (emailError) {
      console.error('Erro ao enviar email de novo chamado:', emailError.message);
      // Não impede a criação do chamado se o email falhar
    }
    res.status(201).json(chamadoSalvoEPopulado.toObject({ virtuals: false }));
  } catch (err) {
    console.error('Erro detalhado ao criar chamado:', err);
    res.status(500).json({ error: 'Erro ao criar chamado.', detalhe: err.message });
  }
});

// Listar chamados (apenas autenticado)
router.get('/', auth, async (req, res) => {
  try {
    let chamados;
    if (req.user.isAdmin) {
      chamados = await Chamado.find().populate('usuario', 'nome email departamento');
    } else {
      chamados = await Chamado.find({ usuario: req.user.id }).populate('usuario', 'nome email departamento');
    }
    // Garante que todos os chamados retornam _id como string
    chamados = chamados.map(c => {
      const obj = c.toObject({ virtuals: false });
      obj._id = c._id.toString();
      if (obj.usuario && obj.usuario._id) obj.usuario._id = obj.usuario._id.toString();
      return obj;
    });
    res.json(chamados);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar chamados.' });
  }
});

// Atualizar chamado (adicionar comentário/anexo)
router.put('/:id', auth, upload.any(), async (req, res) => {
  // Adicionar este log no início da função
  console.log('Usuário que fez a requisição (req.user):', JSON.stringify(req.user));
  console.log('Dados recebidos para atualização do chamado:', JSON.stringify(req.body));

  // Garante que req.body sempre é objeto
  let body = {};
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    body = req.body;
  } else if (typeof req.body === 'string') {
    try {
      body = JSON.parse(req.body);
    } catch (e) {
      body = {};
    }
  }
  // Não faz destructuring direto para evitar erro
  const status = body.status;
  const solucao = body.solucao;
  const comentario = body.comentario;
  const responsavel = body.responsavel;
  const anexoBody = body.anexo;
  const anexoNomeBody = body.anexoNome;
  const anexoTipoBody = body.anexoTipo;
  const chamadoId = req.params.id;
  
  if (!req.user || (!req.user._id && !req.user.id)) {
      console.error('Erro crítico: req.user ou req.user._id não definido.');
      return res.status(500).json({ message: 'Erro de autenticação do usuário.' });
  }
  const userAtualId = (req.user._id || req.user.id).toString(); // ID do usuário que está fazendo a alteração

  try {
      const chamado = await Chamado.findById(chamadoId);
      if (!chamado) {
          return res.status(404).json({ message: 'Chamado não encontrado' });
      }

      // Salva valores originais para comparação
      const statusOriginal = chamado.status;
      const responsavelOriginal = chamado.responsavel ? chamado.responsavel.toString() : '';

      // Verifica se o usuário é admin ou o dono do chamado para editar status e solução
      const isAdmin = req.user.tipo === 'admin' || req.user.isAdmin;
      const isDono = (chamado.user ? chamado.user.toString() : chamado.usuario?.toString()) === userAtualId;      // Lógica para comentário com ou sem anexo
      let anexos = [];
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          let anexo = null, anexoNome = file.originalname, anexoTipo = file.mimetype, anexoTamanho = file.size;
          if (anexoTamanho > 5 * 1024 * 1024) {
            return res.status(400).json({ error: `Arquivo ${anexoNome} excede 5MB.` });
          }
          if (anexoTipo === 'image/png' || anexoTipo === 'image/jpeg') {
            const webpBuffer = await sharp(file.buffer).webp({ quality: 80 }).toBuffer();
            anexo = `data:image/webp;base64,${webpBuffer.toString('base64')}`;
            anexoTipo = 'image/webp';
            anexoTamanho = webpBuffer.length;
          } else if (anexoTipo === 'application/pdf') {
            const pdfDoc = await PDFDocument.load(file.buffer);
            pdfDoc.setTitle('');
            pdfDoc.setAuthor('');
            const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
            anexo = `data:application/pdf;base64,${Buffer.from(pdfBytes).toString('base64')}`;
            anexoTamanho = pdfBytes.length;
          } else {
            return res.status(400).json({ error: `Tipo de arquivo não suportado (${anexoNome}). Apenas PNG, JPG, PDF.` });
          }
          anexos.push({ anexo, anexoNome, anexoTipo, anexoTamanho });
        }
      } else if (anexoBody) {
        anexos.push({ anexo: anexoBody, anexoNome: anexoNomeBody, anexoTipo: anexoTipoBody });
      }

      if (comentario || anexos.length > 0) {
        let nomeAutorComentario = req.user && req.user.nome ? req.user.nome : await obterNomeAutor(req);
        const novoHistorico = {
          data: new Date(),
          autor: nomeAutorComentario,
          texto: comentario || (anexos.length > 0 ? 'Comentário com anexo.' : ''),
          anexos
        };
        chamado.historico.push(novoHistorico);
        // Notificação bidirecional para comentários (incluindo email)
        const autorId = req.user._id || req.user.id;
        await notificarComentarioBidirecional(chamado, autorId, comentario || 'Comentário com anexo.');
        // Notificar dono do chamado por e-mail
        try {
          const usuarioDono = await User.findById(chamado.usuario);
          if (usuarioDono && usuarioDono.email) {
            await emailService.notificarComentarioPorEmail(chamado, nomeAutorComentario, comentario || 'Comentário com anexo.', [usuarioDono], false);
          }
        } catch (e) {
          console.error('Erro ao enviar email de comentário ao usuário:', e.message);
        }
      }

      // Só bloqueia alteração de status/atribuição para quem não for admin
      if (!isAdmin && !isDono) {
        if (status || solucao || responsavel) {
          return res.status(403).json({ message: 'Você não tem permissão para alterar status, solução ou responsável deste chamado.' });
        }
      }
      
      chamado.dataAtualizacao = new Date();
      await chamado.save();

      // Corrige todos os populates: só usa 'usuario', nunca 'user' e nunca socketId
      const chamadoAtualizadoPopulado = await Chamado.findById(chamado._id)
        .populate('usuario', 'nome email departamento')
        .populate('departamento', 'nome')
        .populate('responsavel', 'nome email departamento')
        .populate('historico.autor', 'nome');

    const tituloChamado = chamadoAtualizadoPopulado.titulo || chamado.titulo || 'Chamado sem título';    // Emitir evento para atualização em tempo real das listas de chamados no frontend (NÃO é notificação)
    if (io) {
      io.emit('chamado_modificado', chamadoAtualizadoPopulado.toObject({ virtuals: false }));
      
      // Notifica se foi finalizado
      if (body.status === 'Finalizado') {
        await notificarUsuarioDonoPopulado(chamadoAtualizadoPopulado._id, `Seu chamado #${chamadoAtualizadoPopulado.numeroChamado} foi finalizado.`);
        await notificarAdmins(`Chamado finalizado: #${chamadoAtualizadoPopulado.numeroChamado} - ${tituloChamado}`, chamadoAtualizadoPopulado);
      }
    }
    res.json(chamadoAtualizadoPopulado);
  } catch (error) {
    console.error('Erro ao atualizar chamado:', error);
    res.status(500).json({ message: 'Erro ao atualizar chamado.', detalhe: error.message });
  }
});

// Atualizar campos do chamado (status, atribuição, prioridade, etc.)
router.patch('/:id', auth, async (req, res) => {
  try {
    // Protege destructuring caso req.body seja undefined
    const body = req.body || {};
    const status = body.status; // Padroniza uso de status
    const permitido = [
      'status', 'atribuido', 'prioridade', 'titulo', 'descricao', 'setor', 'comentarioResolucao', 'categoria'
    ];
    const atualizacoes = {};
    for (const campo of permitido) {
      if (body[campo] !== undefined) {
        atualizacoes[campo] = body[campo];
      }
    }

    // Garante que o campo 'atribuido' é string (nome do colaborador/admin)
    if (atualizacoes.atribuido && typeof atualizacoes.atribuido !== 'string') {
      atualizacoes.atribuido = String(atualizacoes.atribuido);
    }
    // Atualiza e popula o campo usuario
    const chamadoAtualizado = await Chamado.findByIdAndUpdate(
      req.params.id,
      { $set: atualizacoes },
      { new: true }
    ).populate('usuario', 'nome email departamento');

    if (!chamadoAtualizado) return res.status(404).json({ error: 'Chamado não encontrado.' });

    // Adicionar ao histórico se houver mudança de status, atribuição ou prioridade
    let textoHistoricoPatch = '';
    // Buscar o chamado original para comparar
    // const chamadoOriginal = await Chamado.findById(req.params.id); // Esta linha pode ser problemática se o chamado já foi atualizado acima
    // Para evitar problemas, vamos buscar o estado ANTES da atualização para comparação.
    // No entanto, para simplificar e focar no comentarioResolucao, vamos assumir que o estado anterior é o que estava no banco antes desta operação.
    // Por ora, vamos confiar que 'chamadoAtualizado' reflete o novo estado e compararemos com o 'body' para o histórico.

    let mudouStatus = false;
    let mudouAtribuicao = false;

    // Para o histórico, precisamos do estado ANTERIOR à atualização.
    // Uma forma é buscar o chamado antes de atualizá-lo, ou passar os valores antigos do frontend se disponível.
    // Por simplicidade, vamos assumir que se um campo está em 'atualizacoes', ele mudou.
    // Esta lógica de histórico pode precisar de refatoração para maior precisão.

    if (atualizacoes.status) {
        textoHistoricoPatch += `Status alterado para: ${atualizacoes.status}. `;
        mudouStatus = true;
    }
    
    const camposResp = ['atribuido', 'responsavel']; // 'responsavel' também é um campo que pode ser atualizado aqui
    let notificouReivindicacao = false;

    for (const campo of camposResp) {
      if (atualizacoes[campo]) { // Se o campo está sendo atualizado
        const nomeAtribuido = await obterNomePorEmail(atualizacoes[campo]);
        textoHistoricoPatch += `Atribuído a: ${nomeAtribuido}. `;
        mudouAtribuicao = true;
        // A lógica de notificação de reivindicação/atribuição pode ser complexa
        // e depender do estado anterior, que não temos diretamente aqui sem outra busca.
        // Simplificando:        await notificarDonoChamadoDireto(chamadoAtualizado._id, `Seu chamado #${chamadoAtualizado.numeroChamado} foi atualizado (atribuição para ${nomeAtribuido}).`);
        notificouReivindicacao = true;
        await notificarUsuarioTI(atualizacoes[campo], `Você foi atribuído ao chamado #${chamadoAtualizado.numeroChamado} - ${chamadoAtualizado.titulo}.`, chamadoAtualizado);
        
        // NOTIFICAÇÃO POR EMAIL - Atribuição para a pessoa atribuída
        try {
          const emailAtribuido = atualizacoes[campo];
          await emailService.notificarAtribuicaoPorEmail(chamadoAtualizado, emailAtribuido, nomeAtribuido, false);
          console.log(`📧 Email de atribuição enviado para ${emailAtribuido}`);
        } catch (emailError) {
          console.error('Erro ao enviar email de atribuição:', emailError.message);
        }
      }
    }
    
    if (atualizacoes.status && atualizacoes.status === 'Finalizado') {
      await notificarDonoChamadoDireto(chamadoAtualizado._id, `Seu chamado #${chamadoAtualizado.numeroChamado} foi finalizado.`);
      // Notificar dono do chamado por e-mail
      try {
        const usuarioDono = await User.findById(chamadoAtualizado.usuario);
        if (usuarioDono && usuarioDono.email) {
          await emailService.notificarFinalizacaoPorEmail(chamadoAtualizado, usuarioDono, chamadoAtualizado.solucao || '');
        }
      } catch (e) {
        console.error('Erro ao enviar email de finalização ao usuário:', e.message);
      }
    }

    if (atualizacoes.prioridade) {
        textoHistoricoPatch += `Prioridade alterada para: ${atualizacoes.prioridade}. `;
    }

    if (textoHistoricoPatch.trim() !== '') {
        const nomeAutorAcao = await obterNomeAutor(req);
        chamadoAtualizado.historico.push({
            data: new Date().toISOString(),
            autor: nomeAutorAcao,
            texto: textoHistoricoPatch.trim()
        });
        // Salva novamente para incluir o histórico.
        // É importante notar que findByIdAndUpdate já salvou 'atualizacoes'.
        // Esta segunda operação .save() é apenas para o histórico.
        await chamadoAtualizado.save(); 
    }
    
    // --- População final para resposta ---
    const chamadoFinalPopulado = await Chamado.findById(chamadoAtualizado._id)
      .populate('usuario', 'nome email departamento')
      .populate('departamento', 'nome')
      .populate('responsavel', 'nome email departamento') // Adicionado para consistência
      .populate('historico.autor', 'nome');
      
    const tituloChamado = chamadoFinalPopulado.titulo || 'Chamado sem título';
    if (io) {
      io.emit('chamado_modificado', chamadoFinalPopulado.toObject({ virtuals: false }));
      
      if (atualizacoes.status === 'Finalizado') {
        // A notificação de finalização já foi feita acima, mas podemos mantê-la aqui para garantir,
        // ou refatorar para evitar duplicidade.
        await notificarUsuarioDonoPopulado(chamadoFinalPopulado._id, `Seu chamado #${chamadoFinalPopulado.numeroChamado} foi finalizado.`);
        await notificarAdmins(`Chamado finalizado: #${chamadoFinalPopulado.numeroChamado} - ${tituloChamado}`, chamadoFinalPopulado);
      }
    }
    res.json(chamadoFinalPopulado);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar chamado.', detalhe: err.message });
  }
});

// Reabrir chamado (admin ou usuário)
router.post('/:id/reabrir', auth, async (req, res) => {
  try {
    const chamado = await Chamado.findById(req.params.id);
    if (!chamado) return res.status(404).json({ error: 'Chamado não encontrado.' });
    if (chamado.status !== 'Finalizado' && chamado.status !== 'Encerrado' && chamado.status !== 'Resolvido') {
      return res.status(400).json({ error: 'Chamado não está finalizado.' });
    }
    chamado.status = 'Reaberto';
    chamado.historico = chamado.historico || [];
    const nomeAutor = await obterNomeAutor(req);
    chamado.historico.push({
      data: new Date().toISOString(), // Padronizar para ISOString
      autor: nomeAutor,
      texto: 'Chamado reaberto.'
    });
    await chamado.save();
    const chamadoReabertoPopulado = await Chamado.findById(chamado._id).populate('usuario', 'nome email departamento');    // Emitir evento para atualização em tempo real
    if (io) {
      io.emit('chamado_modificado', chamadoReabertoPopulado.toObject({ virtuals: false }));
      await notificarAdmins(`Chamado reaberto: #${chamadoReabertoPopulado.numeroChamado} - ${chamadoReabertoPopulado.titulo}`, chamadoReabertoPopulado);
      await notificarUsuarioDonoPopulado(chamadoReabertoPopulado._id, `Seu chamado #${chamadoReabertoPopulado.numeroChamado} foi reaberto.`);
      
      // NOTIFICAÇÃO POR EMAIL - Reabertura para administradores
      try {
        const admins = await User.find({ $or: [{ tipo: 'admin' }, { isAdmin: true }] });
        if (admins.length > 0) {
          // Usar template de novo chamado com modificação no assunto para reabertura
          for (const admin of admins) {
            if (admin.email) {
              await emailService.enviarEmail({
                destinatario: admin.email,
                assunto: `🔄 Chamado Reaberto #${chamadoReabertoPopulado.numeroChamado} - ${chamadoReabertoPopulado.titulo}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                      <h2 style="color: #dc3545; margin-top: 0;">🔄 Chamado Reaberto</h2>
                      <p><strong>Número:</strong> #${chamadoReabertoPopulado.numeroChamado}</p>
                      <p><strong>Título:</strong> ${chamadoReabertoPopulado.titulo}</p>
                      <p><strong>Usuário:</strong> ${chamadoReabertoPopulado.usuario?.nome || 'N/A'}</p>
                      <p><strong>Data de reabertura:</strong> ${new Date().toLocaleString('pt-BR')}</p>
                      <p style="margin-top: 20px;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/chamados/${chamadoReabertoPopulado._id}" 
                           style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                          Ver Chamado
                        </a>
                      </p>
                    </div>
                  </div>
                `,
                texto: `Chamado Reaberto #${chamadoReabertoPopulado.numeroChamado} - ${chamadoReabertoPopulado.titulo}`
              });
            }
          }
          console.log(`📧 Email de reabertura enviado para ${admins.length} administradores`);
        }
      } catch (emailError) {
        console.error('Erro ao enviar email de reabertura:', emailError.message);
      }
    }
    res.json(chamadoReabertoPopulado.toObject({ virtuals: false }));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao reabrir chamado.', detalhe: err.message });
  }
});

// Deletar chamado (apenas autenticado)
router.delete('/:id', auth, async (req, res) => {
  try {
    await Chamado.findByIdAndDelete(req.params.id);
    res.json({ message: 'Chamado removido.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover chamado.' });
  }
});

// ROTA: Análise de IA para um chamado específico (TESTE SEM AUTH)
router.get('/:id/ai-analysis', async (req, res) => {
  try {
    const chamadoId = req.params.id;
    
    // Buscar o chamado
    const chamado = await Chamado.findById(chamadoId).populate('usuario', 'nome email');
    
    if (!chamado) {
      return res.status(404).json({ error: 'Chamado não encontrado.' });
    }

    // Comentado para teste: Verificar se o usuário pode ver este chamado
    // const isOwner = chamado.usuario._id.toString() === req.user.id;
    // const isAdminOrTI = req.user.isAdmin || req.user.departamento === 'TI';
    // 
    // if (!isOwner && !isAdminOrTI) {
    //   return res.status(403).json({ error: 'Acesso negado.' });
    // }

    console.log('🤖 Iniciando análise de IA para chamado:', chamadoId);

    // Executar análise de IA
    const analysis = await aiService.analyzeChamado(chamado);

    res.json({
      chamadoId: chamadoId,
      analysis: analysis,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro na análise de IA:', error);
    res.status(500).json({ 
      error: 'Erro ao realizar análise de IA.', 
      details: error.message 
    });
  }
});

// ROTA: Feedback sobre sugestão de IA (para aprendizado)
router.post('/:id/ai-feedback', auth, async (req, res) => {
  try {
    const chamadoId = req.params.id;
    const { suggestionUsed, helpful, feedback } = req.body;

    // Buscar o chamado
    const chamado = await Chamado.findById(chamadoId);
    
    if (!chamado) {
      return res.status(404).json({ error: 'Chamado não encontrado.' });
    }

    // Salvar feedback (poderia ser em uma coleção separada)
    console.log('🤖 Feedback de IA recebido:', {
      chamadoId,
      suggestionUsed,
      helpful,
      feedback,
      userId: req.user.id
    });

    // Aqui poderia salvar em uma coleção AIFeedback para machine learning futuro
    
    res.json({ 
      success: true, 
      message: 'Feedback registrado com sucesso.' 
    });

  } catch (error) {
    console.error('Erro ao registrar feedback de IA:', error);
    res.status(500).json({ error: 'Erro ao registrar feedback.' });
  }
});

// Função para notificar sobre comentários bidirecionalmente
async function notificarComentarioBidirecional(chamado, autorComentarioId, textoComentario = '') {
  if (!io || !chamado || !autorComentarioId) return;
  
  try {
    // Busca o chamado populado para ter todas as informações
    const chamadoPopulado = await Chamado.findById(chamado._id).populate('usuario', 'nome email');
    if (!chamadoPopulado) return;
    
    const donoId = chamadoPopulado.usuario._id ? chamadoPopulado.usuario._id.toString() : chamadoPopulado.usuario.toString();
    const autorId = autorComentarioId.toString();
    const nomeAutor = await obterNomeAutor({ user: { id: autorId } });
      // Se o autor do comentário for o dono do chamado, notifica TI/admin responsável
    if (autorId === donoId) {
      // Notifica o responsável se houver um atribuído
      if (chamado.responsavel) {
        const responsavelEmail = typeof chamado.responsavel === 'string' ? chamado.responsavel : chamado.responsavel.email;
        await notificarUsuarioTI(responsavelEmail, `${nomeAutor} comentou no chamado #${chamado.numeroChamado} - ${chamado.titulo}`, chamado);
        
        // NOTIFICAÇÃO POR EMAIL - Comentário para responsável
        try {
          const responsavel = await User.findOne({ email: responsavelEmail });
          if (responsavel) {
            await emailService.notificarComentarioPorEmail(chamadoPopulado, nomeAutor, textoComentario, [responsavel], true);
          }
        } catch (emailError) {
          console.error('Erro ao enviar email de comentário para responsável:', emailError.message);
        }
      } else if (chamado.atribuido) {
        // Se não tem responsável mas tem atribuído
        await notificarUsuarioTI(chamado.atribuido, `${nomeAutor} comentou no chamado #${chamado.numeroChamado} - ${chamado.titulo}`, chamado);
        
        // NOTIFICAÇÃO POR EMAIL - Comentário para atribuído
        try {
          const atribuido = await User.findOne({ email: chamado.atribuido });
          if (atribuido) {
            await emailService.notificarComentarioPorEmail(chamadoPopulado, nomeAutor, textoComentario, [atribuido], true);
          }
        } catch (emailError) {
          console.error('Erro ao enviar email de comentário para atribuído:', emailError.message);
        }
      } else {
        // Se não tem ninguém específico atribuído, notifica todos os admins
        await notificarAdmins(`${nomeAutor} comentou no chamado #${chamado.numeroChamado} - ${chamado.titulo}`, chamado);
        
        // NOTIFICAÇÃO POR EMAIL - Comentário para todos os admins
        try {
          const admins = await User.find({ $or: [{ tipo: 'admin' }, { isAdmin: true }] });
          if (admins.length > 0) {
            await emailService.notificarComentarioPorEmail(chamadoPopulado, nomeAutor, textoComentario, admins, true);
          }
        } catch (emailError) {
          console.error('Erro ao enviar email de comentário para admins:', emailError.message);
        }
      }
    } else {
      // Se o autor do comentário não for o dono, notifica o dono do chamado
      await notificarUsuarioDonoPopulado(chamado._id, `${nomeAutor} comentou em seu chamado #${chamado.numeroChamado} - ${chamado.titulo}`);
      
      // NOTIFICAÇÃO POR EMAIL - Comentário para dono do chamado (já é feita na rota PUT)
      // Não duplicamos aqui pois já está sendo feita nas linhas 398-400
    }
  } catch (error) {
    console.error('Erro ao notificar comentário bidirecional:', error);
  }
}

// Função auxiliar para obter nome por email (usada em histórico de atribuição)
async function obterNomePorEmail(email) {
  if (!email) return 'N/A';
  try {
    const user = await User.findOne({ email: email });
    return user ? user.nome : email;
  } catch (error) {
    console.error("Erro ao buscar nome por email:", error);
    return email;
  }
}

// Função robusta para notificar o dono do chamado (garante sempre o número e título)
async function notificarDonoChamadoDireto(chamadoId, mensagem) {
  if (!io || !chamadoId) return;
  const chamado = await Chamado.findById(chamadoId).populate('usuario', 'nome email departamento');
  if (!chamado || !chamado.usuario) return;
  let usuarioId = chamado.usuario._id ? chamado.usuario._id : chamado.usuario;
  io.to(`user_${usuarioId}`).emit('notificacao_personalizada', {
    mensagem,
    chamadoId: chamado._id,
    numeroChamado: chamado.numeroChamado,
    titulo: chamado.titulo,
    link: `/chamados/${chamado._id}`
  });
}

module.exports = router;
