const axios = require('axios');

async function testarLoginCorreto() {
    console.log('🔍 Testando login com os campos corretos...');
    
    try {
        console.log('Tentando login com email e senha (não password)...');
        const response = await axios.post('http://localhost:5000/api/users/login', {
            email: 'admin@deskhelp.com',
            senha: '123456'  // Campo correto é 'senha', não 'password'
        });
        
        console.log('✅ Login realizado com sucesso!');
        console.log('📋 Resposta:', JSON.stringify(response.data, null, 2));
        return response.data.token;
        
    } catch (error) {
        console.error('❌ Erro no login:', error.message);
        if (error.response) {
            console.error('📋 Status:', error.response.status);
            console.error('📋 Resposta do erro:', error.response.data);
        }
        return null;
    }
}

async function testarTemplatesComToken(token) {
    if (!token) {
        console.log('❌ Sem token, não é possível testar templates');
        return false;
    }
    
    console.log('\n🔍 Testando salvamento de templates...');
    
    try {
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        // Dados de teste
        const dadosTeste = {
            templates: {
                novoChamado: {
                    assunto: 'TESTE FINAL - Novo Chamado #{numero}',
                    corpo: 'TESTE FINAL - Um novo chamado foi criado com número #{numero}'
                },
                comentario: {
                    assunto: 'TESTE FINAL - Comentário no Chamado #{numero}',
                    corpo: 'TESTE FINAL - Novo comentário adicionado ao chamado #{numero}'
                },
                atribuicao: {
                    assunto: 'TESTE FINAL - Chamado Atribuído #{numero}',
                    corpo: 'TESTE FINAL - O chamado #{numero} foi atribuído para você'
                },
                finalizacao: {
                    assunto: 'TESTE FINAL - Chamado Finalizado #{numero}',
                    corpo: 'TESTE FINAL - O chamado #{numero} foi finalizado'
                }
            }
        };
        
        console.log('📤 Enviando dados de teste...');
        
        // Salvar configuração
        const putResponse = await axios.put('http://localhost:5000/api/email-config', dadosTeste, { headers });
        console.log('✅ PUT realizado com sucesso:', putResponse.status);
        
        // Verificar se foi salvo
        console.log('📥 Verificando se foi salvo...');
        const verifyResponse = await axios.get('http://localhost:5000/api/email-config', { headers });
        
        // Verificar cada template
        const templates = verifyResponse.data.templates;
        let sucessoTotal = true;
        
        console.log('\n📋 Verificando cada template...');
        
        const templatesParaVerificar = ['novoChamado', 'comentario', 'atribuicao', 'finalizacao'];
        
        templatesParaVerificar.forEach(tipo => {
            if (templates[tipo] && 
                templates[tipo].assunto && 
                templates[tipo].assunto.includes('TESTE FINAL') &&
                templates[tipo].corpo && 
                templates[tipo].corpo.includes('TESTE FINAL')) {
                console.log(`✅ ${tipo}: OK`);
            } else {
                console.log(`❌ ${tipo}: FALHOU`);
                console.log(`   Assunto: ${templates[tipo]?.assunto || 'VAZIO'}`);
                console.log(`   Corpo: ${templates[tipo]?.corpo || 'VAZIO'}`);
                sucessoTotal = false;
            }
        });
        
        return sucessoTotal;
        
    } catch (error) {
        console.error('❌ Erro no teste de templates:', error.message);
        if (error.response) {
            console.error('📋 Status:', error.response.status);
            console.error('📋 Resposta do erro:', error.response.data);
        }
        return false;
    }
}

async function executarTesteFinal() {
    console.log('🚀 INICIANDO TESTE FINAL COMPLETO...\n');
    
    // 1. Testar login
    const token = await testarLoginCorreto();
    
    if (!token) {
        console.log('💥 FALHA NO LOGIN - não é possível continuar');
        return false;
    }
    
    // 2. Testar salvamento de templates
    const sucessoTemplates = await testarTemplatesComToken(token);
    
    if (sucessoTemplates) {
        console.log('\n🎉 SUCESSO TOTAL! O sistema de templates está funcionando perfeitamente!');
        console.log('✅ Login: OK');
        console.log('✅ Salvamento de templates: OK');
        console.log('✅ Verificação de dados: OK');
        return true;
    } else {
        console.log('\n❌ FALHA! Ainda há problemas com o salvamento de templates.');
        return false;
    }
}

executarTesteFinal().then(sucesso => {
    process.exit(sucesso ? 0 : 1);
});
