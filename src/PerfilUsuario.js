import React, { useState, useEffect } from 'react';
import { Paper, Typography, Box, TextField, Button, Stack, Avatar, Snackbar, Alert, MenuItem, Select, InputLabel, FormControl } from '@mui/material';
import { getDepartamentos, atualizarUsuario } from './services/api';
import AttachFileIcon from '@mui/icons-material/AttachFile';

export default function PerfilUsuario({ colaborador, onSalvar, onFechar }) {
  const isAdmin = colaborador?.isAdmin === true; // Corrigido para usar isAdmin
  const [departamentos, setDepartamentos] = useState([]);
  // Função utilitária para garantir string
  function extrairDepartamento(dep) {
    if (!dep) return 'Não informado';
    if (typeof dep === 'string') return dep;
    if (typeof dep === 'object' && dep.nome) return dep.nome;
    return 'Não informado';
  }
  const [form, setForm] = useState({
    nome: colaborador?.nome || '',
    email: colaborador?.email || '',
    senha: colaborador?.senha || '',
    fotoPerfil: colaborador?.fotoPerfil || '',
    departamento: extrairDepartamento(colaborador?.departamento),
    novaFoto: null
  });
  const [toast, setToast] = useState({ open: false, msg: '', type: 'success' });

  useEffect(() => {
    getDepartamentos().then(deps => {
      // Corrige: se vierem objetos, extrai apenas o nome
      if (deps && deps.length > 0 && typeof deps[0] === 'object' && deps[0].nome) {
        setDepartamentos(deps.map(d => d.nome));
      } else {
        setDepartamentos(deps);
      }
    });
  }, []);

  function handleChange(e) {
    if (e.target.name === 'departamento') {
      setForm({ ...form, departamento: String(e.target.value) });
    } else {
      setForm({ ...form, [e.target.name]: e.target.value });
    }
  }
  function handleFoto(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setForm(f => ({ ...f, fotoPerfil: reader.result, novaFoto: file }));
      };
      reader.readAsDataURL(file);
    }
  }
  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nome || !form.email) {
      setToast({ open: true, msg: 'Preencha nome e email.', type: 'error' });
      return;
    }
    // Garante que o id do usuário é o _id do MongoDB
    const userId = colaborador._id;
    if (!userId) {
      setToast({ open: true, msg: 'Erro interno: ID do usuário não encontrado. Faça login novamente.', type: 'error' });
      return;
    }
    try {
      const usuarioAtualizado = await atualizarUsuario(userId, {
        nome: form.nome,
        email: form.email,
        fotoPerfil: form.fotoPerfil,
        departamento: String(form.departamento) || 'Não informado'
      });
      setToast({ open: true, msg: 'Perfil atualizado com sucesso!', type: 'success' });
      if (onSalvar) onSalvar(usuarioAtualizado); // Usa sempre o retorno da API
    } catch (err) {
      setToast({ open: true, msg: 'Erro ao salvar. Certifique-se de que a foto tem no máximo 500x500 pixels.', type: 'error' });
    }
  }

  return (
    <Paper sx={{ p: 3, maxWidth: 400, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" mb={2}>Meu Perfil</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
        <Avatar src={form.fotoPerfil} sx={{ width: 80, height: 80, mb: 1 }} />
        <Button variant="outlined" component="label">Alterar Foto
          <input type="file" hidden accept="image/*" onChange={handleFoto} />
        </Button>
      </Box>
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <TextField label="Nome" name="nome" value={form.nome} onChange={handleChange} fullWidth required />
          <TextField label="E-mail" name="email" value={form.email} onChange={handleChange} fullWidth required />
          <FormControl fullWidth required>
            <InputLabel id="departamento-label">Departamento</InputLabel>
            <Select
              labelId="departamento-label"
              name="departamento"
              value={form.departamento}
              label="Departamento"
              onChange={isAdmin ? handleChange : undefined}
              inputProps={{ readOnly: !isAdmin }}
              disabled={!isAdmin}
            >
              {departamentos.map((d, idx) => (
                <MenuItem key={idx} value={typeof d === 'object' && d.nome ? d.nome : d}>{typeof d === 'object' && d.nome ? d.nome : d}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button type="submit" variant="contained">Salvar</Button>
          <Button variant="outlined" color="secondary" onClick={onFechar} sx={{ mt: 1 }}>Voltar</Button>
        </Stack>
      </Box>
      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({ ...toast, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={toast.type} sx={{ width: '100%' }}>{toast.msg}</Alert>
      </Snackbar>
    </Paper>
  );
}
