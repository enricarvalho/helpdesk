// API Base URL
const API_URL = 'http://localhost:5000/api';

export async function login(email, senha) {
  const resp = await fetch('http://localhost:5000/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha })
  });
  if (!resp.ok) {
    const erro = await resp.json();
    throw new Error(erro.error || 'Erro ao fazer login');
  }
  return await resp.json(); // { token, user }
}

// Helper para obter token salvo
function getToken() {
  return localStorage.getItem('token');
}

// Helper para requisições autenticadas
async function apiRequest(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  const resp = await fetch(url, { ...options, headers });
  if (!resp.ok) {
    let erroMsg = 'Erro na requisição';
    let responseBodyText = ''; // Variável para armazenar o corpo da resposta
    try {
      responseBodyText = await resp.text(); // Lê o corpo da resposta uma vez
      console.error('Erro na API:', resp.status, resp.statusText, responseBodyText); 
      // Tenta parsear o corpo lido como JSON
      const errorJson = JSON.parse(responseBodyText); 
      erroMsg = errorJson.error || errorJson.message || erroMsg;
    } catch (e) {
      // Se o parse falhar ou outra exceção ocorrer, usa o texto do corpo se disponível, ou a mensagem padrão
      console.error("Falha ao parsear JSON da resposta de erro, ou erro ao ler corpo:", e);
      erroMsg = responseBodyText || erroMsg; // Usa o texto bruto se o JSON falhar
    }
    throw new Error(erroMsg);
  }
  // Se a resposta for bem-sucedida (resp.ok), parseia como JSON.
  // Se a resposta bem-sucedida não tiver corpo ou não for JSON, isso pode gerar um erro.
  // Considerar verificar o Content-Type ou tratar o erro de parse aqui também se necessário.
  return resp.json(); 
}

// Chamados
export async function getChamados() {
  return apiRequest('http://localhost:5000/api/chamados');
}
export async function criarChamado(data) {
  // Se houver anexos, envia como multipart
  if (data.anexos && data.anexos.length > 0) {
    const token = getToken();
    const form = new FormData();
    form.append('titulo', data.titulo);
    form.append('descricao', data.descricao);
    form.append('prioridade', data.prioridade);
    form.append('departamento', data.departamento);
    form.append('categoria', data.categoria);
    // nome e email são opcionais
    if (data.nome) form.append('nome', data.nome);
    if (data.email) form.append('email', data.email);
    data.anexos.forEach(file => {
      form.append('anexos', file, file.name);
    });
    const resp = await fetch('http://localhost:5000/api/chamados', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form
    });
    if (!resp.ok) {
      let erro = 'Erro ao criar chamado';
      try { erro = (await resp.json()).error || erro; } catch {}
      throw new Error(erro);
    }
    return resp.json();
  } else {
    // Sem anexo, envia como JSON
    return apiRequest('http://localhost:5000/api/chamados', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}
// Atualiza campos do chamado (status, atribuição, prioridade, etc.)
export async function atualizarChamado(id, data) {
  return apiRequest(`http://localhost:5000/api/chamados/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}
export async function deletarChamado(id) {
  return apiRequest(`http://localhost:5000/api/chamados/${id}`, {
    method: 'DELETE'
  });
}

// Envia comentário/anexo para um chamado (PUT multipart)
export async function comentarChamado(id, { comentario, anexo, anexoNome }) {
  const token = localStorage.getItem('token');
  const form = new FormData();
  form.append('comentario', comentario);
  if (anexo) {
    form.append('anexo', anexo, anexoNome);
  }
  const resp = await fetch(`http://localhost:5000/api/chamados/${id}`, {
    method: 'PUT',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form
  });
  if (!resp.ok) {
    let erro = 'Erro ao enviar comentário';
    try { erro = (await resp.json()).error || erro; } catch {}
    throw new Error(erro);
  }
  return resp.json();
}

// Reabrir chamado (corrigido: POST, conforme definido na rota)
export async function reabrirChamado(id) {
  return apiRequest(`http://localhost:5000/api/chamados/${id}/reabrir`, {
    method: 'POST' // Alterado para POST para corresponder à definição da rota no backend
  });
}

// Usuários (admin)
export async function getUsuarios() {
  return apiRequest('http://localhost:5000/api/users');
}
export async function criarUsuario(data) {
  const resp = await fetch('http://localhost:5000/api/users/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!resp.ok) {
    let erro = 'Erro ao criar usuário';
    try { erro = (await resp.json()).error || erro; } catch {}
    throw new Error(erro);
  }
  return resp.json(); // { message, tokenCadastro }
}

export async function buscarUsuarioPorToken(token) {
  const resp = await fetch(`http://localhost:5000/api/users/finalizar/${token}`);
  if (!resp.ok) throw new Error('Token inválido ou expirado');
  return resp.json();
}

export async function finalizarCadastro(token, senhaTemp, novaSenha) {
  const resp = await fetch(`http://localhost:5000/api/users/finalizar/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senhaTemp, novaSenha })
  });
  if (!resp.ok) {
    let erro = 'Erro ao finalizar cadastro';
    try { erro = (await resp.json()).error || erro; } catch {}
    throw new Error(erro);
  }
  return resp.json();
}

// Atualizar usuário (admin ou próprio usuário)
export async function atualizarUsuario(id, data) {
  const token = localStorage.getItem('token');
  // Sempre envia como JSON para garantir que senhaAtual chegue corretamente
  return apiRequest(`http://localhost:5000/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

// Excluir usuário (admin)
export async function deletarUsuario(id) {
  return apiRequest(`http://localhost:5000/api/users/${id}`, {
    method: 'DELETE'
  });
}

// Departamentos
export async function getDepartamentos() {
  return apiRequest('http://localhost:5000/api/departamentos');
}
export async function criarDepartamento(data) {
  return apiRequest('http://localhost:5000/api/departamentos', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}
export async function deletarDepartamento(nome) {
  return apiRequest(`http://localhost:5000/api/departamentos/${encodeURIComponent(nome)}`, {
    method: 'DELETE'
  });
}

// Relatórios
export async function getRelatorioProblemasRecorrentes() {
  const response = await fetch(`${API_URL}/chamados/relatorios/problemas-recorrentes`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao buscar relatório de problemas recorrentes');
  }
  
  return response.json();
}

// IA Assistant
export async function getChamadoAIAnalysis(chamadoId) {
  const response = await fetch(`${API_URL}/chamados/${chamadoId}/ai-analysis`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao obter análise de IA');
  }
  
  return response.json();
}

export async function sendAIFeedback(chamadoId, feedback) {
  const response = await fetch(`${API_URL}/chamados/${chamadoId}/ai-feedback`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(feedback)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao enviar feedback de IA');
  }
  
  return response.json();
}

// Sugere template de e-mail com IA
export async function suggestEmailTemplate(tipo) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/email-config/suggest-template/${tipo}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) throw new Error('Erro ao sugerir template');
  return await response.json();
}

// Busca configuração de e-mail
export async function getEmailConfig() {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/email-config`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) throw new Error('Erro ao buscar configuração de e-mail');
  return await response.json();
}

// Salva configuração de e-mail
export async function saveEmailConfig(config) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/email-config`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(config)
  });
  if (!response.ok) throw new Error('Erro ao salvar configuração de e-mail');
  return await response.json();
}

// Testa envio de e-mail
export async function testEmailConfig(config) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/email-config/test`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(config)
  });
  if (!response.ok) throw new Error('Erro ao testar envio de e-mail');
  return await response.json();
}
