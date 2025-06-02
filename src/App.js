import React, { useState, useEffect, useRef } from 'react';
import NovoChamado from './NovoChamado';
import ListaChamados, { HistoricoChamados } from './ListaChamados';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import Login from './Login';
import Dashboard from './Dashboard';
import PainelTI from './PainelTI';
import CadastroUsuario from './CadastroUsuario';
import FinalizarCadastro from './FinalizarCadastro';
import PerfilUsuario from './PerfilUsuario';
import AlterarSenha from './AlterarSenha';
import Departamentos from './Departamentos';
import PaginaUsuariosAdmin from './PaginaUsuariosAdmin';
import RelatorioProblemas from './RelatorioProblemas'; // Novo import
import PainelEmailConfig from './PainelEmailConfig';
// Removido import de React Router para simplificar sistema
import { CssBaseline, Button, Paper, Typography, Snackbar, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Toolbar, TextField, Badge, Popover, List, ListItem, ListItemText, Divider, ListItemButton } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import { getChamados, deletarChamado, login as apiLogin, getUsuarios, atualizarChamado, getDepartamentos } from './services/api';
import { io } from 'socket.io-client';
import './App.css';

// Considera 'Resolvido', 'Encerrado' e 'Finalizado' como chamados resolvidos para sugestões inteligentes
const STATUS_RESOLVIDO = ['Resolvido', 'Encerrado', 'Finalizado'];

// Cache simples para chamados (escopo de módulo)
const chamadosCache = {
  data: null,
  timestamp: 0
};

// Função utilitária debounce
function debounceAsync(fn, delay = 400) {
  let timeout;
  let promise;
  return (...args) => {
    if (timeout) clearTimeout(timeout);
    if (promise) promise.cancelled = true;
    return new Promise((resolve, reject) => {
      timeout = setTimeout(async () => {
        try {
          promise = fn(...args);
          const result = await promise;
          resolve(result);
        } catch (e) {
          reject(e);
        }
      }, delay);
    });
  };
}

// Função para buscar chamados com cache e debounce
const fetchChamadosComCache = debounceAsync(async () => {
  const agora = Date.now();
  if (chamadosCache.data && agora - chamadosCache.timestamp < 30000) {
    return chamadosCache.data;
  }
  const data = await getChamados();
  chamadosCache.data = data;
  chamadosCache.timestamp = Date.now();
  return data;
}, 350);

