console.log('Teste simples iniciando...');

const http = require('http');

const data = JSON.stringify({
  email: 'usuario@deskhelp.com',
  senha: 'User123!'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/users/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('Fazendo requisição...');

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log(`Resposta completa: ${body}`);
  });
});

req.on('error', (e) => {
  console.log(`Erro: ${e.message}`);
});

req.write(data);
req.end();

console.log('Requisição enviada');
