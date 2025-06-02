const axios = require('axios');

async function testarAIAnalysis() {
  try {
    console.log('🤖 Testando rota de AI Analysis...');
    
    // 1. Fazer login
    console.log('📝 Fazendo login...');
    const loginResponse = await axios.post('http://localhost:5000/api/users/login', {
      email: 'admin@deskhelp.com',
      senha: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login realizado com sucesso!');
    
    // 2. Buscar chamados existentes
    console.log('🔍 Buscando chamados existentes...');
    const chamadosResponse = await axios.get('http://localhost:5000/api/chamados', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`📊 Encontrados ${chamadosResponse.data.length} chamados`);
    
    if (chamadosResponse.data.length === 0) {
      console.log('⚠️ Nenhum chamado encontrado. Criando um chamado de teste...');
      
      // Criar um chamado de teste
      const novoChamado = await axios.post('http://localhost:5000/api/chamados', {
        titulo: 'Problema com login no sistema',
        descricao: 'Não consigo fazer login no sistema. A senha parece estar incorreta e o usuário está bloqueado.',
        prioridade: 'Alta',
        categoria: 'TI'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Chamado criado:', novoChamado.data._id);
      chamadosResponse.data.push(novoChamado.data);
    }
    
    // 3. Testar análise de IA no primeiro chamado
    const chamadoId = chamadosResponse.data[0]._id;
    console.log(`🧠 Testando análise de IA para chamado: ${chamadoId}`);
    
    const aiResponse = await axios.get(`http://localhost:5000/api/chamados/${chamadoId}/ai-analysis`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Análise de IA obtida com sucesso!');
    console.log('🎯 Resultados da análise:');
    console.log(JSON.stringify(aiResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    console.error('Headers:', error.response?.headers);
    
    if (error.response?.data && typeof error.response.data === 'string') {
      console.error('Resposta em texto (possível HTML):', error.response.data.substring(0, 200));
    }
  }
}

testarAIAnalysis();
