const axios = require('axios');

async function testarRelatorio() {
  try {
    console.log('🔄 Testando relatório de problemas recorrentes...');
    
    // Fazer login com usuário admin válido
    console.log('📝 Fazendo login...');
    const loginResponse = await axios.post('http://localhost:5000/api/users/login', {
      email: 'admin@deskhelp.com',
      senha: 'senha123' // Tentando senha padrão
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login realizado com sucesso!');
    console.log('👤 Usuário:', loginResponse.data.user.nome);
    console.log('🔐 Admin:', loginResponse.data.user.isAdmin);
    
    // Testar a rota do relatório
    console.log('\n📊 Acessando relatório de problemas recorrentes...');
    const relatorioResponse = await axios.get('http://localhost:5000/api/chamados/relatorios/problemas-recorrentes', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Relatório obtido com sucesso!');
    console.log('📈 Estrutura dos dados:');
    
    if (relatorioResponse.data && relatorioResponse.data.length > 0) {
      console.log('🎯 Total de categorias:', relatorioResponse.data.length);
      console.log('📋 Primeira categoria:', relatorioResponse.data[0]);
      
      // Mostrar resumo
      const totalOcorrencias = relatorioResponse.data.reduce((sum, item) => sum + item.totalOcorrencias, 0);
      console.log('📊 Total de ocorrências:', totalOcorrencias);
      
      // Mostrar top 3
      console.log('\n🏆 TOP 3 PROBLEMAS MAIS RECORRENTES:');
      relatorioResponse.data.slice(0, 3).forEach((item, index) => {
        const percentual = ((item.totalOcorrencias / totalOcorrencias) * 100).toFixed(1);
        console.log(`${index + 1}. ${item.tipoProblema}: ${item.totalOcorrencias} ocorrências (${percentual}%)`);
      });
    } else {
      console.log('ℹ️ Nenhum dado encontrado no relatório');
    }
    
    console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO!');
    
  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:');
    
    if (error.response) {
      console.error('📊 Status HTTP:', error.response.status);
      console.error('📝 Resposta:', error.response.data);
      
      if (error.response.status === 401) {
        console.log('\n💡 DICA: Problema de autenticação. Verificando credenciais...');
        // Tentar com senha alternativa
        await tentarOutrasCredenciais();
      }
    } else {
      console.error('💥 Erro de conexão:', error.message);
    }
  }
}

async function tentarOutrasCredenciais() {
  const credenciais = [
    { email: 'admin@empresa.com', senha: 'admin123' },
    { email: 'admin@empresa.com', senha: 'senha123' },
    { email: 'enricarvalho@empresa.com', senha: 'admin123' },
    { email: 'enricarvalho@empresa.com', senha: 'senha123' }
  ];
  
  for (const cred of credenciais) {
    try {
      console.log(`🔑 Tentando: ${cred.email}`);
      const response = await axios.post('http://localhost:5000/api/users/login', cred);
      console.log(`✅ Sucesso com: ${cred.email}`);
      return response.data.token;
    } catch (err) {
      console.log(`❌ Falhou: ${cred.email}`);
    }
  }
  
  console.log('\n⚠️ Nenhuma credencial funcionou. Verifique os usuários no banco.');
}

// Executar teste
testarRelatorio();
