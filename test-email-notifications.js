// Teste das Notificações por E-mail do DeskHelp
const http = require('http');

async function testarNotificacoesEmail() {
  console.log('🧪 Iniciando teste das notificações por email...\n');

  try {
    // 1. Testar login
    console.log('🔐 Fazendo login...');    const loginData = JSON.stringify({
      email: 'admin@deskhelp.com',
      senha: '123456'
    });

    const loginOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': loginData.length
      }
    };

    const token = await new Promise((resolve, reject) => {
      const req = http.request(loginOptions, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            const data = JSON.parse(body);
            console.log('✅ Login realizado com sucesso');
            resolve(data.token);
          } else {
            reject(new Error(`Login falhou: ${body}`));
          }
        });
      });
      req.on('error', reject);
      req.write(loginData);
      req.end();
    });

    // 2. Verificar configuração de email
    console.log('\n📧 Verificando configuração de email...');
    const configOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/email-config',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    await new Promise((resolve, reject) => {
      const req = http.request(configOptions, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            const config = JSON.parse(body);
            console.log('✅ Configuração de email encontrada:');
            console.log(`   - Habilitado: ${config.emailEnabled}`);
            console.log(`   - Serviço: ${config.emailService}`);
            console.log(`   - Email: ${config.emailUser || 'Não configurado'}`);
            resolve();
          } else {
            console.log('⚠️  Configuração de email não encontrada, usando .env como fallback');
            resolve();
          }
        });
      });
      req.on('error', reject);
      req.end();
    });

    // 3. Criar um chamado para testar notificação
    console.log('\n🎫 Criando chamado de teste...');
    const chamadoData = JSON.stringify({
      titulo: 'Teste de Notificação por Email',
      descricao: 'Este é um chamado de teste para verificar se as notificações por email estão funcionando corretamente.',
      prioridade: 'Alta',
      departamento: 'TI',
      categoria: 'Teste'
    });

    const chamadoOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/chamados',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': chamadoData.length,
        'Authorization': `Bearer ${token}`
      }
    };

    const chamado = await new Promise((resolve, reject) => {
      const req = http.request(chamadoOptions, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          if (res.statusCode === 201) {
            const data = JSON.parse(body);
            console.log(`✅ Chamado criado: ${data.numeroChamado} - ${data.titulo}`);
            console.log('📧 Email de novo chamado deve ter sido enviado para administradores');
            resolve(data);
          } else {
            reject(new Error(`Erro ao criar chamado: ${body}`));
          }
        });
      });
      req.on('error', reject);
      req.write(chamadoData);
      req.end();
    });

    // 4. Adicionar um comentário para testar notificação
    console.log('\n💬 Adicionando comentário...');
    const comentarioData = JSON.stringify({
      comentario: 'Este é um comentário de teste para verificar as notificações bidirecionais.'
    });

    const comentarioOptions = {
      hostname: 'localhost',
      port: 5000,
      path: `/api/chamados/${chamado._id}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': comentarioData.length,
        'Authorization': `Bearer ${token}`
      }
    };

    await new Promise((resolve, reject) => {
      const req = http.request(comentarioOptions, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log('✅ Comentário adicionado');
            console.log('📧 Email de comentário deve ter sido enviado (se configurado)');
            resolve();
          } else {
            reject(new Error(`Erro ao adicionar comentário: ${body}`));
          }
        });
      });
      req.on('error', reject);
      req.write(comentarioData);
      req.end();
    });

    // 5. Finalizar o chamado para testar notificação
    console.log('\n✅ Finalizando chamado...');
    const finalizarData = JSON.stringify({
      status: 'Finalizado',
      solucao: 'Teste concluído com sucesso. As notificações por email foram implementadas.'
    });

    const finalizarOptions = {
      hostname: 'localhost',
      port: 5000,
      path: `/api/chamados/${chamado._id}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': finalizarData.length,
        'Authorization': `Bearer ${token}`
      }
    };

    await new Promise((resolve, reject) => {
      const req = http.request(finalizarOptions, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log('✅ Chamado finalizado');
            console.log('📧 Email de finalização deve ter sido enviado para o criador');
            resolve();
          } else {
            reject(new Error(`Erro ao finalizar chamado: ${body}`));
          }
        });
      });
      req.on('error', reject);
      req.write(finalizarData);
      req.end();
    });

    console.log('\n🎉 Teste concluído com sucesso!');
    console.log('\n📋 Resumo dos emails que devem ter sido enviados:');
    console.log('   1. 📧 Novo chamado → Administradores');
    console.log('   2. 📧 Comentário → Administradores (se configurado)');
    console.log('   3. 📧 Finalização → Criador do chamado');
    
    console.log('\n⚠️  IMPORTANTE:');
    console.log('   - Para que os emails sejam realmente enviados, configure as credenciais em .env ou via interface web');
    console.log('   - Verifique os logs do backend para confirmar o envio');
    console.log('   - Se não tiver credenciais, o sistema usa Ethereal Email (emails de teste)');

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Executar teste
testarNotificacoesEmail();
