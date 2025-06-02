const express = require('express');
const EmailConfig = require('../models/EmailConfig');
const auth = require('../middleware/auth');
const { enviarEmail } = require('../services/emailService');

const router = express.Router();

// Middleware para verificar se é admin
const isAdmin = (req, res, next) => {
  if (!req.user.isAdmin && req.user.tipo !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }
  next();
};

// Obter configurações atuais
router.get('/', auth, isAdmin, async (req, res) => {
  try {
    console.log('🔍 GET /api/email-config - Iniciando busca de configuração...');
    
    let config = await EmailConfig.findOne().sort({ criadoEm: -1 });
    console.log('🔍 Configuração encontrada no banco:', config ? 'SIM' : 'NÃO');
    
    // Se não existe configuração, cria uma padrão
    if (!config) {
      console.log('🆕 Criando nova configuração padrão...');
      config = new EmailConfig({
        emailUser: process.env.EMAIL_USER || '',
        emailPassword: process.env.EMAIL_PASSWORD || '',
        emailFrom: process.env.EMAIL_FROM || 'DeskHelp <noreply@deskhelp.com>',
        emailService: process.env.EMAIL_SERVICE || 'gmail',
        emailEnabled: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true',
        criadoPor: req.user.id
      });
      
      console.log('🔍 Templates da nova configuração antes de salvar:', {
        novoChamado: {
          assunto: config.templates.novoChamado.assunto?.substring(0, 50) + '...',
          corpo: config.templates.novoChamado.corpo?.substring(0, 100) + '...'
        },
        comentario: {
          assunto: config.templates.comentario.assunto?.substring(0, 50) + '...',
          corpo: config.templates.comentario.corpo?.substring(0, 100) + '...'
        }
      });
      
      await config.save();
      console.log('✅ Nova configuração salva no banco');
    }
    
    console.log('🔍 Templates da configuração carregada:', {
      novoChamado: {
        assunto: config.templates?.novoChamado?.assunto?.substring(0, 50) + '...',
        assuntoLength: config.templates?.novoChamado?.assunto?.length || 0,
        corpo: config.templates?.novoChamado?.corpo?.substring(0, 100) + '...',
        corpoLength: config.templates?.novoChamado?.corpo?.length || 0
      },
      comentario: {
        assunto: config.templates?.comentario?.assunto?.substring(0, 50) + '...',
        assuntoLength: config.templates?.comentario?.assunto?.length || 0,
        corpo: config.templates?.comentario?.corpo?.substring(0, 100) + '...',
        corpoLength: config.templates?.comentario?.corpo?.length || 0
      },
      atribuicao: {
        assuntoLength: config.templates?.atribuicao?.assunto?.length || 0,
        corpoLength: config.templates?.atribuicao?.corpo?.length || 0
      },
      finalizacao: {
        assuntoLength: config.templates?.finalizacao?.assunto?.length || 0,
        corpoLength: config.templates?.finalizacao?.corpo?.length || 0
      }
    });
    
    // Remove senha da resposta por segurança
    const configResponse = config.toObject();
    configResponse.emailPassword = configResponse.emailPassword ? '***configurado***' : '';
    
    console.log('📧 Templates na resposta final:', {
      templatesExist: !!configResponse.templates,
      templatesKeys: Object.keys(configResponse.templates || {}),
      novoChamadoExists: !!configResponse.templates?.novoChamado,
      novoChamadoAssunto: configResponse.templates?.novoChamado?.assunto?.length || 0,
      novoChamadoCorpo: configResponse.templates?.novoChamado?.corpo?.length || 0
    });
    
    res.json(configResponse);
  } catch (error) {
    console.error('❌ Erro ao obter configurações de email:', error);
    res.status(500).json({ error: 'Erro ao obter configurações' });
  }
});

