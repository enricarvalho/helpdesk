// filepath: c:\Users\enric\Documents\deskhelp\src\ListaChamados.js
import React, { useRef } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Typography, IconButton, Tooltip, Button, TextField, MenuItem, Grid, Box, Snackbar, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Divider, Tabs, Tab } from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import DeleteIcon from '@mui/icons-material/Delete';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import FileSaver from 'file-saver';
import { Pie } from 'react-chartjs-2';
import MuiAlert from '@mui/material/Alert';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { reabrirChamado } from './services/api';
import CircularProgress from '@mui/material/CircularProgress';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ptBR from 'date-fns/locale/pt-BR';

const prioridadeCor = {
  'Baixa': 'success',
  'Média': 'info',
  'Alta': 'warning',
  'Urgente': 'error'
};

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

/**
 * ListaChamados - lista de chamados com filtros e modal de detalhes.
 * @param {Array} chamados - lista de chamados
 * @param {boolean} isAdmin - se o usuário é admin
 * @param {Array} usuarios - lista de usuários
 * @param {function} onNovoChamado - callback para novo chamado
 * @param {object} colaborador - usuário logado
 * @param {boolean} permitirComentarioDono - se o campo de comentário do dono deve aparecer
 * @param {boolean} exibirFiltros - se deve exibir a seção de filtros (padrão: true)
 * @param {boolean} exibirBotaoCriar - se deve exibir o botão "Criar Chamado" (padrão: true)
 * @param {function} onReivindicar - callback para reivindicar chamado (admin)
 * @param {function} onAtribuir - callback para atribuir chamado (admin)
 * @param {function} onStatus - callback para alterar status (admin)
 * @param {function} onTransferir - callback para transferir chamado (admin)
 * @param {function} onExcluir - callback para excluir chamado (admin)
 */

