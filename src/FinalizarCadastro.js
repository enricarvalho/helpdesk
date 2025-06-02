import React, { useState, useEffect } from 'react';
import { Paper, Typography, Box, TextField, Button, Stack, Snackbar, Alert, IconButton, InputAdornment } from '@mui/material';
import { useParams } from 'react-router-dom';
import { buscarUsuarioPorToken, finalizarCadastro } from './services/api';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import PropTypes from 'prop-types';

export default function FinalizarCadastro({ obrigatorio = false, colaborador = null, onFinalizar }) {
  const params = useParams();
  const token = obrigatorio ? null : params.token;
  const [form, setForm] = useState({ senhaTemp: '', novaSenha: '', repetirNovaSenha: '' });
  const [usuario, setUsuario] = useState(null);
  const [toast, setToast] = useState({ open: false, msg: '', type: 'success' });
  const [loading, setLoading] = useState(false);
  const [showSenhaTemp, setShowSenhaTemp] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showRepetir, setShowRepetir] = useState(false);

  useEffect(() => {
    if (obrigatorio && colaborador) {
      setUsuario({ email: colaborador.email, departamento: colaborador.departamento });
    } else if (token) {
      buscarUsuarioPorToken(token)
        .then(setUsuario)
        .catch(() => setToast({ open: true, msg: 'Link inválido ou expirado.', type: 'error' }));
    }
  }, [token, obrigatorio, colaborador]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!obrigatorio && (!form.senhaTemp || !form.novaSenha || !form.repetirNovaSenha)) {
      setToast({ open: true, msg: 'Preencha todos os campos.', type: 'error' });
      return;
    }
    if (form.novaSenha !== form.repetirNovaSenha) {
      setToast({ open: true, msg: 'As senhas não coincidem.', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      if (obrigatorio && colaborador) {
        // Troca de senha obrigatória: chama API de atualizarUsuario com senhaAtual
        await require('./services/api').atualizarUsuario(colaborador._id, { senha: form.novaSenha, senhaAtual: form.senhaAtual || form.senhaTemp });
        setToast({ open: true, msg: 'Senha alterada com sucesso! Redirecionando para login...', type: 'success' });
        setTimeout(() => {
          if (onFinalizar) onFinalizar(null); // Limpa colaborador
          window.location.href = '/';
        }, 1200);
      } else {
        await finalizarCadastro(token, form.senhaTemp, form.novaSenha);
        setToast({ open: true, msg: 'Cadastro finalizado com sucesso! Redirecionando para login...', type: 'success' });
        setTimeout(() => {
          window.location.href = '/';
        }, 1200);
      }
    } catch (err) {
      setToast({ open: true, msg: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  if (!usuario) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
        <Paper sx={{ p: 4, minWidth: 350 }}>
          <Typography variant="h6">Carregando dados do usuário...</Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
      <Paper sx={{ p: 4, minWidth: 350 }}>
        <Typography variant="h5" mb={2} color="primary">{obrigatorio ? 'Troca obrigatória de senha' : 'Finalizar Cadastro'}</Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField label="E-mail" value={usuario.email} InputProps={{ readOnly: true }} fullWidth />
            <TextField label="Departamento" value={usuario.departamento} InputProps={{ readOnly: true }} fullWidth />
            {!obrigatorio && (
              <TextField
                name="senhaTemp"
                label="Senha temporária"
                type={showSenhaTemp ? 'text' : 'password'}
                value={form.senhaTemp}
                onChange={handleChange}
                required
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowSenhaTemp(v => !v)} edge="end">
                        {showSenhaTemp ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            )}
            {obrigatorio && (
              <TextField
                name="senhaAtual"
                label="Senha atual (temporária)"
                type={showSenhaTemp ? 'text' : 'password'}
                value={form.senhaAtual || form.senhaTemp}
                onChange={e => setForm({ ...form, senhaAtual: e.target.value, senhaTemp: e.target.value })}
                required
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowSenhaTemp(v => !v)} edge="end">
                        {showSenhaTemp ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                helperText="Digite a senha temporária recebida."
              />
            )}
            <TextField
              name="novaSenha"
              label="Nova senha"
              type={showNovaSenha ? 'text' : 'password'}
              value={form.novaSenha}
              onChange={handleChange}
              required
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowNovaSenha(v => !v)} edge="end">
                      {showNovaSenha ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <TextField
              name="repetirNovaSenha"
              label="Repetir nova senha"
              type={showRepetir ? 'text' : 'password'}
              value={form.repetirNovaSenha}
              onChange={handleChange}
              required
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowRepetir(v => !v)} edge="end">
                      {showRepetir ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <Button type="submit" variant="contained" color="primary" disabled={loading}>{loading ? 'Salvando...' : (obrigatorio ? 'Trocar Senha' : 'Finalizar Cadastro')}</Button>
          </Stack>
        </Box>
      </Paper>
      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({ ...toast, open: false })}>
        <Alert severity={toast.type} sx={{ width: '100%' }}>{toast.msg}</Alert>
      </Snackbar>
    </Box>
  );
}

FinalizarCadastro.propTypes = {
  obrigatorio: PropTypes.bool,
  colaborador: PropTypes.object,
  onFinalizar: PropTypes.func
};
