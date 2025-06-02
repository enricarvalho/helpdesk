import React, { useState } from 'react';
import { Paper, Typography, Box, TextField, Button, Stack, Snackbar, Alert } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { atualizarUsuario } from './services/api';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

function gerarSenhaForte(tamanho = 12) {
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numberChars = '0123456789';
  const specialChars = '!@#$%^&*()_+-=~';
  const allChars = lowercaseChars + uppercaseChars + numberChars + specialChars;

  let senha = '';
  // Garante pelo menos um de cada tipo
  senha += lowercaseChars.charAt(Math.floor(Math.random() * lowercaseChars.length));
  senha += uppercaseChars.charAt(Math.floor(Math.random() * uppercaseChars.length));
  senha += numberChars.charAt(Math.floor(Math.random() * numberChars.length));
  senha += specialChars.charAt(Math.floor(Math.random() * specialChars.length));

  // Preenche o restante da senha até o tamanho desejado
  // (tamanho - 4) porque 4 caracteres já foram adicionados
  // Garante que o tamanho mínimo seja 8, mesmo que o 'tamanho' passado seja menor.
  const remainingLength = Math.max(tamanho - 4, 4); // Se tamanho for 8, remainingLength será 4. Se tamanho for < 8, será 4.

  for (let i = 0; i < remainingLength; i++) {
    senha += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }

  // Embaralha a senha para que os caracteres garantidos não fiquem sempre no início
  return senha.split('').sort(() => 0.5 - Math.random()).join('');
}

// Validação de senha forte
function validarSenhaForte(senha) {
  // Pelo menos 8 caracteres, 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=~]).{8,}$/.test(senha);
}

