const axios = require('axios');

async function testarLogin() {
    console.log('🔍 Testando login...');
    
    try {
        console.log('Tentando login com admin@deskhelp.com...');
        const response = await axios.post('http://localhost:5000/api/users/login', {
            email: 'admin@deskhelp.com',
            password: '123456'
        });
        
        console.log('✅ Login realizado com sucesso!');
        console.log('📋 Resposta:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.error('❌ Erro no login:', error.message);
        if (error.response) {
            console.error('📋 Status:', error.response.status);
            console.error('📋 Resposta do erro:', error.response.data);
        }
        
        // Vamos testar outros possíveis logins
        console.log('\n🔄 Testando outros possíveis logins...');
        
        const tentativas = [
            { email: 'admin', password: '123456' },
            { email: 'admin@admin.com', password: '123456' },
            { email: 'admin@deskhelp.com', password: 'admin' },
            { email: 'admin@deskhelp.com', password: '123' }
        ];
        
        for (const tentativa of tentativas) {
            try {
                console.log(`Tentando: ${tentativa.email} / ${tentativa.password}`);
                const resp = await axios.post('http://localhost:5000/api/users/login', tentativa);
                console.log('✅ SUCESSO com:', tentativa);
                console.log('📋 Resposta:', JSON.stringify(resp.data, null, 2));
                break;
            } catch (err) {
                console.log(`❌ Falhou: ${err.response?.status || err.message}`);
            }
        }
    }
}

testarLogin();
