const nodemailer = require('nodemailer');

// Função para buscar configurações do banco de dados
async function getEmailConfig() {
  try {
    const EmailConfig = require('../models/EmailConfig');
    const config = await EmailConfig.findOne().sort({ criadoEm: -1 });
    return config;
  } catch (error) {
    console.log('Usando configurações do .env como fallback');
    return null;
  }
}

// Configuração do transportador de email
const createEmailTransporter = async () => {
  // Tenta buscar configuração do banco primeiro
  const dbConfig = await getEmailConfig();
  
  if (dbConfig && dbConfig.emailEnabled) {
    // Usa configuração do banco de dados
    if (dbConfig.emailService === 'gmail') {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: dbConfig.emailUser,
          pass: dbConfig.emailPassword
        }
      });
    }
    if (dbConfig.emailService === 'outlook') {
      return nodemailer.createTransport({
        service: 'hotmail',
        auth: {
          user: dbConfig.emailUser,
          pass: dbConfig.emailPassword
        }
      });
    }
    if (dbConfig.emailService === 'smtp' && dbConfig.smtpHost) {
      let secureConnection = dbConfig.smtpSecure; // Valor padrão do banco
      if (dbConfig.smtpPort === 587) {
        secureConnection = false; // STARTTLS na porta 587 não é 'secure' no sentido estrito do nodemailer
      } else if (dbConfig.smtpPort === 465) {
        secureConnection = true; // SMTPS na porta 465 é 'secure'
      }
      // Para outras portas, mantém o que está no banco.

      const transportConfig = {
        host: dbConfig.smtpHost,
        port: dbConfig.smtpPort || 587,
        secure: secureConnection, // Usa a lógica corrigida
        auth: {
          user: dbConfig.emailUser,
          pass: dbConfig.emailPassword
        },        tls: {
          // Configurações específicas para resolver "wrong version number" com Exchange/Outlook
          rejectUnauthorized: process.env.NODE_ENV === 'production',
          minVersion: 'TLSv1.2', // Força TLS 1.2 ou superior
          maxVersion: 'TLSv1.3' // Limita a TLS 1.3
        }
      };

      console.log('🔧 SMTP Transport Config (DB):', {
        host: transportConfig.host,
        port: transportConfig.port,
        secure: transportConfig.secure,
        user: transportConfig.auth.user,
        tls: transportConfig.tls
      });

      return nodemailer.createTransport(transportConfig);
    }
  }
  
  // Fallback para variáveis de ambiente
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }
  if (process.env.EMAIL_SERVICE === 'outlook') {
    return nodemailer.createTransport({
      service: 'hotmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }
  
  if (process.env.SMTP_HOST) {
    let secureEnv = process.env.SMTP_SECURE === 'true';
    const portEnv = parseInt(process.env.SMTP_PORT, 10) || 587;
    if (portEnv === 587) {
      secureEnv = false;
    } else if (portEnv === 465) {
      secureEnv = true;
    }    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: portEnv,
      secure: secureEnv, // Usa a lógica corrigida para .env
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
        minVersion: 'TLSv1.2',
        maxVersion: 'TLSv1.3'
      }
    });
  }
  
  // Para desenvolvimento - Use Ethereal (emails falsos)
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'ethereal.user@ethereal.email',
      pass: 'ethereal.pass'
    }
  });
};