// Layout moderno e filtros robustos para usuário comum
export default function ListaChamados({ 
  chamados, 
  isAdmin = false, 
  usuarios, 
  onNovoChamado, 
  colaborador, 
  permitirComentarioDono = false, 
  exibirFiltros = true, 
  exibirBotaoCriar = true,
  onReivindicar,
  onAtribuir,
  onStatus,
  onTransferir,
  onExcluir,
  modoAbas = false,
  abaEmAndamentoLabel = "Em atendimento",
  ...props 
}) {  const [filtros, setFiltros] = React.useState({ busca: '', status: '', prioridade: '', dataInicio: '', dataFim: '' });
  const [detalhe, setDetalhe] = React.useState(null);
  const [toast, setToast] = React.useState({ open: false, msg: '', type: 'success' });
  const [loading, setLoading] = React.useState(false);
  const [comentario, setComentario] = React.useState('');
  const [anexos, setAnexos] = React.useState([]); // substitui anexo/anexoNome
  const [enviandoComentario, setEnviandoComentario] = React.useState(false);
  const [abaAtiva, setAbaAtiva] = React.useState(0);
  
  // Estados para modal de transferir
  const [modalTransferir, setModalTransferir] = React.useState(false);
  const [chamadoParaTransferir, setChamadoParaTransferir] = React.useState(null);
  const [usuarioDestino, setUsuarioDestino] = React.useState('');

  // Foco automático no campo de busca
  const buscaRef = React.useRef();
  React.useEffect(() => {
    if (buscaRef.current) buscaRef.current.focus();
  }, []);
  // Ao montar, filtrar por padrão apenas chamados abertos (se não for modo abas)
  React.useEffect(() => {
    if (!modoAbas) {
      setFiltros(f => ({ ...f, status: 'Aberto' }));
    }
  }, [modoAbas]);  // Função para filtrar chamados por aba
  const filtrarPorAba = (chamados) => {
    if (!modoAbas) return chamados;
    
    let filtrados;
    switch (abaAtiva) {
      case 0: // Abertos - chamados não atribuídos/reivindicados
        filtrados = chamados.filter(c => 
          (c.status === 'Aberto' || c.status === 'Reaberto') && 
          (!c.atribuido && !c.responsavel)
        );
        break;
      case 1: // Em atendimento - chamados atribuídos/reivindicados E não finalizados
        filtrados = chamados.filter(c => 
          c.status !== 'Finalizado' && 
          (c.atribuido || c.responsavel)
        );
        break;
      case 2: // Finalizados
        filtrados = chamados.filter(c => c.status === 'Finalizado');
        break;
      default:
        filtrados = chamados;
    }
    
    return filtrados;
  };

  // Feedback visual para filtros obrigatórios
  // (Exemplo: prioridade obrigatória para admins, pode ser expandido conforme regras)
  // Filtros robustos
  const chamadosFiltrados = filtrarPorAba(chamados.filter(c => {
    const busca = filtros.busca.trim().toLowerCase();
    const dataChamado = new Date(c.data || c.criadoEm || c.updatedAt);
    const dataInicio = filtros.dataInicio ? new Date(filtros.dataInicio) : null;
    const dataFim = filtros.dataFim ? new Date(filtros.dataFim) : null;
    let match = true;
    if (busca) {
      match = (c.titulo?.toLowerCase().includes(busca) || 
               c.descricao?.toLowerCase().includes(busca) || 
               (c.numeroChamado && c.numeroChamado.toString().toLowerCase().includes(busca)));
    }
    if (match && filtros.status) match = c.status === filtros.status;    if (match && filtros.prioridade) match = c.prioridade === filtros.prioridade;
    if (match && dataInicio) match = dataChamado >= dataInicio;
    if (match && dataFim) match = dataChamado <= dataFim;
    return match;
  }));
  // Função para verificar se usuário TI pode comentar (quando reivindicou o chamado)
  const podeComentarComoTI = (chamado) => {
    if (!isAdmin || !colaborador?.email) return false;
    
    // TI pode comentar se:
    // 1. Chamado não está finalizado
    // 2. TI reivindicou/foi atribuído ao chamado
    const chamadoReivindicado = chamado.atribuido === colaborador.email || chamado.responsavel === colaborador.email;
    
    return chamado.status !== 'Finalizado' && chamadoReivindicado;
  };

  // Funções para modal de transferir
  const abrirModalTransferir = (chamado) => {
    setChamadoParaTransferir(chamado);
    setUsuarioDestino('');
    setModalTransferir(true);
  };

  const fecharModalTransferir = () => {
    setModalTransferir(false);
    setChamadoParaTransferir(null);
    setUsuarioDestino('');
  };

  const confirmarTransferencia = () => {
    if (!usuarioDestino) {
      setToast({ open: true, msg: 'Selecione um usuário para transferir o chamado.', type: 'warning' });
      return;
    }

    const usuario = usuarios.find(u => u.email === usuarioDestino);
    if (!usuario) {
      setToast({ open: true, msg: 'Usuário não encontrado.', type: 'error' });
      return;
    }

    if (onTransferir) {
      onTransferir(chamadoParaTransferir, { novoResponsavel: usuario });
    }
    
    fecharModalTransferir();
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4 }}>
      {/* Abas (se habilitado) */}
      {modoAbas && (
        <Paper sx={{ mb: 2, borderRadius: 2 }}>
          <Tabs 
            value={abaAtiva} 
            onChange={(e, novaAba) => setAbaAtiva(novaAba)}
            variant="fullWidth"
            sx={{ 
              '& .MuiTab-root': { 
                fontWeight: 600,
                minHeight: 48
              }
            }}
          >
            <Tab label="Abertos" />
            <Tab label={abaEmAndamentoLabel} />
            <Tab label="Finalizados" />
          </Tabs>
        </Paper>
      )}

      {/* Filtros */}
      {exibirFiltros && !modoAbas && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: 3 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" mb={2}>
            <TextField 
              label="Busca" 
              name="busca" 
              value={filtros.busca} 
              onChange={e => setFiltros(f => ({ ...f, busca: e.target.value }))} 
              size="small" 
              sx={{ minWidth: 180 }} 
              inputRef={buscaRef}
            />
            <TextField 
              select 
              label="Status" 
              name="status" 
              value={filtros.status} 
              onChange={e => setFiltros(f => ({ ...f, status: e.target.value }))} 
              size="small" 
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="Aberto">Aberto</MenuItem>
              <MenuItem value="Em atendimento">Em Atendimento</MenuItem>
              <MenuItem value="Aguardando resposta">Aguardando Resposta</MenuItem>
              <MenuItem value="Reaberto">Reaberto</MenuItem>
              <MenuItem value="Finalizado">Finalizado</MenuItem>
            </TextField>
            <TextField 
              select 
              label="Prioridade" 
              name="prioridade" 
              value={filtros.prioridade} 
              onChange={e => setFiltros(f => ({ ...f, prioridade: e.target.value }))} 
              size="small" 
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="">Todas</MenuItem>
              <MenuItem value="Baixa">Baixa</MenuItem>
              <MenuItem value="Média">Média</MenuItem>
              <MenuItem value="Alta">Alta</MenuItem>
              <MenuItem value="Urgente">Urgente</MenuItem>
            </TextField>            <TextField 
              type="date"
              label="Data inicial" 
              InputLabelProps={{ shrink: true }} 
              value={filtros.dataInicio} 
              onChange={e => setFiltros(f => ({ ...f, dataInicio: e.target.value }))} 
              size="small" 
              sx={{ minWidth: 140 }} 
            />
            <TextField 
              type="date" 
              label="Data final" 
              InputLabelProps={{ shrink: true }} 
              value={filtros.dataFim} 
              onChange={e => setFiltros(f => ({ ...f, dataFim: e.target.value }))} 
              size="small" 
              sx={{ minWidth: 140 }} 
            />
            <Button 
              variant="outlined" 
              color="warning" 
              onClick={() => setFiltros({ busca: '', status: '', prioridade: '', dataInicio: '', dataFim: '' })}
            >              Limpar filtros
            </Button>
          </Stack>
        </Paper>
      )}

      <Paper sx={{ borderRadius: 3, boxShadow: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nº</TableCell>
                <TableCell>Data</TableCell>
                {isAdmin && <TableCell>Criador</TableCell>}
                {isAdmin && <TableCell>Departamento</TableCell>}
                <TableCell>Título</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Prioridade</TableCell>
                <TableCell>Responsável</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {chamadosFiltrados.length === 0 ? (
                <TableRow><TableCell colSpan={isAdmin ? 9 : 7}><Typography align="center" color="text.secondary">Nenhum chamado encontrado.</Typography></TableCell></TableRow>
              ) : chamadosFiltrados.map((c, idx) => (
                <TableRow key={c._id || c.id || idx} hover onClick={() => setDetalhe(c)} style={{ cursor: 'pointer' }}>
                  <TableCell>{(c.numeroChamado || '-').replace(/^CH-/, '')}</TableCell>
                  <TableCell>{(c.data || c.criadoEm || c.updatedAt) ? new Date(c.data || c.criadoEm || c.updatedAt).toLocaleDateString('pt-BR') : '-'}</TableCell>
                  {isAdmin && <TableCell>{c.usuario?.nome || usuarios?.find(u => u.email === c.usuario?.email)?.nome || c.usuario?.email || '-'}</TableCell>}
                  {isAdmin && <TableCell>{c.usuario?.departamento || usuarios?.find(u => u.email === c.usuario?.email)?.departamento || '-'}</TableCell>}
                  <TableCell>{c.titulo}</TableCell>
                  <TableCell>{c.status}</TableCell>
                  <TableCell><Chip label={c.prioridade} color={c.prioridade === 'Urgente' ? 'error' : c.prioridade === 'Alta' ? 'warning' : c.prioridade === 'Média' ? 'info' : 'success'} /></TableCell>
                  <TableCell>{usuarios?.find(u => u.email === (c.atribuido || c.responsavel))?.nome || c.atribuido || c.responsavel || '-'}</TableCell>
                  <TableCell>
                    {isAdmin ? (
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {/* Reivindicar - só aparece se chamado não está atribuído/reivindicado */}
                        {!c.atribuido && !c.responsavel && c.status !== 'Finalizado' && (
                          <Tooltip title="Reivindicar">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={e => { 
                                e.stopPropagation(); 
                                if (onReivindicar) onReivindicar(c);
                              }}
                            >
                              <AssignmentIndIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        {/* Atribuir - só aparece se chamado não está atribuído */}
                        {!c.atribuido && !c.responsavel && c.status !== 'Finalizado' && (
                          <Tooltip title="Atribuir">
                            <IconButton 
                              size="small" 
                              color="info"
                              onClick={e => { 
                                e.stopPropagation(); 
                                if (onAtribuir) onAtribuir(c);
                              }}
                            >
                              <GroupAddIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        {/* Finalizar - só aparece se chamado está reivindicado/atribuído */}
                        {(c.atribuido || c.responsavel) && c.status !== 'Finalizado' && (
                          <Tooltip title="Finalizar">
                            <IconButton 
                              size="small" 
                              color="success"
                              onClick={e => { 
                                e.stopPropagation(); 
                                if (onStatus) onStatus(c);
                              }}
                            >
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        {/* Transferir - só aparece se chamado está atribuído/reivindicado */}
                        {(c.atribuido || c.responsavel) && c.status !== 'Finalizado' && (
                          <Tooltip title="Transferir">
                            <IconButton 
                              size="small" 
                              color="warning"
                              onClick={e => { 
                                e.stopPropagation(); 
                                abrirModalTransferir(c);
                              }}
                            >
                              <SwapHorizIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        <Tooltip title="Excluir">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={e => { 
                              e.stopPropagation(); 
                              if (onExcluir) onExcluir(c);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Button size="small" variant="outlined" onClick={e => { e.stopPropagation(); setDetalhe(c); }}>Detalhes</Button>
                      </Stack>
                    ) : (
                      <Button size="small" variant="outlined" onClick={e => { e.stopPropagation(); setDetalhe(c); }}>Detalhes</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      {/* Modal de detalhes do chamado */}
      <Dialog open={!!detalhe} onClose={() => setDetalhe(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 20, background: '#1976d2', color: '#fff', px: 3, py: 2 }}>
          Detalhes do Chamado #{detalhe?.numeroChamado || detalhe?.id}
        </DialogTitle>
        <DialogContent dividers sx={{ background: '#f8fafc', p: 2 }}>
          {detalhe && (
            <Stack spacing={2}>
              <Typography variant="h6">{detalhe.titulo}</Typography>
              <Typography><b>Status:</b> {detalhe.status}</Typography>
              <Typography><b>Prioridade:</b> {detalhe.prioridade}</Typography>
              <Typography><b>Responsável:</b> {usuarios?.find(u => u.email === (detalhe.atribuido || detalhe.responsavel))?.nome || detalhe.atribuido || detalhe.responsavel || '-'}</Typography>
              <Typography><b>Descrição:</b> {detalhe.descricao}</Typography>
              <Typography><b>Data de abertura:</b> {detalhe.criadoEm ? new Date(detalhe.criadoEm).toLocaleString('pt-BR') : (detalhe.data ? new Date(detalhe.data).toLocaleString('pt-BR') : '-')}</Typography>
              <Divider />
              <Typography variant="subtitle2">Histórico</Typography>
              {Array.isArray(detalhe.historico) && detalhe.historico.length > 0 ? (
                detalhe.historico.map((h, idx) => (
                  <Box key={idx} mb={2} p={1} sx={{ background: '#f5f5f5', borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{h.autor || 'Sistema'}</Typography>
                    <Typography variant="caption" color="text.secondary">{h.data ? new Date(h.data).toLocaleString('pt-BR') : 'Data indisponível'}</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line', color: '#333' }}>{h.texto}</Typography>
                    {Array.isArray(h.anexos) && h.anexos.length > 0 && (
                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mt: 1 }}>
                        {h.anexos.map((an, i) => (
                          <Button
                            key={i}
                            variant="outlined"
                            size="small"
                            startIcon={<AttachFileIcon />}
                            href={an.anexo}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ mt: 1 }}
                            download={an.anexoNome || true}
                          >
                            {an.anexoNome?.length > 18 ? an.anexoNome.slice(0, 15) + '...' : an.anexoNome || 'Anexo'}
                          </Button>
                        ))}
                      </Stack>
                    )}
                  </Box>
                ))
              ) : (
                <Typography color="text.secondary">Sem histórico de comentários.</Typography>
              )}
              {/* Campo de comentário: para dono do chamado OU usuários TI que reivindicaram */}
              {(() => {
                const isDono = (
                  (detalhe.usuario && colaborador?.email && detalhe.usuario.email === colaborador.email)
                );
                const podeComentarDono = detalhe.status !== 'Finalizado' && isDono && permitirComentarioDono;
                const podeComentarTI = podeComentarComoTI(detalhe);
                
                const podeComentar = podeComentarDono || podeComentarTI;
                
                return podeComentar ? (
                  <Box sx={{ mt: 2, p: 2, background: '#f0f4fa', borderRadius: 2 }}>
                    <Typography variant="subtitle2" mb={1}>
                      Adicionar comentário {podeComentarTI ? '(TI)' : ''}
                    </Typography>
                    <TextField
                      label="Comentário"
                      value={comentario}
                      onChange={e => setComentario(e.target.value)}
                      fullWidth
                      multiline
                      minRows={2}
                      maxRows={6}
                      disabled={enviandoComentario}
                    />
                    <Stack direction="row" spacing={2} alignItems="flex-start" mt={1} flexWrap="wrap">
                      <Button
                        variant="outlined"
                        component="label"
                        startIcon={<AttachFileIcon />}
                        disabled={enviandoComentario}
                      >
                        {anexos.length > 0 ? `${anexos.length} arquivo(s)` : 'Anexar arquivos'}
                        <input
                          type="file"
                          hidden
                          multiple
                          onChange={e => {
                            if (e.target.files && e.target.files.length > 0) {
                              setAnexos(prev => [...prev, ...Array.from(e.target.files)]);
                            }
                          }}
                        />
                      </Button>
                      {anexos.length > 0 && (
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          {anexos.map((file, idx) => (
                            <Box key={idx} sx={{ fontSize: 13, color: '#1976d2', background: '#e3f2fd', borderRadius: 1, px: 1, py: 0.5, mr: 1, mb: 1 }}>
                              {file.name.length > 18 ? file.name.slice(0, 15) + '...' : file.name}
                            </Box>
                          ))}
                        </Stack>
                      )}
                      <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
                        <Button
                          variant="contained"
                          onClick={handleEnviarComentario}
                          disabled={enviandoComentario || (!comentario.trim() && anexos.length === 0)}
                          sx={{ minWidth: 120 }}
                        >
                          {enviandoComentario ? 'Enviando...' : 'Comentar'}
                        </Button>
                      </Box>
                    </Stack>
                  </Box>
                ) : null;
              })()}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetalhe(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>
      
      {/* Modal de transferir chamado */}
      <Dialog open={modalTransferir} onClose={fecharModalTransferir} maxWidth="sm" fullWidth>
        <DialogTitle>Transferir Chamado</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Transferindo o chamado #{chamadoParaTransferir?.numeroChamado || chamadoParaTransferir?.id}: {chamadoParaTransferir?.titulo}
          </Typography>
          <TextField
            select
            fullWidth
            label="Transferir para"
            value={usuarioDestino}
            onChange={(e) => setUsuarioDestino(e.target.value)}
            helperText="Selecione o usuário que receberá o chamado"
            sx={{ mt: 2 }}
          >
            {usuarios && usuarios
              .filter(u => u.email !== colaborador?.email) // Não mostrar o próprio usuário
              .filter(u => u.isAdmin) // Apenas usuários TI/Admin
              .map(u => (
                <MenuItem key={u.email} value={u.email}>
                  {u.nome} ({u.email})
                </MenuItem>
              ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={fecharModalTransferir}>Cancelar</Button>
          <Button onClick={confirmarTransferencia} variant="contained" color="primary">
            Transferir
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({ ...toast, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={toast.type} sx={{ width: '100%' }}>{toast.msg}</Alert>
      </Snackbar>
    </Box>
  );

  async function handleEnviarComentario() {
    if (!detalhe || (!comentario.trim() && anexos.length === 0)) {
      setToast({ open: true, msg: 'Digite um comentário ou anexe um arquivo.', type: 'warning' });
      return;
    }
    setEnviandoComentario(true);
    try {
      // Envia todos os anexos juntos em um único comentário
      const formData = new FormData();
      formData.append('comentario', comentario);
      anexos.forEach(file => formData.append('anexo', file, file.name));
      const token = localStorage.getItem('token');
      const resp = await fetch(`http://localhost:5000/api/chamados/${detalhe._id || detalhe.id}`, {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });
      if (!resp.ok) {
        let erro = 'Erro ao enviar comentário';
        try { erro = (await resp.json()).error || erro; } catch {}
        throw new Error(erro);
      }
      const data = await resp.json();
      // Atualiza o detalhe localmente para refletir o novo comentário
      setDetalhe(d => ({ ...d, historico: [...(d.historico || []), ...(data.historico ? [data.historico[data.historico.length - 1]] : [])] }));
      setComentario('');
      setAnexos([]);
      setToast({ open: true, msg: 'Comentário enviado!', type: 'success' });
    } catch (err) {
      setToast({ open: true, msg: err.message || 'Erro ao enviar comentário', type: 'error' });
    } finally {
      setEnviandoComentario(false);
    }
  }
}

// Função utilitária para truncar nomes de arquivos
function nomeArquivoCurto(nome, max = 12) {
  if (!nome) return '';
  if (nome.length <= max) return nome;
  const ext = nome.includes('.') ? '.' + nome.split('.').pop() : '';
  const base = nome.replace(ext, '');
  return base.slice(0, max) + '...' + ext;
}

export function HistoricoChamados({ 
  chamados, 
  usuarios, 
  colaborador, 
  isAdmin, 
  permitirComentarioDono = false, 
  exibirBotaoCriar = true,
  onReivindicar,
  onAtribuir,
  onStatus,
  onTransferir,
  onExcluir
}) {
  const [filtros, setFiltros] = React.useState({ busca: '', status: '', prioridade: '', dataInicio: '', dataFim: '' });
  const [detalhe, setDetalhe] = React.useState(null);
  // Estados locais para comentário/anexos/toast
  const [comentario, setComentario] = React.useState('');
  const [anexos, setAnexos] = React.useState([]);
  const [enviandoComentario, setEnviandoComentario] = React.useState(false);
  const [toast, setToast] = React.useState({ open: false, msg: '', type: 'success' });

  // Estados para modal de transferir
  const [modalTransferir, setModalTransferir] = React.useState(false);
  const [chamadoParaTransferir, setChamadoParaTransferir] = React.useState(null);
  const [usuarioDestino, setUsuarioDestino] = React.useState('');

  // Função para verificar se usuário TI pode comentar (quando reivindicou o chamado)
  const podeComentarComoTI = (chamado) => {
    if (!isAdmin || !colaborador?.email) return false;
    
    // TI pode comentar se:
    // 1. Chamado não está finalizado
    // 2. TI reivindicou/foi atribuído ao chamado
    const chamadoReivindicado = chamado.atribuido === colaborador.email || chamado.responsavel === colaborador.email;
    
    return chamado.status !== 'Finalizado' && chamadoReivindicado;
  };

  // Funções para modal de transferir
  const abrirModalTransferir = (chamado) => {
    setChamadoParaTransferir(chamado);
    setUsuarioDestino('');
    setModalTransferir(true);
  };

  const fecharModalTransferir = () => {
    setModalTransferir(false);
    setChamadoParaTransferir(null);
    setUsuarioDestino('');
  };

  const confirmarTransferencia = () => {
    if (!usuarioDestino) {
      setToast({ open: true, msg: 'Selecione um usuário para transferir o chamado.', type: 'warning' });
      return;
    }

    const usuario = usuarios.find(u => u.email === usuarioDestino);
    if (!usuario) {
      setToast({ open: true, msg: 'Usuário não encontrado.', type: 'error' });
      return;
    }

    if (onTransferir) {
      onTransferir(chamadoParaTransferir, { novoResponsavel: usuario });
    }
    
    fecharModalTransferir();
  };

  // Filtro dos chamados do histórico
  const chamadosFiltrados = chamados.filter(c => {
    const busca = filtros.busca.trim().toLowerCase();
    const dataChamado = new Date(c.data || c.criadoEm || c.updatedAt);
    const dataInicio = filtros.dataInicio ? new Date(filtros.dataInicio) : null;
    const dataFim = filtros.dataFim ? new Date(filtros.dataFim) : null;
    let match = true;
    if (busca) match = (c.titulo?.toLowerCase().includes(busca) || c.descricao?.toLowerCase().includes(busca));
    if (match && filtros.status) match = c.status === filtros.status;
    if (match && filtros.prioridade) match = c.prioridade === filtros.prioridade;
    if (match && dataInicio) match = dataChamado >= dataInicio;
    if (match && dataFim) match = dataChamado <= dataFim;
    return match;
  });

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4 }}>
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" mb={2}>
          <TextField label="Busca" name="busca" value={filtros.busca} onChange={e => setFiltros(f => ({ ...f, busca: e.target.value }))} size="small" sx={{ minWidth: 180 }} />
          <TextField select label="Status" name="status" value={filtros.status} onChange={e => setFiltros(f => ({ ...f, status: e.target.value }))} size="small" sx={{ minWidth: 120 }}>
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="Aberto">Aberto</MenuItem>
            <MenuItem value="Em atendimento">Em Atendimento</MenuItem>
            <MenuItem value="Aguardando resposta">Aguardando Resposta</MenuItem>
            <MenuItem value="Reaberto">Reaberto</MenuItem>
            <MenuItem value="Finalizado">Finalizado</MenuItem>
          </TextField>
          <TextField select label="Prioridade" name="prioridade" value={filtros.prioridade} onChange={e => setFiltros(f => ({ ...f, prioridade: e.target.value }))} size="small" sx={{ minWidth: 120 }}>
            <MenuItem value="">Todas</MenuItem>
            <MenuItem value="Baixa">Baixa</MenuItem>
            <MenuItem value="Média">Média</MenuItem>
            <MenuItem value="Alta">Alta</MenuItem>
            <MenuItem value="Urgente">Urgente</MenuItem>
          </TextField>
          <TextField type="date" label="Data inicial" InputLabelProps={{ shrink: true }} value={filtros.dataInicio} onChange={e => setFiltros(f => ({ ...f, dataInicio: e.target.value }))} size="small" sx={{ minWidth: 140 }} />
          <TextField type="date" label="Data final" InputLabelProps={{ shrink: true }} value={filtros.dataFim} onChange={e => setFiltros(f => ({ ...f, dataFim: e.target.value }))} size="small" sx={{ minWidth: 140 }} />
          <Button variant="outlined" color="warning" onClick={() => setFiltros({ busca: '', status: '', prioridade: '', dataInicio: '', dataFim: '' })}>Limpar filtros</Button>
        </Stack>
      </Paper>
      <Paper sx={{ borderRadius: 3, boxShadow: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nº</TableCell>
                <TableCell>Data</TableCell>
                {isAdmin && <TableCell>Criador</TableCell>}
                {isAdmin && <TableCell>Departamento</TableCell>}
                <TableCell>Título</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Prioridade</TableCell>
                <TableCell>Responsável</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {chamadosFiltrados.length === 0 ? (
                <TableRow><TableCell colSpan={isAdmin ? 9 : 7}><Typography align="center" color="text.secondary">Nenhum chamado encontrado.</Typography></TableCell></TableRow>
              ) : chamadosFiltrados.map((c, idx) => (
                <TableRow key={c._id || c.id || idx} hover onClick={() => setDetalhe(c)} style={{ cursor: 'pointer' }}>
                  <TableCell>{(c.numeroChamado || '-').replace(/^CH-/, '')}</TableCell>
                  <TableCell>{(c.data || c.criadoEm || c.updatedAt) ? new Date(c.data || c.criadoEm || c.updatedAt).toLocaleDateString('pt-BR') : '-'}</TableCell>
                  {isAdmin && <TableCell>{c.usuario?.nome || usuarios?.find(u => u.email === c.usuario?.email)?.nome || c.usuario?.email || '-'}</TableCell>}
                  {isAdmin && <TableCell>{c.usuario?.departamento || usuarios?.find(u => u.email === c.usuario?.email)?.departamento || '-'}</TableCell>}
                  <TableCell>{c.titulo}</TableCell>
                  <TableCell>{c.status}</TableCell>
                  <TableCell><Chip label={c.prioridade} color={c.prioridade === 'Urgente' ? 'error' : c.prioridade === 'Alta' ? 'warning' : c.prioridade === 'Média' ? 'info' : 'success'} /></TableCell>
                  <TableCell>{usuarios?.find(u => u.email === (c.atribuido || c.responsavel))?.nome || c.atribuido || c.responsavel || '-'}</TableCell>
                  <TableCell>
                    {isAdmin ? (
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {/* Reivindicar - só aparece se chamado não está atribuído/reivindicado */}
                        {!c.atribuido && !c.responsavel && c.status !== 'Finalizado' && (
                          <Tooltip title="Reivindicar">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={e => { 
                                e.stopPropagation(); 
                                if (onReivindicar) onReivindicar(c);
                              }}
                            >
                              <AssignmentIndIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        {/* Atribuir - só aparece se chamado não está atribuído */}
                        {!c.atribuido && !c.responsavel && c.status !== 'Finalizado' && (
                          <Tooltip title="Atribuir">
                            <IconButton 
                              size="small" 
                              color="info"
                              onClick={e => { 
                                e.stopPropagation(); 
                                if (onAtribuir) onAtribuir(c);
                              }}
                            >
                              <GroupAddIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        {/* Finalizar - só aparece se chamado está reivindicado/atribuído */}
                        {(c.atribuido || c.responsavel) && c.status !== 'Finalizado' && (
                          <Tooltip title="Finalizar">
                            <IconButton 
                              size="small" 
                              color="success"
                              onClick={e => { 
                                e.stopPropagation(); 
                                if (onStatus) onStatus(c);
                              }}
                            >
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        {/* Transferir - só aparece se chamado está atribuído/reivindicado */}
                        {(c.atribuido || c.responsavel) && c.status !== 'Finalizado' && (
                          <Tooltip title="Transferir">
                            <IconButton 
                              size="small" 
                              color="warning"
                              onClick={e => { 
                                e.stopPropagation(); 
                                abrirModalTransferir(c);
                              }}
                            >
                              <SwapHorizIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        <Tooltip title="Excluir">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={e => { 
                              e.stopPropagation(); 
                              if (onExcluir) onExcluir(c);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Button size="small" variant="outlined" onClick={e => { e.stopPropagation(); setDetalhe(c); }}>Detalhes</Button>
                      </Stack>
                    ) : (
                      <Button size="small" variant="outlined" onClick={e => { e.stopPropagation(); setDetalhe(c); }}>Detalhes</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      {/* Modal de detalhes do chamado */}
      <Dialog open={!!detalhe} onClose={() => setDetalhe(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 20, background: '#1976d2', color: '#fff', px: 3, py: 2 }}>
          Detalhes do Chamado #{detalhe?.numeroChamado || detalhe?.id}
        </DialogTitle>
        <DialogContent dividers sx={{ background: '#f8fafc', p: 2 }}>
          {detalhe && (
            <Stack spacing={2}>
              <Typography variant="h6">{detalhe.titulo}</Typography>
              <Typography><b>Status:</b> {detalhe.status}</Typography>
              <Typography><b>Prioridade:</b> {detalhe.prioridade}</Typography>
              <Typography><b>Responsável:</b> {usuarios?.find(u => u.email === (detalhe.atribuido || detalhe.responsavel))?.nome || detalhe.atribuido || detalhe.responsavel || '-'}</Typography>
              <Typography><b>Descrição:</b> {detalhe.descricao}</Typography>
              <Typography><b>Data de abertura:</b> {detalhe.criadoEm ? new Date(detalhe.criadoEm).toLocaleString('pt-BR') : (detalhe.data ? new Date(detalhe.data).toLocaleString('pt-BR') : '-')}</Typography>
              <Divider />
              <Typography variant="subtitle2">Histórico</Typography>
              {Array.isArray(detalhe.historico) && detalhe.historico.length > 0 ? (
                detalhe.historico.map((h, idx) => (
                  <Box key={idx} mb={2} p={1} sx={{ background: '#f5f5f5', borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{h.autor || 'Sistema'}</Typography>
                    <Typography variant="caption" color="text.secondary">{h.data ? new Date(h.data).toLocaleString('pt-BR') : 'Data indisponível'}</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line', color: '#333' }}>{h.texto}</Typography>
                    {Array.isArray(h.anexos) && h.anexos.length > 0 && (
                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mt: 1 }}>
                        {h.anexos.map((an, i) => (
                          <Button
                            key={i}
                            variant="outlined"
                            size="small"
                            startIcon={<AttachFileIcon />}
                            href={an.anexo}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ mt: 1 }}
                            download={an.anexoNome || true}
                          >
                            {an.anexoNome?.length > 18 ? an.anexoNome.slice(0, 15) + '...' : an.anexoNome || 'Anexo'}
                          </Button>
                        ))}
                      </Stack>
                    )}
                  </Box>
                ))
              ) : (
                <Typography color="text.secondary">Sem histórico de comentários.</Typography>
              )}
              {/* Campo de comentário: para dono do chamado OU usuários TI que reivindicaram */}
              {(() => {
                const isDono = (
                  (detalhe.usuario && colaborador?.email && detalhe.usuario.email === colaborador.email)
                );
                const podeComentarDono = detalhe.status !== 'Finalizado' && isDono && permitirComentarioDono;
                const podeComentarTI = podeComentarComoTI(detalhe);
                
                const podeComentar = podeComentarDono || podeComentarTI;
                
                return podeComentar ? (
                  <Box sx={{ mt: 2, p: 2, background: '#f0f4fa', borderRadius: 2 }}>
                    <Typography variant="subtitle2" mb={1}>
                      Adicionar comentário {podeComentarTI ? '(TI)' : ''}
                    </Typography>
                    <TextField
                      label="Comentário"
                      value={comentario}
                      onChange={e => setComentario(e.target.value)}
                      fullWidth
                      multiline
                      minRows={2}
                      maxRows={6}
                      disabled={enviandoComentario}
                    />
                    <Stack direction="row" spacing={2} alignItems="flex-start" mt={1} flexWrap="wrap">
                      <Button
                        variant="outlined"
                        component="label"
                        startIcon={<AttachFileIcon />}
                        disabled={enviandoComentario}
                      >
                        {anexos.length > 0 ? `${anexos.length} arquivo(s)` : 'Anexar arquivos'}
                        <input
                          type="file"
                          hidden
                          multiple
                          onChange={e => {
                            if (e.target.files && e.target.files.length > 0) {
                              setAnexos(prev => [...prev, ...Array.from(e.target.files)]);
                            }
                          }}
                        />
                      </Button>
                      {anexos.length > 0 && (
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          {anexos.map((file, idx) => (
                            <Box key={idx} sx={{ fontSize: 13, color: '#1976d2', background: '#e3f2fd', borderRadius: 1, px: 1, py: 0.5, mr: 1, mb: 1 }}>
                              {file.name.length > 18 ? file.name.slice(0, 15) + '...' : file.name}
                            </Box>
                          ))}
                        </Stack>
                      )}
                      <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
                        <Button
                          variant="contained"
                          onClick={handleEnviarComentario}
                          disabled={enviandoComentario || (!comentario.trim() && anexos.length === 0)}
                          sx={{ minWidth: 120 }}
                        >
                          {enviandoComentario ? 'Enviando...' : 'Comentar'}
                        </Button>
                      </Box>
                    </Stack>
                  </Box>
                ) : null;
              })()}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetalhe(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>
      
      {/* Modal de transferir chamado */}
      <Dialog open={modalTransferir} onClose={fecharModalTransferir} maxWidth="sm" fullWidth>
        <DialogTitle>Transferir Chamado</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Transferindo o chamado #{chamadoParaTransferir?.numeroChamado || chamadoParaTransferir?.id}: {chamadoParaTransferir?.titulo}
          </Typography>
          <TextField
            select
            fullWidth
            label="Transferir para"
            value={usuarioDestino}
            onChange={(e) => setUsuarioDestino(e.target.value)}
            helperText="Selecione o usuário que receberá o chamado"
            sx={{ mt: 2 }}
          >
            {usuarios && usuarios
              .filter(u => u.email !== colaborador?.email) // Não mostrar o próprio usuário
              .filter(u => u.isAdmin) // Apenas usuários TI/Admin
              .map(u => (
                <MenuItem key={u.email} value={u.email}>
                  {u.nome} ({u.email})
                </MenuItem>
              ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={fecharModalTransferir}>Cancelar</Button>
          <Button onClick={confirmarTransferencia} variant="contained" color="primary">
            Transferir
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({ ...toast, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={toast.type} sx={{ width: '100%' }}>{toast.msg}</Alert>
      </Snackbar>
    </Box>
  );

  async function handleEnviarComentario() {
    if (!detalhe || (!comentario.trim() && anexos.length === 0)) {
      setToast({ open: true, msg: 'Digite um comentário ou anexe um arquivo.', type: 'warning' });
      return;
    }
    setEnviandoComentario(true);
    try {
      // Envia todos os anexos juntos em um único comentário
      const formData = new FormData();
      formData.append('comentario', comentario);
      anexos.forEach(file => formData.append('anexo', file, file.name));
      const token = localStorage.getItem('token');
      const resp = await fetch(`http://localhost:5000/api/chamados/${detalhe._id || detalhe.id}`, {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });
      if (!resp.ok) {
        let erro = 'Erro ao enviar comentário';
        try { erro = (await resp.json()).error || erro; } catch {}
        throw new Error(erro);
      }
      const data = await resp.json();
      // Atualiza o detalhe localmente para refletir o novo comentário
      setDetalhe(d => ({ ...d, historico: [...(d.historico || []), ...(data.historico ? [data.historico[data.historico.length - 1]] : [])] }));
      setComentario('');
      setAnexos([]);
      setToast({ open: true, msg: 'Comentário enviado!', type: 'success' });
    } catch (err) {
      setToast({ open: true, msg: err.message || 'Erro ao enviar comentário', type: 'error' });
    } finally {
      setEnviandoComentario(false);
    }
  }
}