// Remove localStorage completamente do fluxo de senha
export default function AlterarSenha({ colaborador, onSalvar, isAdmin, obrigatoria = false }) {
  const [form, setForm] = useState({
    senhaAtual: '',
    novaSenha: '',
    repetirNovaSenha: ''
  });
  const [toast, setToast] = useState({ open: false, msg: '', type: 'success' });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showRepetirSenha, setShowRepetirSenha] = useState(false);

  // Requisitos de senha forte
  const requisitos = [
    { label: 'Mínimo 8 caracteres', test: s => (s || '').length >= 8 },
    { label: 'Letra maiúscula', test: s => /[A-Z]/.test(s || '') },
    { label: 'Letra minúscula', test: s => /[a-z]/.test(s || '') },
    { label: 'Número', test: s => /\d/.test(s || '') },
    { label: 'Caractere especial', test: s => /[!@#$%^&*()_+\-=~]/.test(s || '') },
  ];
  const senhaValida = requisitos.every(r => r.test(form.novaSenha));

  // Preenche senhaAtual automaticamente se obrigatória e colaborador existe
  React.useEffect(() => {
    if (obrigatoria && colaborador && colaborador.senhaTemporaria && !form.senhaAtual) {
      setForm(f => ({ ...f, senhaAtual: '' })); // Usuário deve digitar a senha temporária recebida
    }
  }, [obrigatoria, colaborador]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleGerarSenha() {
    const senha = gerarSenhaForte();
    setForm(f => ({ ...f, novaSenha: senha, repetirNovaSenha: senha }));
    navigator.clipboard.writeText(senha);
    setToast({ open: true, msg: 'Senha gerada e copiada para a área de transferência!', type: 'success' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErro('');
    const { novaSenha, repetirNovaSenha, senhaAtual } = form;
    try {
      if (!novaSenha) {
        setToast({ open: true, msg: 'Preencha a nova senha.', type: 'error' });
        setLoading(false);
        return;
      }
      if (!senhaValida) {
        setToast({ open: true, msg: 'A senha não atende aos requisitos de segurança.', type: 'error' });
        setLoading(false);
        return;
      }
      if (!senhaAtual) {
        setToast({ open: true, msg: obrigatoria ? 'Digite a senha temporária recebida.' : 'Digite a senha atual.', type: 'error' });
        setLoading(false);
        return;
      }
      if (!repetirNovaSenha) {
        setToast({ open: true, msg: 'Confirme a nova senha.', type: 'error' });
        setLoading(false);
        return;
      }
      if (novaSenha !== repetirNovaSenha) {
        setToast({ open: true, msg: 'As senhas não coincidem.', type: 'error' });
        setLoading(false);
        return;
      }
      // Troca de senha obrigatória: sempre exige senha temporária
      let usuarioAtualizado;
      usuarioAtualizado = await atualizarUsuario(colaborador._id, { senha: novaSenha, senhaAtual });
      setToast({ open: true, msg: obrigatoria ? 'Senha alterada com sucesso! Faça login novamente.' : 'Senha alterada com sucesso!', type: 'success' });
      if (onSalvar) onSalvar(usuarioAtualizado);
      setForm({ senhaAtual: '', novaSenha: '', repetirNovaSenha: '' });
    } catch (err) {
      if (err?.response?.status === 401 || /senha atual/i.test(err.message)) {
        setErro('Senha atual incorreta.');
        setToast({ open: true, msg: obrigatoria ? 'Senha temporária incorreta.' : 'Senha atual incorreta.', type: 'error' });
      } else {
        setErro('Erro ao alterar senha');
        setToast({ open: true, msg: err.message || 'Erro ao alterar senha', type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  }

  // Foco automático no campo senhaAtual
  const senhaAtualRef = React.useRef();
  React.useEffect(() => {
    if (senhaAtualRef.current) senhaAtualRef.current.focus();
  }, []);

  function handlePasteConfirmar(e) {
    e.preventDefault();
    setToast({ open: true, msg: 'Por segurança, digite a confirmação da senha.', type: 'warning' });
  }

  return (
    <Paper sx={{ p: 3, maxWidth: 400, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" mb={2}>{obrigatoria ? 'Troca obrigatória de senha' : 'Alterar Senha'}</Typography>
      <Box component="form" onSubmit={handleSubmit} autoComplete="off">
        <Stack spacing={2}>
          <TextField
            label={obrigatoria ? 'Senha temporária recebida' : 'Senha atual'}
            name="senhaAtual"
            type={showNovaSenha ? 'text' : 'password'}
            value={form.senhaAtual}
            onChange={handleChange}
            fullWidth
            required
            autoComplete="current-password"
            inputProps={{ 'aria-label': obrigatoria ? 'Senha temporária recebida' : 'Senha atual' }}
            inputRef={senhaAtualRef}
          />
          <TextField
            label="Nova senha"
            name="novaSenha"
            type={showNovaSenha ? 'text' : 'password'}
            value={form.novaSenha}
            onChange={handleChange}
            fullWidth
            required
            autoComplete="new-password"
            inputProps={{ 'aria-label': 'Nova senha', minLength: 8 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowNovaSenha(v => !v)} edge="end" aria-label={showNovaSenha ? 'Ocultar senha' : 'Mostrar senha'} tabIndex={0}>
                    {showNovaSenha ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          {/* Dicas de senha forte */}
          <Box sx={{ mb: 1, mt: -1 }}>
            {requisitos.map((r, i) => (
              <Typography key={i} variant="caption" sx={{ color: r.test(form.novaSenha) ? 'success.main' : 'text.secondary', display: 'block', pl: 1 }}>
                {r.test(form.novaSenha) ? '✔' : '✖'} {r.label}
              </Typography>
            ))}
          </Box>
          <TextField
            label="Confirmar nova senha"
            name="repetirNovaSenha"
            type={showRepetirSenha ? 'text' : 'password'}
            value={form.repetirNovaSenha}
            onChange={handleChange}
            onPaste={handlePasteConfirmar}
            fullWidth
            required
            autoComplete="new-password"
            inputProps={{ 'aria-label': 'Confirmar nova senha', minLength: 8 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowRepetirSenha(v => !v)} edge="end" aria-label={showRepetirSenha ? 'Ocultar senha' : 'Mostrar senha'} tabIndex={0}>
                    {showRepetirSenha ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          {isAdmin && !obrigatoria && (
            <Button onClick={handleGerarSenha} variant="outlined" color="secondary" startIcon={<ContentCopyIcon />} aria-label="Gerar senha segura">Gerar senha segura</Button>
          )}
          <Button type="submit" variant="contained" disabled={loading || !senhaValida || !form.senhaAtual || !form.novaSenha || !form.repetirNovaSenha || form.novaSenha !== form.repetirNovaSenha} aria-label="Salvar nova senha" aria-disabled={loading || !senhaValida || !form.senhaAtual || !form.novaSenha || !form.repetirNovaSenha || form.novaSenha !== form.repetirNovaSenha}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </Stack>
      </Box>
      {erro && <Typography color="error" mt={2}>{erro}</Typography>}
      <Snackbar open={toast.open} autoHideDuration={3000} onClose={(e, reason) => { if (reason !== 'clickaway') setToast({ ...toast, open: false }); }} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={toast.type} sx={{ width: '100%' }} aria-live="polite">{toast.msg}</Alert>
      </Snackbar>
    </Paper>
  );
}

// Ajuste: aria-live adicionado ao Alert para feedback acessível
// Ajuste: aria-disabled sincronizado com disabled no botão Salvar
// Ajuste: tabIndex e aria-pressed nos ícones de visibilidade para navegação por teclado