// Função para enviar email
async function enviarEmail({ destinatario, assunto, html, texto }) {
  try {
    // Verifica se está habilitado (banco ou .env)
    const dbConfig = await getEmailConfig();
    const emailEnabled = dbConfig ? dbConfig.emailEnabled : (process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true');
    
    if (!emailEnabled) {
      console.log('📧 Emails desabilitados');
      return { success: false, error: 'Emails desabilitados' };
    }

    const transporter = await createEmailTransporter();
    
    // Determina o remetente (banco ou .env)
    const emailFrom = dbConfig?.emailFrom || process.env.EMAIL_FROM || 'DeskHelp <noreply@deskhelp.com>';
    
    const mailOptions = {
      from: emailFrom,
      to: destinatario,
      subject: assunto,
      text: texto,
      html: html
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email enviado:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error.message);
    return { success: false, error: error.message };
  }
}

// Templates de email
const templateEmail = {
  // Template para novo chamado (para admins)
  novoChamado: (chamado, usuario) => ({
    assunto: `🎫 Novo Chamado #${chamado.numeroChamado} - ${chamado.titulo}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1976d2; color: white; padding: 20px; text-align: center;">
          <h1>🎫 DeskHelp - Novo Chamado</h1>
        </div>
        <div style="padding: 20px; background: #f5f5f5;">
          <h2>Chamado #${chamado.numeroChamado}</h2>
          <div style="background: white; padding: 15px; border-radius: 5px; margin: 10px 0;">
            <p><strong>Título:</strong> ${chamado.titulo}</p>
            <p><strong>Descrição:</strong> ${chamado.descricao}</p>
            <p><strong>Prioridade:</strong> <span style="color: ${getPrioridadeCor(chamado.prioridade)}">${chamado.prioridade}</span></p>
            <p><strong>Departamento:</strong> ${chamado.departamento}</p>
            <p><strong>Categoria:</strong> ${chamado.categoria || 'N/A'}</p>
            <p><strong>Criado por:</strong> ${usuario.nome} (${usuario.email})</p>
            <p><strong>Data:</strong> ${new Date(chamado.criadoEm).toLocaleString('pt-BR')}</p>
          </div>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/chamados/${chamado._id}" 
               style="background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              📋 Ver Chamado
            </a>
          </div>
        </div>
        <div style="background: #333; color: white; padding: 10px; text-align: center; font-size: 12px;">
          DeskHelp - Sistema de Chamados
        </div>
      </div>
    `,
    texto: `
      Novo chamado criado no DeskHelp
      
      Número: #${chamado.numeroChamado}
      Título: ${chamado.titulo}
      Descrição: ${chamado.descricao}
      Prioridade: ${chamado.prioridade}
      Departamento: ${chamado.departamento}
      Criado por: ${usuario.nome} (${usuario.email})
      Data: ${new Date(chamado.criadoEm).toLocaleString('pt-BR')}
      
      Acesse o sistema para mais detalhes.
    `
  }),

  // Template para comentário em chamado
  comentarioChamado: (chamado, autorComentario, comentario, isParaAdmin = false) => ({
    assunto: `💬 ${isParaAdmin ? 'Novo comentário' : 'Resposta'} no Chamado #${chamado.numeroChamado}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${isParaAdmin ? '#1976d2' : '#4caf50'}; color: white; padding: 20px; text-align: center;">
          <h1>💬 ${isParaAdmin ? 'Novo Comentário' : 'Resposta do Suporte'}</h1>
        </div>
        <div style="padding: 20px; background: #f5f5f5;">
          <h2>Chamado #${chamado.numeroChamado}</h2>
          <p><strong>Título:</strong> ${chamado.titulo}</p>
          <div style="background: white; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid ${isParaAdmin ? '#1976d2' : '#4caf50'};">
            <p><strong>${isParaAdmin ? 'Comentário de' : 'Resposta de'}:</strong> ${autorComentario}</p>
            <p style="margin-top: 10px;">${comentario}</p>
          </div>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/chamados/${chamado._id}" 
               style="background: ${isParaAdmin ? '#1976d2' : '#4caf50'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              📋 Ver Chamado Completo
            </a>
          </div>
        </div>
        <div style="background: #333; color: white; padding: 10px; text-align: center; font-size: 12px;">
          DeskHelp - Sistema de Chamados
        </div>
      </div>
    `,
    texto: `
      ${isParaAdmin ? 'Novo comentário' : 'Resposta do suporte'} no chamado #${chamado.numeroChamado}
      
      Título: ${chamado.titulo}
      ${isParaAdmin ? 'Comentário de' : 'Resposta de'}: ${autorComentario}
      
      ${comentario}
      
      Acesse o sistema para ver o chamado completo.
    `
  }),

  // Template para atribuição/transferência
  chamadoAtribuido: (chamado, nomeAtribuido, isTransferencia = false) => ({
    assunto: `👤 Chamado #${chamado.numeroChamado} ${isTransferencia ? 'transferido' : 'atribuído'} para você`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #ff9800; color: white; padding: 20px; text-align: center;">
          <h1>👤 Chamado ${isTransferencia ? 'Transferido' : 'Atribuído'}</h1>
        </div>
        <div style="padding: 20px; background: #f5f5f5;">
          <h2>Chamado #${chamado.numeroChamado}</h2>
          <div style="background: white; padding: 15px; border-radius: 5px; margin: 10px 0;">
            <p><strong>Título:</strong> ${chamado.titulo}</p>
            <p><strong>Prioridade:</strong> <span style="color: ${getPrioridadeCor(chamado.prioridade)}">${chamado.prioridade}</span></p>
            <p><strong>Departamento:</strong> ${chamado.departamento}</p>
            <p><strong>${isTransferencia ? 'Transferido' : 'Atribuído'} para:</strong> ${nomeAtribuido}</p>
          </div>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/chamados/${chamado._id}" 
               style="background: #ff9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              📋 Atender Chamado
            </a>
          </div>
        </div>
        <div style="background: #333; color: white; padding: 10px; text-align: center; font-size: 12px;">
          DeskHelp - Sistema de Chamados
        </div>
      </div>
    `,
    texto: `
      Chamado ${isTransferencia ? 'transferido' : 'atribuído'} para você
      
      Número: #${chamado.numeroChamado}
      Título: ${chamado.titulo}
      Prioridade: ${chamado.prioridade}
      ${isTransferencia ? 'Transferido' : 'Atribuído'} para: ${nomeAtribuido}
      
      Acesse o sistema para atender o chamado.
    `
  }),

  // Template para finalização de chamado
  chamadoFinalizado: (chamado, solucao) => ({
    assunto: `✅ Chamado #${chamado.numeroChamado} foi finalizado`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #4caf50; color: white; padding: 20px; text-align: center;">
          <h1>✅ Chamado Finalizado</h1>
        </div>
        <div style="padding: 20px; background: #f5f5f5;">
          <h2>Chamado #${chamado.numeroChamado}</h2>
          <div style="background: white; padding: 15px; border-radius: 5px; margin: 10px 0;">
            <p><strong>Título:</strong> ${chamado.titulo}</p>
            <p><strong>Status:</strong> <span style="color: #4caf50;">Finalizado</span></p>
            ${solucao ? `<p><strong>Solução:</strong> ${solucao}</p>` : ''}
            <p><strong>Data de finalização:</strong> ${new Date().toLocaleString('pt-BR')}</p>
          </div>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/chamados/${chamado._id}" 
               style="background: #4caf50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              📋 Ver Detalhes
            </a>
          </div>
          <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 10px 0; border: 1px solid #ffeaa7;">
            <p style="margin: 0; color: #856404;">
              <strong>💡 Avalie nosso atendimento!</strong><br>
              Sua opinião é muito importante para melhorarmos nossos serviços.
            </p>
          </div>
        </div>
        <div style="background: #333; color: white; padding: 10px; text-align: center; font-size: 12px;">
          DeskHelp - Sistema de Chamados
        </div>
      </div>
    `,
    texto: `
      Seu chamado foi finalizado
      
      Número: #${chamado.numeroChamado}
      Título: ${chamado.titulo}
      Status: Finalizado
      ${solucao ? `Solução: ${solucao}` : ''}
      Data de finalização: ${new Date().toLocaleString('pt-BR')}
      
      Acesse o sistema para ver os detalhes ou avaliar nosso atendimento.
    `
  })
};

// Função auxiliar para cor da prioridade
function getPrioridadeCor(prioridade) {
  const cores = {
    'Baixa': '#4caf50',
    'Média': '#ff9800',
    'Alta': '#f44336',
    'Urgente': '#d32f2f'
  };
  return cores[prioridade] || '#757575';
}

// Funções específicas para cada tipo de notificação
async function notificarNovoChamadoPorEmail(chamado, usuario, admins) {
  // Verifica se está habilitado (banco ou .env)
  const dbConfig = await getEmailConfig();
  const emailEnabled = dbConfig ? dbConfig.emailEnabled : (process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true');
  
  if (!emailEnabled) return;
  
  const template = templateEmail.novoChamado(chamado, usuario);
  
  for (const admin of admins) {
    if (admin.email) {
      await enviarEmail({
        destinatario: admin.email,
        assunto: template.assunto,
        html: template.html,
        texto: template.texto
      });
    }
  }
}

async function notificarComentarioPorEmail(chamado, autorComentario, comentario, destinatarios, isParaAdmin = false) {
  // Verifica se está habilitado (banco ou .env)
  const dbConfig = await getEmailConfig();
  const emailEnabled = dbConfig ? dbConfig.emailEnabled : (process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true');
  
  if (!emailEnabled) return;
  
  const template = templateEmail.comentarioChamado(chamado, autorComentario, comentario, isParaAdmin);
  
  for (const destinatario of destinatarios) {
    if (destinatario.email) {
      await enviarEmail({
        destinatario: destinatario.email,
        assunto: template.assunto,
        html: template.html,
        texto: template.texto
      });
    }
  }
}

async function notificarAtribuicaoPorEmail(chamado, emailAtribuido, nomeAtribuido, isTransferencia = false) {
  // Verifica se está habilitado (banco ou .env)
  const dbConfig = await getEmailConfig();
  const emailEnabled = dbConfig ? dbConfig.emailEnabled : (process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true');
  
  if (!emailEnabled) return;
  
  const template = templateEmail.chamadoAtribuido(chamado, nomeAtribuido, isTransferencia);
  
  await enviarEmail({
    destinatario: emailAtribuido,
    assunto: template.assunto,
    html: template.html,
    texto: template.texto
  });
}

async function notificarFinalizacaoPorEmail(chamado, usuarioDono, solucao) {
  // Verifica se está habilitado (banco ou .env)
  const dbConfig = await getEmailConfig();
  const emailEnabled = dbConfig ? dbConfig.emailEnabled : (process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true');
  
  if (!emailEnabled) return;
  
  const template = templateEmail.chamadoFinalizado(chamado, solucao);
  
  await enviarEmail({
    destinatario: usuarioDono.email,
    assunto: template.assunto,
    html: template.html,
    texto: template.texto
  });
}

module.exports = {
  enviarEmail,
  notificarNovoChamadoPorEmail,
  notificarComentarioPorEmail,
  notificarAtribuicaoPorEmail,
  notificarFinalizacaoPorEmail,
  templateEmail
};
