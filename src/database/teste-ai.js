const axios = require('axios');

async function testarAI() {
  try {
    console.log('🤖 Testando AI Assistant...');
    
    // 1. Login
    const loginResponse = await axios.post('http://localhost:5000/api/users/login', {
      email: 'admin@deskhelp.com',
      senha: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login realizado!');
    
    // 2. Criar chamado de teste
    const chamadoResponse = await axios.post('http://localhost:5000/api/chamados', {
      titulo: 'Não consigo fazer login no sistema',
      descricao: 'Minha senha não funciona e o sistema está bloqueado',
      prioridade: 'Alta',
      categoria: 'TI'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const chamadoId = chamadoResponse.data._id;
    console.log('✅ Chamado criado:', chamadoId);
    
    // 3. Testar AI Analysis
    console.log('🧠 Testando análise de IA...');
    const aiResponse = await axios.get(`http://localhost:5000/api/chamados/${chamadoId}/ai-analysis`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Análise de IA funcionando!');
    console.log('🎯 Resultado:', JSON.stringify(aiResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    if (error.response?.data && typeof error.response.data === 'string') {
      console.log('Resposta HTML recebida (primeiros 200 caracteres):');
      console.log(error.response.data.substring(0, 200));
    }
  }
}

testarAI();
