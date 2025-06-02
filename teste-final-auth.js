const axios = require('axios');

async function testarComAutenticacao() {
    console.log('🔍 Iniciando teste com autenticação...');
    
    try {        // 1. Fazer login para obter token
        console.log('1. Fazendo login...');
        const loginResponse = await axios.post('http://localhost:5000/api/users/login', {
            email: 'admin@deskhelp.com',
            senha: '123456'
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Login realizado com sucesso');
        
        // 2. Configurar headers com token
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        // 3. Verificar configuração atual
        console.log('\n2. Verificando configuração atual...');
        const currentConfig = await axios.get('http://localhost:5000/api/email-config', { headers });
        console.log('📋 Configuração atual:', JSON.stringify(currentConfig.data, null, 2));
        
        // 4. Dados de teste
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
        
        console.log('\n3. Enviando dados de teste...');
        
        // 5. Salvar configuração
        const putResponse = await axios.put('http://localhost:5000/api/email-config', dadosTeste, { headers });
        console.log('✅ PUT realizado com sucesso:', putResponse.status);
        console.log('📄 Resposta:', JSON.stringify(putResponse.data, null, 2));
        
        // 6. Verificar se foi salvo
        console.log('\n4. Verificando se foi salvo...');
        const verifyResponse = await axios.get('http://localhost:5000/api/email-config', { headers });
        console.log('📋 Dados verificados:', JSON.stringify(verifyResponse.data, null, 2));
        
        // 7. Verificar se os templates estão corretos
        const templates = verifyResponse.data.templates;
        let sucessoTotal = true;
        
        console.log('\n5. Verificando cada template...');
        
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
        
        if (sucessoTotal) {
            console.log('\n🎉 SUCESSO TOTAL! Todos os templates foram salvos corretamente!');
            return true;
        } else {
            console.log('\n❌ FALHA! Alguns templates não foram salvos corretamente');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
        if (error.response) {
            console.error('📋 Status:', error.response.status);
            console.error('📋 Resposta do erro:', error.response.data);
        }
        return false;
    }
}

// Executar teste
testarComAutenticacao().then(sucesso => {
    if (sucesso) {
        console.log('\n🎉 TESTE FINAL APROVADO! O sistema de templates está funcionando perfeitamente!');
    } else {
        console.log('\n💥 TESTE FALHOU! Ainda há problemas com o salvamento.');
    }
    process.exit(sucesso ? 0 : 1);
});
