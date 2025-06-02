const axios = require('axios');

async function testarRelatorio() {
  try {
    console.log('🔄 Testando rota do relatório...');
    
    // Primeiro fazer login para obter token
    console.log('📝 Fazendo login...');
    const loginResponse = await axios.post('http://localhost:5000/api/users/login', {
      email: 'admin@deskhelp.com',
      senha: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login realizado com sucesso!');
    
    // Testar a rota do relatório
    console.log('📊 Acessando relatório de problemas recorrentes...');
    const relatorioResponse = await axios.get('http://localhost:5000/api/chamados/relatorios/problemas-recorrentes', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Relatório obtido com sucesso!');
    console.log('📈 Dados do relatório:');
    console.log(JSON.stringify(relatorioResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('Status HTTP:', error.response.status);
    }
  }
}

testarRelatorio();
