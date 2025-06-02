import React, { useState } from 'react';
import { Box, Button, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Snackbar, Alert } from '@mui/material';
import CadastroUsuario from './CadastroUsuario';

export default function PaginaUsuariosAdmin({ usuarios, onAtualizarUsuarios, loading, erro }) {
  const [modo, setModo] = useState('listagem'); // 'listagem' | 'cadastro' | 'edicao'
  const [usuarioEdit, setUsuarioEdit] = useState(null);
  const [toast, setToast] = useState({ open: false, msg: '', type: 'success' });

  function handleNovoUsuario() {
    setUsuarioEdit(null);
    setModo('cadastro');
  }

  function handleEditarUsuario(usuario) {
    setUsuarioEdit(usuario);
    setModo('edicao');
  }

  function handleSalvarUsuario() {
    setModo('listagem');
    setUsuarioEdit(null);
    if (onAtualizarUsuarios) onAtualizarUsuarios();
    setToast({ open: true, msg: 'Usuário salvo com sucesso!', type: 'success' });
  }

  function handleCancelar() {
    setModo('listagem');
    setUsuarioEdit(null);
  }

  if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  if (erro) return <Box sx={{ p: 4, textAlign: 'center' }}><Alert severity="error">{erro}</Alert></Box>;

  if (modo === 'cadastro' || modo === 'edicao') {
    return (
      <Box>
        <Button onClick={handleCancelar} sx={{ mb: 2 }}>Voltar para listagem</Button>
        <CadastroUsuario onSalvar={handleSalvarUsuario} usuario={usuarioEdit} />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Usuários cadastrados</Typography>
        <Button variant="contained" color="primary" onClick={handleNovoUsuario}>Criar usuário</Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Departamento</TableCell>
              <TableCell>Admin</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {usuarios.map((u) => (
              <TableRow key={u._id}>
                <TableCell>{u.nome}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.departamento}</TableCell>
                <TableCell>{u.isAdmin ? 'Sim' : 'Não'}</TableCell>
                <TableCell>
                  <Button size="small" onClick={() => handleEditarUsuario(u)}>Editar</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({ ...toast, open: false })}>
        <Alert severity={toast.type} sx={{ width: '100%' }}>{toast.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
