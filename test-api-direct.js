const https = require('https');
const http = require('http');

// Teste simples da API
function testarAPI() {
    const postData = JSON.stringify({
        emailTeste: 'teste@teste.com'
    });

    const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/email-config/test',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer fake-token',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = http.request(options, (res) => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Headers: ${JSON.stringify(res.headers)}`);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('Resposta:');
            console.log(data);
            
            // Verificar se é JSON válido
            try {
                const json = JSON.parse(data);
                console.log('✓ Resposta é JSON válido');
                console.log('Dados parsed:', json);
            } catch (error) {
                console.log('✗ Resposta não é JSON válido');
                console.log('Erro:', error.message);
            }
        });
    });

    req.on('error', (error) => {
        console.error('Erro na requisição:', error);
    });

    req.write(postData);
    req.end();
}

console.log('Testando API de email...');
testarAPI();
