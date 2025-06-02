const axios = require('axios');

async function testarRelatorio() {
  try {
    console.log('=== TESTE RELATÓRIO DE PROBLEMAS RECORRENTES ===');
    console.log('Data/Hora:', new Date().toISOString());
    
    // Primeiro, vamos tentar fazer login como admin
    console.log('\n1. Fazendo login como admin...');
    const loginResponse = await axios.post('http://localhost:5000/api/users/login', {
      email: 'admin@deskhelp.com',
      senha: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('Login realizado com sucesso! Token obtido.');
    
    // Agora testar a rota do relatório
    console.log('\n2. Testando rota do relatório...');
    const relatorioResponse = await axios.get('http://localhost:5000/api/chamados/relatorios/problemas-recorrentes', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('\n3. RESULTADO DO RELATÓRIO:');
    console.log(JSON.stringify(relatorioResponse.data, null, 2));
    
    console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO!');
    
  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:');
    console.error('Status:', error.response?.status);
    console.error('Mensagem:', error.response?.data || error.message);
    console.error('Stack:', error.stack);
  }
}

testarRelatorio();
