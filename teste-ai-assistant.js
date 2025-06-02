const axios = require('axios');

async function testarAIAssistant() {
  try {
    console.log('🤖 Testando AI Assistant...');
    
    // Primeiro fazer login para obter token
    console.log('📝 Fazendo login...');
    const loginResponse = await axios.post('http://localhost:5000/api/users/login', {
      email: 'admin@deskhelp.com',
      senha: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login realizado com sucesso!');
    
    // Criar um chamado de teste para análise de IA
    console.log('📋 Criando chamado de teste...');
    const chamadoResponse = await axios.post('http://localhost:5000/api/chamados', {
      titulo: 'Não consigo fazer login no sistema',
      descricao: 'Estou tentando acessar o sistema mas minha senha não funciona. O sistema diz que a senha está incorreta mas tenho certeza que está certa. Preciso de ajuda para acessar minha conta.',
      prioridade: 'Alta',
      categoria: 'Suporte Técnico'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const chamadoId = chamadoResponse.data._id;
    console.log('✅ Chamado criado com ID:', chamadoId);
    
    // Testar a análise de IA
    console.log('🧠 Solicitando análise de IA...');
    const aiResponse = await axios.get(`http://localhost:5000/api/chamados/${chamadoId}/ai-analysis`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Análise de IA obtida com sucesso!');
    console.log('\n📊 Resultado da Análise:');
    console.log('==========================================');
    console.log('Categoria Detectada:', aiResponse.data.analysis.analysis.detectedCategory);
    console.log('Confiança:', aiResponse.data.analysis.analysis.confidence + '%');
    console.log('Prioridade Sugerida:', aiResponse.data.analysis.analysis.suggestedPriority);
    console.log('Tempo Estimado:', aiResponse.data.analysis.analysis.estimatedResolutionTime);
    
    console.log('\n💡 Sugestões de Solução:');
    aiResponse.data.analysis.suggestions.forEach((sugestao, index) => {
      console.log(`${index + 1}. ${sugestao}`);
    });
    
    if (aiResponse.data.analysis.similarCases.length > 0) {
      console.log('\n🔍 Casos Similares:');
      aiResponse.data.analysis.similarCases.forEach((caso, index) => {
        console.log(`${index + 1}. ${caso.titulo} (Similaridade: ${(caso.similarity * 100).toFixed(1)}%)`);
      });
    }
    
    console.log('\n👤 Insights do Usuário:');
    const insights = aiResponse.data.analysis.userInsights;
    console.log('Total de Chamados:', insights.totalChamados);
    console.log('Taxa de Resolução:', insights.taxaResolucao + '%');
    console.log('Usuário Recorrente:', insights.usuarioRecorrente ? 'Sim' : 'Não');
    
    // Testar feedback
    console.log('\n📝 Enviando feedback...');
    await axios.post(`http://localhost:5000/api/chamados/${chamadoId}/ai-feedback`, {
      suggestionUsed: aiResponse.data.analysis.suggestions[0],
      helpful: 5,
      feedback: 'Sugestões muito úteis e precisas!'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Feedback enviado com sucesso!');
    console.log('\n🎉 Teste do AI Assistant concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('Status HTTP:', error.response.status);
    }
  }
}

testarAIAssistant();