function App() {
  const [colaborador, setColaborador] = useState(null); // Não usa mais localStorage
  const [chamados, setChamados] = useState([]); // Inicializa vazio, sempre via API
  const [usuarios, setUsuarios] = useState([]); // Inicializa vazio, sempre via API
  const [showCadastro, setShowCadastro] = useState(false);
  const [usuarioEdit, setUsuarioEdit] = useState(null);
  const [menu, setMenu] = useState('inicio');
  const [notificacao, setNotificacao] = useState({ open: false, mensagem: '' });
  const [showPerfil, setShowPerfil] = useState(false);
  const [showSenha, setShowSenha] = useState(false);
  // Novo: loading e erro para chamados do usuário comum
  const [loadingChamadosUser, setLoadingChamadosUser] = useState(false);
  const [erroChamadosUser, setErroChamadosUser] = useState('');
  // Novo: loading e erro para chamados do admin
  const [loadingChamadosAdmin, setLoadingChamadosAdmin] = useState(false);
  const [erroChamadosAdmin, setErroChamadosAdmin] = useState('');
  const [usuarioAlterarSenha, setUsuarioAlterarSenha] = useState(null);
  // Novo: loading e erro para usuários
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [erroUsuarios, setErroUsuarios] = useState('');
  const [detalheChamado, setDetalheChamado] = useState(null); // Novo: controle global do detalhe
  // Novo: buscar chamados da API ao abrir menu 'chamados' (painel admin)
  const [refreshChamados, setRefreshChamados] = useState(0);
  // Adiciona estado para busca do histórico de chamados
  const [buscaHistorico, setBuscaHistorico] = React.useState('');
  const socketRef = useRef(null);
  const [todosDepartamentos, setTodosDepartamentos] = useState([]); // Novo estado para departamentos
  const [notificacoes, setNotificacoes] = useState([]); // Notificações personalizadas
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0);
  const [toastNotificacao, setToastNotificacao] = useState({ open: false, msg: '' });
  const [isAuthLoading, setIsAuthLoading] = useState(true); // Novo: controla carregamento da autenticação
  const [anchorElNotificacoes, setAnchorElNotificacoes] = useState(null); // Para dropdown de notificações

  // Hooks do React Router removidos para evitar conflitos
  // const navigate = useNavigate();
  // const location = useLocation();

  // Redireciona para troca de senha obrigatória se senhaTemporaria for true
  useEffect(() => {
    if (colaborador && colaborador.senhaTemporaria) {
      // Sistema simplificado sem React Router
      setMenu('senha');
    }
  }, [colaborador]);

  // Buscar usuários da API quando necessário
  useEffect(() => {
    if (colaborador && colaborador.isAdmin && (menu === 'usuarios' || menu === 'chamados' || menu === 'inicio')) { // Adicionado 'inicio'
      setLoadingUsuarios(true);
      setErroUsuarios('');
      getUsuarios()
        .then(data => setUsuarios(data))
        .catch(err => setErroUsuarios(err.message))
        .finally(() => setLoadingUsuarios(false));
      if (menu === 'usuarios') setUsuarioAlterarSenha(null);
    }
  }, [colaborador, menu]);

  // Buscar departamentos quando necessário
  useEffect(() => {
    if (colaborador && colaborador.isAdmin && menu === 'inicio') {
      getDepartamentos()
        .then(data => setTodosDepartamentos(data || []))
        .catch(err => console.error("Erro ao buscar departamentos para dashboard:", err));
    }
  }, [colaborador, menu]);

  // Buscar chamados da API (unificado para admin e usuário comum)
  useEffect(() => {
    if (!colaborador) return;
    let shouldFetch = false;
    // Admin: busca em 'inicio' e 'chamados'
    if (colaborador.isAdmin && ['inicio', 'chamados'].includes(menu)) {
      shouldFetch = true;
      setLoadingChamadosAdmin(true);
      setErroChamadosAdmin('');
    }
    // Usuário comum: busca em 'inicio', 'historico' e 'chamados'
    else if (!colaborador.isAdmin && ['inicio', 'historico', 'chamados'].includes(menu)) {
      shouldFetch = true;
      setLoadingChamadosUser(true);
      setErroChamadosUser('');
    }
    if (shouldFetch) {
      fetchChamadosComCache()
        .then(data => setChamados(data))
        .catch(err => {
          if (colaborador.isAdmin) {
            setErroChamadosAdmin(err.message);
          } else {
            setErroChamadosUser(err.message);
          }
        })
        .finally(() => {
          if (colaborador.isAdmin) {
            setLoadingChamadosAdmin(false);
          } else {
            setLoadingChamadosUser(false);
          }
        });
    }
  }, [colaborador, menu, refreshChamados]);

  // Novo: busca colaborador autenticado da API após login
  async function buscarColaboradorAutenticado() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setColaborador(null);
        setIsAuthLoading(false);
        return;
      }
      // Busca o próprio usuário autenticado
      const resp = await fetch('http://localhost:5000/api/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resp.ok) {
        const user = await resp.json();
        setColaborador(user);
      } else {
        setColaborador(null);
      }
    } catch {
      setColaborador(null);
    } finally {
      setIsAuthLoading(false);
    }
  }

  // Ao fazer login, busca colaborador fresh da API
  async function handleLogin(dados) {
    try {
      const { token } = await apiLogin(dados.email, dados.senha);
      localStorage.setItem('token', token);
      await buscarColaboradorAutenticado();
    } catch (err) {
      alert(err.message);
    }
  }

  // Ao trocar senha, sempre usa o retorno da API (já ajustado nos componentes)

  // Ao abrir o app, se houver token, busca colaborador fresh
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) buscarColaboradorAutenticado();
    else setIsAuthLoading(false);
  }, []);

  // Buscar chamados da API ao abrir menu 'chamados' (usuário comum)
  useEffect(() => {
    if (colaborador && !colaborador.isAdmin && menu === 'chamados') {
      setLoadingChamadosUser(true);
      setErroChamadosUser('');
      getChamados()
        .then(data => setChamados(data))
        .catch(err => setErroChamadosUser(err.message))
        .finally(() => setLoadingChamadosUser(false));
    }
  }, [colaborador, menu]);

  // Buscar usuários da API ao abrir menu 'usuarios' (admin) ou 'chamados' (PainelTI)
  useEffect(() => {
    if (colaborador && colaborador.isAdmin && (menu === 'usuarios' || menu === 'chamados' || menu === 'inicio')) { // Adicionado 'inicio'
      setLoadingUsuarios(true);
      setErroUsuarios('');
      getUsuarios()
        .then(data => {
          console.log('[DeskHelp] Usuários recebidos da API:', data); // LOG DE DEPURAÇÃO
          setUsuarios(data);
        })
        .catch(err => setErroUsuarios(err.message))
        .finally(() => setLoadingUsuarios(false));
      if (menu === 'usuarios') setUsuarioAlterarSenha(null); // Garante que o modal só abre ao clicar
    }
  }, [colaborador, menu]);

  // Buscar todos os departamentos para o filtro do Dashboard
  useEffect(() => {
    if (colaborador && colaborador.isAdmin && menu === 'inicio') {
      getDepartamentos()
        .then(data => setTodosDepartamentos(data || [])) // Garante que seja um array
        .catch(err => console.error("Erro ao buscar departamentos para dashboard:", err));
    }
  }, [colaborador, menu]);

  // Buscar chamados da API ao abrir menu 'inicio' (painel admin)
  useEffect(() => {
    if (colaborador && colaborador.isAdmin && menu === 'inicio') {
      setLoadingChamadosAdmin(true);
      setErroChamadosAdmin('');
      getChamados()
        .then(data => setChamados(data))
        .catch(err => setErroChamadosAdmin(err.message))
        .finally(() => setLoadingChamadosAdmin(false));
    }
  }, [colaborador, menu, refreshChamados]);

  // Buscar chamados da API ao abrir menu 'inicio' ou 'historico' (usuário comum)
  useEffect(() => {
    if (colaborador && !colaborador.isAdmin && (menu === 'inicio' || menu === 'historico')) {
      setLoadingChamadosUser(true);
      setErroChamadosUser('');
      getChamados()
        .then(data => setChamados(data))
        .catch(err => setErroChamadosUser(err.message))
        .finally(() => setLoadingChamadosUser(false));
    }
  }, [colaborador, menu]);

  // Atualiza lista de chamados ao receber evento global de atualização
  useEffect(() => {
    function atualizarChamadosPorEvento() {
      getChamados()
        .then(data => setChamados(data))
        .catch(err => setNotificacao({ open: true, mensagem: 'Erro ao atualizar chamados: ' + err.message }));
    }
    window.addEventListener('chamadoAtualizado', atualizarChamadosPorEvento);
    return () => window.removeEventListener('chamadoAtualizado', atualizarChamadosPorEvento);
  }, []);

  // Listener de notificações via socket.io
  useEffect(() => {
    if (!colaborador) return;
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    const socket = io('http://localhost:5000', {
      query: { email: colaborador.email },
      transports: ['websocket']
    });
    socketRef.current = socket;
    socket.on('notificacao_personalizada', (notificacao) => {
      setNotificacoes(prev => [notificacao, ...prev]);
      setNotificacoesNaoLidas(prev => prev + 1);
      setToastNotificacao({ open: true, msg: notificacao.mensagem });
    });
    // NOVO: escuta evento de modificação de chamado para atualizar listas em tempo real
    socket.on('chamado_modificado', (chamado) => {
      // Dispara evento customizado para todos os componentes ouvintes
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('chamadoAtualizado', { detail: chamado }));
      }
    });
    socket.on('connect_error', (err) => {
      console.error('Erro de conexão socket.io:', err);
    });
    socket.on('connect', () => {
      console.log('Socket.io conectado para notificações!');
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [colaborador]);

  // Função para controlar dropdown de notificações
  function handleNotificacaoClick(event) {
    setAnchorElNotificacoes(event.currentTarget);
  }

  function handleFecharNotificacoes() {
    setAnchorElNotificacoes(null);
    setNotificacoesNaoLidas(0); // Marca como lidas ao fechar
  }

  // Função para navegar para chamado específico
  function handleNotificacaoItemClick(notificacao) {
    handleFecharNotificacoes();
    // Navega para a página apropriada dependendo do tipo de usuário
    if (colaborador.isAdmin) {
      setMenu('chamados'); // Vai para o painel administrativo de chamados
    } else {
      setMenu('historico'); // Vai para o histórico de chamados do usuário
    }
  }

  // Função para renderizar o conteúdo principal conforme o menu e o tipo de usuário
  function renderConteudo() {
    // Se senhaTemporaria for verdadeira, força exibição da tela de troca de senha
    if (colaborador && colaborador.senhaTemporaria && menu === 'senha') {
      return <AlterarSenha colaborador={colaborador} onSalvar={handleAtualizarColaborador} isAdmin={false} obrigatoria={true} />;
    }

    switch (menu) {
      case 'inicio':
        if (colaborador?.isAdmin) {      return (
        <Dashboard
          chamados={chamados}
          usuariosTI={usuarios.filter(u => u.isAdmin)}
          onReivindicar={handleReivindicarChamado}
          onAtribuir={handleAtribuirChamado}
          onStatus={handleStatusChamado}
          onTransferir={handleTransferirChamado}
          onExcluir={handleExcluirChamado}
          usuarios={usuarios}
          onAbrirChamado={() => setMenu('abrir')}
          onExcluirChamado={handleExcluirChamado}
          todosDepartamentos={todosDepartamentos}
          colaborador={colaborador}
        />
      );
        }
        // Usuário comum - mostra apenas chamados abertos e em atendimento
        return (
          <ListaChamados
            chamados={chamados.filter(c => 
              c.status !== 'Finalizado' && 
              c.usuario && 
              c.usuario.email === colaborador.email
            )}
            isAdmin={false}
            usuarios={usuarios}
            colaborador={colaborador}
            permitirComentarioDono={true}
            onNovoChamado={() => setMenu('abrir')}
          />
        );
      case 'historico':
        return (
          <ListaChamados
            chamados={chamados.filter(c => 
              c.status === 'Finalizado' && 
              c.usuario && 
              c.usuario.email === colaborador.email
            )}
            isAdmin={colaborador?.isAdmin}
            usuarios={usuarios}
            colaborador={colaborador}
            permitirComentarioDono={false}
            exibirBotaoCriar={false}
            onReivindicar={handleReivindicarChamado}
            onAtribuir={handleAtribuirChamado}
            onStatus={handleStatusChamado}
            onExcluir={handleExcluirChamado}
          />
        );
      case 'abrir':
        return (
          <NovoChamado
            colaborador={colaborador}
            onAdd={async () => {
              await adicionarChamado();
              setMenu('inicio');
            }}
            onAfterCreate={() => setMenu('inicio')}
            hideSugestoes={false}
            isAdmin={false}
          />
        );
      case 'chamados':
        return (
          <PainelTI
            chamados={chamados}
            usuariosTI={usuarios.filter(u => u.isAdmin)}
            onAtribuir={handleAtribuirChamado}
            onStatus={handleStatusChamado}
            onReivindicar={handleReivindicarChamado}
            onTransferir={handleTransferirChamado}
            onExcluir={handleExcluirChamado}
            usuarios={usuarios}
            onAbrirChamado={() => setMenu('abrir')}
            onExcluirChamado={handleExcluirChamado}
            colaborador={colaborador}
            exibirFiltros={true}
            modoAbas={false}
          />
        );
      case 'usuarios':
        return (
          <PaginaUsuariosAdmin
            usuarios={usuarios}
            onAtualizarUsuarios={() => {
              // Força a busca de usuários novamente
              setLoadingUsuarios(true);
              getUsuarios()
                .then(data => setUsuarios(data))
                .catch(err => setErroUsuarios(err.message))
                .finally(() => setLoadingUsuarios(false));
            }}
            loading={loadingUsuarios}
            erro={erroUsuarios}
          />
        );
      case 'departamentos':
        return (
          <Departamentos />
        );
      case 'relatorioProblemas': // Novo case para o relatório
        return (
          <RelatorioProblemas />
        );
      case 'config-email': // Removido - sistema de email desabilitado
        return (
          <PainelEmailConfig />
        );
      case 'perfil':
        return (
          <PerfilUsuario colaborador={colaborador} onSalvar={handleAtualizarColaborador} />
        );
      case 'senha':
        return (
          <AlterarSenha colaborador={colaborador} onSalvar={handleAtualizarColaborador} isAdmin={true} />
        );
      default:
        return <Typography>Selecione uma opção no menu.</Typography>;
    }
  }

  // Função para adicionar chamado (usada no NovoChamado)
  async function adicionarChamado() {
    try {
      // Busca lista atualizada após criar chamado
      const lista = await getChamados();
      setChamados(lista);
    } catch (err) {
      setNotificacao({ open: true, mensagem: 'Erro ao atualizar chamados: ' + err.message });
    }
  }

  // Atribuir chamado a um usuário TI
  async function handleAtribuirChamado(chamado) {
    if (!chamado || !chamado._id) return;
    
    // Lista de usuários TI para seleção (isAdmin OU departamento TI)
    const usuariosTI = usuarios.filter(u => 
      u.isAdmin || 
      (u.departamento && u.departamento.toLowerCase().includes('ti')) ||
      (u.departamento && u.departamento.toLowerCase().includes('tecnologia'))
    );
    
    if (usuariosTI.length === 0) {
      setNotificacao({ open: true, mensagem: 'Nenhum usuário de TI disponível!' });
      return;
    }

    // Mostra prompt para seleção (pode ser melhorado com modal)
    const opcoes = usuariosTI.map((u, i) => `${i + 1}. ${u.nome} (${u.email})`).join('\n');
    const escolha = prompt(`Escolha o responsável:\n${opcoes}\n\nDigite o número:`);
    
    if (!escolha || isNaN(escolha) || escolha < 1 || escolha > usuariosTI.length) {
      return; // Cancelado ou inválido
    }

    const usuarioEscolhido = usuariosTI[parseInt(escolha) - 1];
    
    try {
      await require('./services/api').atualizarChamado(chamado._id, { 
        atribuido: usuarioEscolhido.email,
        status: 'Em atendimento'
      });
      // Atualiza lista de chamados
      const lista = await require('./services/api').getChamados();
      setChamados(lista);
      setNotificacao({ open: true, mensagem: `Chamado atribuído para ${usuarioEscolhido.nome}!` });
    } catch (err) {
      setNotificacao({ open: true, mensagem: 'Erro ao atribuir chamado: ' + err.message });
    }
  }

  // Finalizar chamado (antes era "Alterar status")
  async function handleStatusChamado(chamado, novoStatus = 'Finalizado', comentarioResolucao = null) {
    if (!chamado || !chamado._id) return;
    
    const payload = { status: novoStatus };
    if (novoStatus === 'Finalizado' && comentarioResolucao) {
      payload.comentarioResolucao = comentarioResolucao;
    }
    
    try {
      // Usa a função atualizarChamado importada no topo do arquivo
      const chamadoAtualizadoDaApi = await atualizarChamado(chamado._id, payload);
      // Atualiza lista de chamados
      const lista = await getChamados(); // Usa a função getChamados importada
      setChamados(lista);
      setNotificacao({ open: true, mensagem: `Chamado ${novoStatus.toLowerCase()} com sucesso!` });
      // Dispara evento para outros componentes, se necessário (ex: Dashboard, PainelTI)
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        // Garante que o objeto do evento contenha o comentarioResolucao vindo da API
        window.dispatchEvent(new CustomEvent('chamadoAtualizado', { 
          detail: { 
            ...chamado, // Mantém outras propriedades do chamado original do evento
            status: novoStatus, 
            comentarioResolucao: chamadoAtualizadoDaApi.comentarioResolucao || comentarioResolucao 
          }
        }));
      }
    } catch (err) {
      setNotificacao({ open: true, mensagem: `Erro ao ${novoStatus.toLowerCase()} chamado: ` + err.message });
    }
  }

  // Handler global para reivindicar chamado (admin)
  async function handleReivindicarChamado(chamado) {
    if (!chamado || !chamado._id || !colaborador?.email) return;
    
    try {
      await require('./services/api').atualizarChamado(chamado._id, { atribuido: colaborador.email, status: 'Em atendimento' });
      // Atualiza lista de chamados
      const lista = await require('./services/api').getChamados();
      setChamados(lista);
      setNotificacao({ open: true, mensagem: 'Chamado reivindicado com sucesso!' });
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('chamadoAtualizado', { detail: { ...chamado, status: 'Em atendimento', atribuido: colaborador.email } }));
      }
    } catch (err) {
      setNotificacao({ open: true, mensagem: 'Erro ao reivindicar chamado: ' + err.message });
    }
  }

  // Função de logout
  function handleLogout() {
    localStorage.removeItem('token');
    setColaborador(null);
    setMenu('inicio');
  }

  // Função para abrir perfil
  function handlePerfil() {
    setMenu('perfil');
  }

  // Função para abrir alteração de senha
  function handleAlterarSenha() {
    setMenu('senha');
  }

  // Função para atualizar colaborador após edição de perfil
  async function handleAtualizarColaborador(colaboradorAtualizado) {
    // Atualiza o estado imediatamente com os dados recebidos
    setColaborador(colaboradorAtualizado);
    
    // Opcional: busca dados atualizados do servidor para garantir sincronização
    try {
      await buscarColaboradorAutenticado();
    } catch (err) {
      console.warn('[DeskHelp] Erro ao buscar dados atualizados do colaborador:', err);
      // Mantém os dados que foram passados mesmo se a busca falhar
    }
  }

  // Função para excluir chamado (admin)
  async function handleExcluirChamado(chamado) {
    if (!chamado || !chamado._id) return;
    
    // Confirmação antes de excluir
    const confirmacao = window.confirm(`Tem certeza que deseja excluir o chamado?\n\nTítulo: ${chamado.titulo}\nStatus: ${chamado.status}\n\nEsta ação não pode ser desfeita.`);
    
    if (!confirmacao) {
      return; // Cancelado
    }
    
    try {
      await require('./services/api').deletarChamado(chamado._id);
      // Atualiza lista de chamados
      const lista = await require('./services/api').getChamados();
      setChamados(lista);
      setNotificacao({ open: true, mensagem: 'Chamado excluído com sucesso!' });
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('chamadoAtualizado', { detail: { _id: chamado._id, excluido: true } }));
      }
    } catch (err) {
      setNotificacao({ open: true, mensagem: 'Erro ao excluir chamado: ' + err.message });
    }
  }

  // Handler global para transferir chamado (admin)
  async function handleTransferirChamado(chamado, opcoes = {}) {
    if (!chamado || !chamado._id) return;
    
    try {
      if (opcoes.removerAtribuicao) {
        // Remove atribuição
        await require('./services/api').atualizarChamado(chamado._id, { 
          atribuido: null,
          responsavel: null,
          status: 'Aberto'
        });
        setNotificacao({ open: true, mensagem: 'Atribuição removida. Chamado voltou para "Aberto".' });
      } else if (opcoes.novoResponsavel) {
        // Transfere para outro usuário
        const usuario = opcoes.novoResponsavel;
        await require('./services/api').atualizarChamado(chamado._id, { 
          atribuido: usuario.email,
          responsavel: usuario.email,
          status: 'Em atendimento'
        });
        setNotificacao({ open: true, mensagem: `Chamado transferido para ${usuario.nome}!` });
      } else {
        // Modo compatibilidade (antigo) - não deve ser usado mais
        console.warn('Transferência usando modo antigo - use o modal');
        return;
      }
      
      // Atualiza lista de chamados
      const lista = await require('./services/api').getChamados();
      setChamados(lista);
    } catch (err) {
      setNotificacao({ open: true, mensagem: 'Erro ao transferir chamado: ' + err.message });
    }
  }

  // Sidebar: corrigir menu para admin e usuário comum
  // Navbar: passa handlers corretos
  const handleMenu = (menu) => {
    setMenu(menu);
    // Removido redirecionamento forçado que causava problemas de URL
  };

  return (
    <div className="App">
      <CssBaseline />
      {isAuthLoading ? (
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="h6" color="primary">Carregando...</Typography>
        </Box>
      ) : colaborador ? (
        <Box sx={{ display: 'flex' }}>
          <Navbar
            colaborador={colaborador}
            onLogout={handleLogout}
            onPerfil={handlePerfil}
            onAlterarSenha={handleAlterarSenha}
            // Passando props de notificação para Navbar
            notificacoes={notificacoes}
            notificacoesNaoLidas={notificacoesNaoLidas}
            onNotificacaoClick={handleNotificacaoClick}
            anchorElNotificacoes={anchorElNotificacoes}
            onFecharNotificacoes={handleFecharNotificacoes}
            onNotificacaoItemClick={handleNotificacaoItemClick}            
          />
          <Sidebar onMenuClick={handleMenu} selected={menu} colaborador={colaborador} isAdmin={colaborador?.isAdmin} />
          <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
            <Toolbar />
            {renderConteudo()}
          </Box>
        </Box>
      ) : (
        <Login onLogin={handleLogin} />
      )}
      <Snackbar
        open={notificacao.open}
        autoHideDuration={6000}
        onClose={() => setNotificacao({ open: false, mensagem: '' })}
      >
        <Alert onClose={() => setNotificacao({ open: false, mensagem: '' })} severity="info" sx={{ width: '100%' }}>
          {notificacao.mensagem}
        </Alert>
      </Snackbar>
      <Snackbar
        open={toastNotificacao.open}
        autoHideDuration={4000}
        onClose={() => setToastNotificacao({ open: false, msg: '' })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity="info" sx={{ width: '100%' }}>{toastNotificacao.msg}</Alert>
      </Snackbar>
    </div>
  );
}

export default App;