// Atualizar configurações
router.put('/', auth, isAdmin, async (req, res) => {
  try {
    console.log('🔧 PUT /api/email-config - Iniciando atualização...');
    console.log('📧 Dados recebidos:', JSON.stringify(req.body, null, 2));
    
    const {
      emailEnabled,
      emailService,
      emailUser,
      emailPassword,
      emailFrom,
      smtpHost,
      smtpPort,
      smtpSecure,
      templates
    } = req.body;

    // Buscar configuração atual ou criar nova
    let config = await EmailConfig.findOne().sort({ criadoEm: -1 });
    
    if (!config) {
      console.log('📧 Criando nova configuração...');
      config = new EmailConfig({
        criadoPor: req.user.id
      });
    } else {
      console.log('📧 Configuração existente encontrada');
    }

    // Atualizar campos básicos
    if (emailEnabled !== undefined) config.emailEnabled = emailEnabled;
    if (emailService) config.emailService = emailService;
    if (emailUser) config.emailUser = emailUser;
    if (emailPassword && emailPassword !== '***configurado***') {
      config.emailPassword = emailPassword;
    }
    if (emailFrom) config.emailFrom = emailFrom;
    if (smtpHost) config.smtpHost = smtpHost;
    if (smtpPort !== undefined) config.smtpPort = smtpPort;
    if (smtpSecure !== undefined) config.smtpSecure = smtpSecure;

    // NOVA LÓGICA PARA TEMPLATES - Mais simples e direta
    if (templates) {
      console.log('📧 Atualizando templates...');
      
      // Inicializa o objeto templates se não existir
      if (!config.templates) {
        config.templates = {};
      }

      // Lista de templates válidos (baseado no schema)
      const templatesValidos = ['novoChamado', 'comentario', 'atribuicao', 'finalizacao'];
      
      // Atualiza apenas os templates válidos enviados na requisição
      templatesValidos.forEach(tipoTemplate => {
        if (templates[tipoTemplate]) {
          console.log(`📧 Atualizando template: ${tipoTemplate}`);
          
          // Inicializa o template se não existir
          if (!config.templates[tipoTemplate]) {
            config.templates[tipoTemplate] = {};
          }
          
          // Atualiza apenas os campos assunto e corpo (ignora outros campos como html, texto)
          if (templates[tipoTemplate].assunto !== undefined) {
            config.templates[tipoTemplate].assunto = templates[tipoTemplate].assunto;
            console.log(`  ✅ Assunto atualizado: ${templates[tipoTemplate].assunto.substring(0, 50)}...`);
          }
          
          if (templates[tipoTemplate].corpo !== undefined) {
            config.templates[tipoTemplate].corpo = templates[tipoTemplate].corpo;
            console.log(`  ✅ Corpo atualizado: ${templates[tipoTemplate].corpo.substring(0, 100)}...`);
          }
        }
      });

      // Marca explicitamente o campo templates como modificado
      config.markModified('templates');
    }

    // Ajuste automático para smtpSecure baseado na porta
    const currentEmailService = config.emailService;
    const currentSmtpPort = config.smtpPort;
    
    if (currentEmailService === 'smtp') {
      if (currentSmtpPort === 587) {
        config.smtpSecure = false; // STARTTLS
      } else if (currentSmtpPort === 465) {
        config.smtpSecure = true;  // SSL/TLS
      }
    }

    console.log('📧 Salvando configuração no banco de dados...');
    await config.save();
    console.log('✅ Configuração salva com sucesso!');

    // Verificação pós-salvamento
    const configSalva = await EmailConfig.findById(config._id);
    console.log('📧 Verificação pós-salvamento - Templates salvos:');
    Object.keys(configSalva.templates || {}).forEach(tipo => {
      const template = configSalva.templates[tipo];
      console.log(`  ${tipo}:`);
      console.log(`    Assunto: ${template.assunto ? template.assunto.substring(0, 50) + '...' : 'VAZIO'}`);
      console.log(`    Corpo: ${template.corpo ? template.corpo.substring(0, 100) + '...' : 'VAZIO'}`);
    });

    // Retornar resposta (sem senha por segurança)
    const configResponse = configSalva.toObject();
    configResponse.emailPassword = configResponse.emailPassword ? '***configurado***' : '';

    res.json({ 
      message: 'Configurações de email atualizadas com sucesso',
      config: configResponse 
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar configurações de email:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao salvar configurações',
      details: error.message 
    });
  }
});

