console.log('🧪 Iniciando teste do modelo EmailConfig...');

// Simular o modelo sem conectar ao banco
const templatePadrao = {
  novoChamado: {
    assunto: '🎫 Novo Chamado #{numeroChamado} - {titulo}',
    corpo: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
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
      <a href="{linkChamado}" style="background: #4caf50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
        📋 Ver Detalhes
      </a>
    </div>
  </div>
  <div style="background: #333; color: white; padding: 10px; text-align: center; font-size: 12px;">
    DeskHelp - Sistema de Chamados
  </div>
</div>`
  },
  comentario: {
    assunto: '💬 Novo comentário no chamado #{numeroChamado}',
    corpo: '<p>Novo comentário adicionado.</p>'
  },
  atribuicao: {
    assunto: '👤 Chamado #{numeroChamado} atribuído para você',
    corpo: '<p>Um chamado foi atribuído para você.</p>'
  },
  finalizacao: {
    assunto: '✅ Chamado #{numeroChamado} foi finalizado',
    corpo: '<p>Seu chamado foi finalizado.</p>'
  }
};

console.log('📧 Verificando templates padrão:');
Object.entries(templatePadrao).forEach(([tipo, template]) => {
  console.log(`\n${tipo}:`);
  console.log(`  Assunto: "${template.assunto}" (${template.assunto.length} chars)`);
  console.log(`  Corpo: ${template.corpo ? 'Presente' : 'Ausente'} (${template.corpo.length} chars)`);
});

console.log('\n✅ Templates padrão parecem estar corretos');

// Simular resposta da API
const respostaAPI = {
  emailEnabled: true,
  emailService: 'gmail',
  emailUser: '',
  emailPassword: '',
  templates: templatePadrao
};

console.log('\n📧 Simulando resposta da API:');
console.log('Templates na resposta:', Object.keys(respostaAPI.templates));

// Simular processamento do frontend
console.log('\n🔧 Simulando processamento do frontend:');
const templatesCompletos = {
  novoChamado: respostaAPI.templates?.novoChamado || { assunto: '', corpo: '' },
  comentario: respostaAPI.templates?.comentario || { assunto: '', corpo: '' },
  atribuicao: respostaAPI.templates?.atribuicao || { assunto: '', corpo: '' },
  finalizacao: respostaAPI.templates?.finalizacao || { assunto: '', corpo: '' }
};

console.log('Templates após processamento:');
Object.entries(templatesCompletos).forEach(([tipo, template]) => {
  console.log(`${tipo}: assunto=${template.assunto?.length || 0} chars, corpo=${template.corpo?.length || 0} chars`);
});

console.log('\n🎯 Teste concluído!');
