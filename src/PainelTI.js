import React, { useState } from 'react';
import { Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Alert, Box, Divider, MenuItem } from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ListaChamados from './ListaChamados';

const prioridadeCor = {
  'Baixa': 'success',
  'Média': 'info',
  'Alta': 'warning',
  'Urgente': 'error'
};

export default function PainelTI({ 
  chamados, 
  usuarios, 
  colaborador, 
  usuariosTI,
  onAtribuir,
  onStatus,
  onReivindicar,
  onTransferir,
  onExcluir,
  onAbrirChamado,
  onExcluirChamado,
  exibirFiltros = true,
  modoAbas = false,
  abaEmAndamentoLabel = "Em andamento"
}) {  // Estado do detalhe do chamado
  const [detalhe, setDetalhe] = useState(null);  // Filtros locais - apenas quando modoAbas está ativo
  const [filtros, setFiltros] = useState({ 
    busca: '', 
    status: '',
    prioridade: '' 
  });

  // Filtrar chamados - comportamento diferente conforme o modo
  const chamadosFiltrados = chamados.filter(c => {
    // Se for admin (colaborador.isAdmin), mostra todos os chamados
    // Se for usuário comum, só mostra chamados do usuário logado
    if (!colaborador?.isAdmin) {
      if (!colaborador || !c.usuario || (c.usuario.email !== colaborador.email)) return false;
    }
    
    // Se modoAbas está desabilitado E exibirFiltros está ativo, 
    // não aplica filtros aqui - deixa o ListaChamados fazer toda a filtragem
    if (!modoAbas && exibirFiltros) {
      return true; // Passa todos os chamados para ListaChamados filtrar
    }
    
    // Aplicar filtros apenas no modo abas OU quando filtros não são exibidos
    if (modoAbas && filtros.status && c.status !== filtros.status) return false;
    if (filtros.prioridade && c.prioridade !== filtros.prioridade) return false;
    if (filtros.busca && !(
      (c.titulo && c.titulo.toLowerCase().includes(filtros.busca.toLowerCase())) ||
      (c.descricao && c.descricao.toLowerCase().includes(filtros.busca.toLowerCase()))
    )) return false;
    
    return true;
  });
  // Se modoAbas estiver ativo, usa ListaChamados com abas
  if (modoAbas) {
    return (
      <ListaChamados
        chamados={chamadosFiltrados}
        isAdmin={colaborador?.isAdmin || false}
        usuarios={usuarios}
        usuariosTI={usuariosTI}
        onReivindicar={onReivindicar}
        onAtribuir={onAtribuir}
        onStatus={onStatus}
        onTransferir={onTransferir}
        onExcluir={onExcluir || onExcluirChamado}
        onAbrirChamado={onAbrirChamado}
        onNovoChamado={onAbrirChamado}
        colaborador={colaborador}
        permitirComentarioDono={!colaborador?.isAdmin}
        abaEmAndamentoLabel={abaEmAndamentoLabel}
        exibirFiltros={exibirFiltros}
        exibirBotaoCriar={!colaborador?.isAdmin}
        modoAbas={true}
      />
    );
  }// Renderização
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4 }}>
      <ListaChamados
        chamados={chamadosFiltrados}
        isAdmin={colaborador?.isAdmin || false}
        usuarios={usuarios}
        usuariosTI={usuariosTI}
        onReivindicar={onReivindicar}
        onAtribuir={onAtribuir}
        onStatus={onStatus}
        onTransferir={onTransferir}
        onExcluir={onExcluir || onExcluirChamado}
        onAbrirChamado={onAbrirChamado}
        onNovoChamado={onAbrirChamado}
        colaborador={colaborador}
        permitirComentarioDono={!colaborador?.isAdmin}
        exibirFiltros={true}
        exibirBotaoCriar={!colaborador?.isAdmin}
      />
    </Box>
  );
}

// Ao abrir modal de edição de usuário, garantir departamento string
// Exemplo de uso: setUsuarioEdit({ ...u, departamento: typeof u.departamento === 'object' && u.departamento.nome ? u.departamento.nome : u.departamento });
// Se houver lógica de edição de usuário aqui, aplicar conversão similar ao abrir o modal.