// Testar configurações de email
router.post('/test', auth, isAdmin, async (req, res) => {
  try {
    const { destinatario } = req.body;
    if (!destinatario) {
      return res.status(400).json({ error: 'E-mail de teste é obrigatório' });
    }
    // Buscar configuração atual - enviarEmail fará isso e usará a lógica correta.
    // Não é necessário manipular process.env aqui, pois createEmailTransporter em emailService
    // já lida com a lógica de dbConfig vs process.env e o ajuste de smtpSecure.

    // Apenas chame enviarEmail. Ele usará a configuração mais recente do BD.
    const result = await enviarEmail({
      destinatario,
      assunto: 'Teste de envio DeskHelp',
      html: '<b>Este é um teste de envio de e-mail do DeskHelp.</b>',
      texto: 'Este é um teste de envio de e-mail do DeskHelp.'
    });

    if (result.success) {
      res.json({ ok: true, message: 'E-mail de teste enviado com sucesso!' });
    } else {
      res.status(500).json({ error: 'Falha ao enviar e-mail de teste', detalhe: result.error });
    }
  } catch (error) {
    console.error('Erro na rota /test:', error); // Log adicional do erro na rota
    res.status(500).json({ error: 'Erro ao testar envio de e-mail', detalhe: error.message });
  }
});

// Obter variáveis de template disponíveis
router.get('/template-variables', auth, isAdmin, (req, res) => {
  const variables = {
    novoChamado: [
      '{numeroChamado}', '{titulo}', '{descricao}', '{prioridade}', 
      '{corPrioridade}', '{departamento}', '{categoria}', '{nomeUsuario}', 
      '{emailUsuario}', '{dataFormatada}', '{linkChamado}'
    ],
    comentario: [
      '{numeroChamado}', '{titulo}', '{tipoComentario}', '{tituloEmail}',
      '{corTema}', '{tipoAutor}', '{nomeAutor}', '{comentario}', '{linkChamado}'
    ],
    atribuicao: [
      '{numeroChamado}', '{titulo}', '{tipoAtribuicao}', '{textoAtribuicao}',
      '{prioridade}', '{corPrioridade}', '{departamento}', '{nomeAtribuido}', '{linkChamado}'
    ],
    finalizacao: [
      '{numeroChamado}', '{titulo}', '{solucaoHtml}', '{dataFinalizacao}', '{linkChamado}'
    ]
  };
  
  res.json(variables);
});

// Resetar templates para padrão
router.post('/reset-templates', auth, isAdmin, async (req, res) => {
  try {
    const config = await EmailConfig.findOne().sort({ criadoEm: -1 });
    
    if (!config) {
      return res.status(404).json({ error: 'Configuração não encontrada' });
    }

    // Criar uma nova instância para obter os templates padrão
    const defaultConfig = new EmailConfig();
    config.templates = defaultConfig.templates;
    
    await config.save();

    res.json({ 
      message: 'Templates resetados para o padrão',
      templates: config.templates 
    });
  } catch (error) {
    console.error('Erro ao resetar templates:', error);
    res.status(500).json({ error: 'Erro ao resetar templates' });
  }
});

// Sugestão de template de e-mail com IA
router.get('/suggest-template/:tipo', auth, isAdmin, async (req, res) => {
  try {
    const { tipo } = req.params;
    // Exemplos de prompts para cada tipo
    const exemplos = {
      novoChamado: 'Redija um e-mail formal e amigável para notificar administradores sobre a abertura de um novo chamado no sistema DeskHelp. Inclua número, título, descrição, prioridade, departamento, nome e e-mail do solicitante.',
      comentarioChamado: 'Redija um e-mail para notificar o usuário sobre um novo comentário ou resposta em seu chamado no DeskHelp. Inclua número, título, autor do comentário e o texto do comentário.',
      chamadoAtribuido: 'Redija um e-mail para notificar o usuário que seu chamado foi atribuído ou reivindicado por um atendente/admin no DeskHelp. Inclua número, título, nome do responsável.',
      chamadoFinalizado: 'Redija um e-mail para notificar o usuário que seu chamado foi finalizado no DeskHelp. Inclua número, título, solução e mensagem de agradecimento.',
    };
    const prompt = exemplos[tipo] || 'Redija um e-mail de notificação para o DeskHelp.';
    // IA local: usar aiService para gerar texto base (pode ser expandido para LLM externo)
    const aiService = require('../services/aiService');
    const texto = await aiService.suggestEmailTemplate(prompt, tipo);
    // Gera campos padrão
    res.json({
      assunto: texto.assunto || 'Notificação DeskHelp',
      html: texto.html || `<p>${texto.texto || 'Nova notificação do DeskHelp.'}</p>`,
      texto: texto.texto || 'Nova notificação do DeskHelp.'
    });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao sugerir template', detalhe: e.message });
  }
});

module.exports = router;
