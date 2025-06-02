const axios = require('axios');

async function testarAI() {
  try {
    console.log('🤖 Testando AI Assistant...');
    
    // 1. Login
    console.log('📝 Fazendo login...');
    const loginResponse = await axios.post('http://localhost:5000/api/users/login', {
      email: 'admin@deskhelp.com',
      senha: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login realizado!');
    
    // 2. Buscar um chamado existente
    console.log('🔍 Buscando chamados...');
    const chamadosResponse = await axios.get('http://localhost:5000/api/chamados', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (chamadosResponse.data.length === 0) {
      console.log('📝 Criando um chamado de teste...');
      const novoChamado = await axios.post('http://localhost:5000/api/chamados', {
        titulo: 'Problema com senha do sistema',
        descricao: 'Não consigo fazer login, a senha parece estar bloqueada',
        prioridade: 'Alta',
        categoria: 'TI'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Chamado criado:', novoChamado.data._id);
      
      // 3. Testar IA no chamado criado
      console.log('🧠 Testando análise de IA...');
      const aiResponse = await axios.get(`http://localhost:5000/api/chamados/${novoChamado.data._id}/ai-analysis`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('✅ Análise de IA bem-sucedida!');
      console.log('📊 Resultado:', JSON.stringify(aiResponse.data, null, 2));
    } else {
      const chamadoId = chamadosResponse.data[0]._id;
      console.log('📋 Usando chamado existente:', chamadoId);
      
      // 3. Testar IA
      console.log('🧠 Testando análise de IA...');
      const aiResponse = await axios.get(`http://localhost:5000/api/chamados/${chamadoId}/ai-analysis`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('✅ Análise de IA bem-sucedida!');
      console.log('📊 Resultado:', JSON.stringify(aiResponse.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    console.error('URL:', error.config?.url);
  }
}

testarAI();
