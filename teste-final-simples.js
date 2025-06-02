const axios = require('axios');

async function testarSalvamentoTemplates() {
    console.log('🔍 Iniciando teste final de salvamento de templates...');
    
    try {
        // 1. Primeiro, verificar se o servidor está rodando
        console.log('1. Verificando se o servidor está rodando...');
        const healthCheck = await axios.get('http://localhost:5000/api/email-config');
        console.log('✅ Servidor está rodando');
        
        // 2. Dados de teste simples
        const dadosTeste = {
            templates: {
                novoChamado: {
                    assunto: 'TESTE - Novo Chamado #{numero}',
                    corpo: 'TESTE - Um novo chamado foi criado com número #{numero}'
                },
                comentario: {
                    assunto: 'TESTE - Comentário no Chamado #{numero}',
                    corpo: 'TESTE - Novo comentário adicionado ao chamado #{numero}'
                }
            }
        };
        
        console.log('2. Enviando dados de teste:', JSON.stringify(dadosTeste, null, 2));
        
        // 3. Salvar configuração
        const response = await axios.put('http://localhost:5000/api/email-config', dadosTeste);
        console.log('✅ Resposta do PUT:', response.status);
        console.log('📄 Dados salvos:', JSON.stringify(response.data, null, 2));
        
        // 4. Verificar se foi salvo (GET)
        console.log('\n3. Verificando se foi salvo corretamente...');
        const getResponse = await axios.get('http://localhost:5000/api/email-config');
        console.log('📋 Dados recuperados:', JSON.stringify(getResponse.data, null, 2));
        
        // 5. Verificar se os templates estão corretos
        const templates = getResponse.data.templates;
        if (templates.novoChamado.assunto.includes('TESTE') && 
            templates.comentario.assunto.includes('TESTE')) {
            console.log('✅ SUCESSO! Templates foram salvos corretamente!');
            return true;
        } else {
            console.log('❌ FALHA! Templates não foram salvos corretamente');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
        if (error.response) {
            console.error('📋 Resposta do erro:', error.response.data);
        }
        return false;
    }
}

// Executar teste
testarSalvamentoTemplates().then(sucesso => {
    if (sucesso) {
        console.log('\n🎉 TESTE FINAL APROVADO! O sistema de templates está funcionando!');
    } else {
        console.log('\n💥 TESTE FALHOU! Ainda há problemas com o salvamento.');
    }
    process.exit(sucesso ? 0 : 1);
});
