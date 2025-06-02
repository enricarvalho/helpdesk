const mongoose = require('mongoose');

const emailConfigSchema = new mongoose.Schema({
  // Configurações básicas
  emailEnabled: {
    type: Boolean,
    default: true
  },
  emailService: {
    type: String,
    enum: ['gmail', 'smtp'],
    default: 'gmail'
  },
  emailUser: {
    type: String,
    required: true
  },
  emailPassword: {
    type: String,
    required: true
  },
  emailFrom: {
    type: String,
    default: 'DeskHelp <noreply@deskhelp.com>'
  },
  
  // Configurações SMTP personalizadas
  smtpHost: String,
  smtpPort: {
    type: Number,
    default: 587
  },
  smtpSecure: {
    type: Boolean,
    default: false
  },
    // Templates personalizados para notificações por email
  templates: {
    // Template para quando um novo chamado é criado
    novoChamado: {
      assunto: {
        type: String,
        default: '🎫 Novo Chamado #{numeroChamado} - {titulo}'
      },
      corpo: {
        type: String,
        default: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #1976d2; color: white; padding: 20px; text-align: center;">
    <h1>🎫 DeskHelp - Novo Chamado</h1>
  </div>
  <div style="padding: 20px; background: #f5f5f5;">
    <h2>Chamado #{numeroChamado}</h2>
    <div style="background: white; padding: 15px; border-radius: 5px; margin: 10px 0;">
      <p><strong>Título:</strong> {titulo}</p>
      <p><strong>Descrição:</strong> {descricao}</p>
      <p><strong>Prioridade:</strong> <span style="color: {corPrioridade}">{prioridade}</span></p>
      <p><strong>Departamento:</strong> {departamento}</p>
      <p><strong>Criado por:</strong> {nomeUsuario} ({emailUsuario})</p>
      <p><strong>Data:</strong> {dataFormatada}</p>
    </div>
    <div style="text-align: center; margin: 20px 0;">
      <a href="{linkChamado}" style="background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">📋 Ver Chamado</a>
    </div>
  </div>
  <div style="background: #333; color: white; padding: 10px; text-align: center; font-size: 12px;">DeskHelp - Sistema de Chamados</div>
</div>`
      }
    },
    
    // Template para comentários em chamados
    comentario: {
      assunto: {
        type: String,
        default: '💬 Novo comentário no Chamado #{numeroChamado}'
      },
      corpo: {
        type: String,
        default: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #2196f3; color: white; padding: 20px; text-align: center;">
    <h1>💬 Novo Comentário</h1>
  </div>
  <div style="padding: 20px; background: #f5f5f5;">
    <h2>Chamado #{numeroChamado}</h2>
    <p><strong>Título:</strong> {titulo}</p>
    <div style="background: white; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #2196f3;">
      <p><strong>Comentário de:</strong> {nomeAutor}</p>
      <p style="margin-top: 10px;">{comentario}</p>
    </div>
    <div style="text-align: center; margin: 20px 0;">
      <a href="{linkChamado}" style="background: #2196f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">📋 Ver Chamado</a>
    </div>
  </div>
  <div style="background: #333; color: white; padding: 10px; text-align: center; font-size: 12px;">DeskHelp - Sistema de Chamados</div>
</div>`
      }
    },
    
    // Template para atribuição de chamados
    atribuicao: {
      assunto: {
        type: String,
        default: '👤 Chamado #{numeroChamado} atribuído para você'
      },
      corpo: {
        type: String,
        default: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #ff9800; color: white; padding: 20px; text-align: center;">
    <h1>👤 Chamado Atribuído</h1>
  </div>
  <div style="padding: 20px; background: #f5f5f5;">
    <h2>Chamado #{numeroChamado}</h2>
    <div style="background: white; padding: 15px; border-radius: 5px; margin: 10px 0;">
      <p><strong>Título:</strong> {titulo}</p>
      <p><strong>Prioridade:</strong> <span style="color: {corPrioridade}">{prioridade}</span></p>
      <p><strong>Departamento:</strong> {departamento}</p>
      <p><strong>Atribuído para:</strong> {nomeAtribuido}</p>
    </div>
    <div style="text-align: center; margin: 20px 0;">
      <a href="{linkChamado}" style="background: #ff9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">📋 Atender Chamado</a>
    </div>
  </div>
  <div style="background: #333; color: white; padding: 10px; text-align: center; font-size: 12px;">DeskHelp - Sistema de Chamados</div>
</div>`
      }
    },
    
    // Template para finalização de chamados
    finalizacao: {
      assunto: {
        type: String,
        default: '✅ Chamado #{numeroChamado} foi finalizado'
      },
      corpo: {
        type: String,
        default: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #4caf50; color: white; padding: 20px; text-align: center;">
    <h1>✅ Chamado Finalizado</h1>
  </div>
  <div style="padding: 20px; background: #f5f5f5;">
    <h2>Chamado #{numeroChamado}</h2>
    <div style="background: white; padding: 15px; border-radius: 5px; margin: 10px 0;">
      <p><strong>Título:</strong> {titulo}</p>
      <p><strong>Status:</strong> <span style="color: #4caf50;">Finalizado</span></p>
      <p><strong>Solução:</strong> {solucao}</p>
      <p><strong>Data de finalização:</strong> {dataFinalizacao}</p>
    </div>
    <div style="text-align: center; margin: 20px 0;">
      <a href="{linkChamado}" style="background: #4caf50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">📋 Ver Detalhes</a>
    </div>
  </div>
  <div style="background: #333; color: white; padding: 10px; text-align: center; font-size: 12px;">DeskHelp - Sistema de Chamados</div>
</div>`
      }
    }
  },
  
  // Metadados
  criadoEm: {
    type: Date,
    default: Date.now
  },
  atualizadoEm: {
    type: Date,
    default: Date.now
  },
  criadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Middleware para atualizar atualizadoEm
emailConfigSchema.pre('save', function(next) {
  this.atualizadoEm = new Date();
  next();
});

module.exports = mongoose.model('EmailConfig', emailConfigSchema);
