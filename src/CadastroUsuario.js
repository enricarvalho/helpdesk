import React, { useState } from 'react';
import { Paper, Typography, Box, TextField, Button, Stack, Snackbar, Alert, FormControl, InputLabel, Select, MenuItem, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import InputAdornment from '@mui/material/InputAdornment';
import { getDepartamentos } from './services/api';

// Validação de senha forte
function validarSenhaForte(senha) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=~]).{8,}$/.test(senha);
}

// Validação de e-mail
function validarEmail(email) {
  return /^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/.test(email);
}

export default function CadastroUsuario({ onSalvar, usuario }) {
  // Novo fluxo: apenas nome completo e email no cadastro inicial
  // Garante que departamento seja sempre string
  function extrairDepartamento(dep) {
    if (!dep) return '';
    if (typeof dep === 'string') return dep;
    if (typeof dep === 'object' && dep.nome) return dep.nome;
    return '';
  }
  const [form, setForm] = useState(() => {
    if (!usuario) return { nome: '', email: '', senha: '', tipo: 'usuario', bloqueado: false, departamento: '' };
    // Garante que senha sempre seja string (evita erro de length)
    return { ...usuario, senha: usuario.senha || '' , departamento: extrairDepartamento(usuario.departamento) };
  });
  const [toast, setToast] = useState({ open: false, msg: '', type: 'success' });
  const [departamentos, setDepartamentos] = useState([]);
  const [openDepto, setOpenDepto] = useState(false);
  const [novoDepto, setNovoDepto] = useState('');  // Novo campo: admin (só se for TI)
  const [admin, setAdmin] = useState(usuario ? usuario.isAdmin : false);
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [linkFinalizacao, setLinkFinalizacao] = useState('');

  // Gera senha aleatória ao criar novo usuário
  function gerarSenhaAleatoria(tamanho = 12) { // Aumentado tamanho padrão para acomodar requisitos
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
    for (let i = 0; i < tamanho - 4; i++) {
      senha += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }

    // Embaralha a senha para que os caracteres garantidos não fiquem sempre no início
    return senha.split('').sort(() => 0.5 - Math.random()).join('');
  }

  React.useEffect(() => {
    if (!usuario) {
      setForm(f => ({ ...f, senha: gerarSenhaAleatoria() }));
    }
  }, [usuario]);
  // Busca departamentos da API ao abrir o modal
  React.useEffect(() => {
    getDepartamentos().then(setDepartamentos);
  }, [usuario]);

  // Regra: TI sempre deve ter privilégios admin
  React.useEffect(() => {
    if (form.departamento === 'TI') {
      setAdmin(true);
    }
  }, [form.departamento]);

  // Foco automático no campo nome
  const nomeRef = React.useRef();
  React.useEffect(() => {
    if (nomeRef.current) nomeRef.current.focus();
  }, []);

  function handleChange(e) {
    // Garante que departamento seja sempre string
    if (e.target.name === 'departamento') {
      setForm({ ...form, departamento: String(e.target.value) });
    } else {
      setForm({ ...form, [e.target.name]: e.target.value });
    }
  }

  function handleGerarSenha() {
    const senha = gerarSenhaAleatoria();
    setForm(f => ({ ...f, senha }));
  }

  function handleCopiarSenha() {
    navigator.clipboard.writeText(form.senha);
    setToast({ open: true, msg: 'Senha copiada!', type: 'success' });
  }

  // Previne colar no campo de senha
  function handlePasteSenha(e) {
    e.preventDefault();
    setToast({ open: true, msg: 'Por segurança, digite a senha.', type: 'warning' });
  }

  const requisitos = [
    { label: 'Mínimo 8 caracteres', test: s => (s || '').length >= 8 },
    { label: 'Letra maiúscula', test: s => /[A-Z]/.test(s || '') },
    { label: 'Letra minúscula', test: s => /[a-z]/.test(s || '') },
    { label: 'Número', test: s => /\d/.test(s || '') },
    { label: 'Caractere especial', test: s => /[!@#$%^&*()_+\-=~]/.test(s || '') },
  ];
  const senhaValida = requisitos.every(r => r.test(form.senha || ''));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nome || !form.email || !form.departamento || (!usuario && !form.senha)) {
      setToast({ open: true, msg: 'Preencha todos os campos obrigatórios.', type: 'error' });
      return;
    }
    if (!validarEmail(form.email)) {
      setToast({ open: true, msg: 'Digite um e-mail válido.', type: 'error' });
      return;
    }
    if (!usuario && !senhaValida) {
      setToast({ open: true, msg: 'A senha não atende aos requisitos de segurança.', type: 'error' });
      return;
    }
    if (form.nome && form.email && form.departamento && (!usuario && form.senha || usuario)) {
      const isTI = form.departamento === 'TI';
      const tipo = isTI && admin ? 'admin' : 'usuario';
      try {
        if (!usuario) {
          // Cadastro novo usuário
          const resp = await require('./services/api').criarUsuario({ ...form, departamento: String(form.departamento), tipo, isTI, isAdmin: admin });
          if (resp.tokenCadastro) {
            setLinkFinalizacao(`${window.location.origin}/finalizar-cadastro/${resp.tokenCadastro}`);
          }
          setToast({ open: true, msg: 'Usuário cadastrado! Copie a senha e envie ao usuário.', type: 'success' });
          if (onSalvar) onSalvar(); // Callback para App.js atualizar lista via API
        } else {
          // Edição de usuário existente
          const dadosAtualizados = { ...form, tipo, isTI, isAdmin: admin };
          if (!form.senha) delete dadosAtualizados.senha; // Não envia senha se não foi alterada
          const usuarioAtualizado = await require('./services/api').atualizarUsuario(usuario._id, dadosAtualizados);
          setToast({ open: true, msg: 'Usuário atualizado com sucesso!', type: 'success' });
          if (onSalvar) onSalvar(usuarioAtualizado); // Usa sempre o retorno da API
        }
      } catch (err) {
        setToast({ open: true, msg: err.message, type: 'error' });
      }
    } else {
      setToast({ open: true, msg: 'Preencha todos os campos obrigatórios.', type: 'error' });
    }
  }

  function handleAddDepto() {
    if (novoDepto && !departamentos.includes(novoDepto)) {
      // Chama API para criar departamento
      // await criarDepartamento({ nome: novoDepto });
      setDepartamentos([...departamentos, novoDepto]);
      setNovoDepto('');
    }
  }
  function handleRemoveDepto(nome) {
    setDepartamentos(departamentos.filter(d => d !== nome));
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" mb={2}>{usuario ? 'Editar Usuário' : 'Novo Usuário'}</Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <TextField name="nome" label="Nome completo" value={form.nome} onChange={handleChange} required fullWidth inputRef={nomeRef} />
          <TextField
            name="email"
            label="E-mail"
            value={form.email}
            onChange={handleChange}
            required
            fullWidth
            error={!!form.email && !validarEmail(form.email)}
            helperText={form.email && !validarEmail(form.email) ? 'E-mail inválido' : ''}
          />
          <FormControl fullWidth required>
            <InputLabel id="departamento-label">Departamento</InputLabel>
            <Select
              labelId="departamento-label"
              name="departamento"
              value={form.departamento || ''}
              label="Departamento"
              onChange={e => { 
                handleChange(e); 
                // Implementa regra: TI sempre tem privilégios admin
                if (e.target.value === 'TI') {
                  setAdmin(true);
                } else {
                  setAdmin(false);
                }
              }}
              endAdornment={
                <IconButton size="small" onClick={e => { e.stopPropagation(); setOpenDepto(true); }}>
                  <EditIcon fontSize="small" />
                </IconButton>
              }
            >
              {departamentos.map((d, idx) => (
                <MenuItem key={idx} value={typeof d === 'object' && d.nome ? d.nome : d}>{typeof d === 'object' && d.nome ? d.nome : d}</MenuItem>
              ))}
            </Select>
          </FormControl>          {/* Opção de admin só se for TI */}
          {form.departamento === 'TI' && (
            <Box>
              <label>
                <input 
                  type="checkbox" 
                  checked={true} 
                  disabled={true}
                  style={{ opacity: 0.7 }}
                />
                {' '}Privilégios de administrador (obrigatório para TI)
              </label>
            </Box>
          )}
          <TextField
            name="senha"
            label="Senha temporária"
            type={senhaVisivel ? 'text' : 'password'}
            value={form.senha}
            onChange={handleChange}
            onPaste={handlePasteSenha}
            fullWidth
            required={!usuario}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Button onClick={handleGerarSenha} size="small">Gerar</Button>
                    <Button onClick={handleCopiarSenha} size="small" startIcon={<ContentCopyIcon />}>Copiar</Button>
                    <Button onClick={() => setSenhaVisivel(v => !v)} size="small">{senhaVisivel ? 'Ocultar' : 'Mostrar'}</Button>
                  </Stack>
                </InputAdornment>
              )
            }}
          />
          {/* Dicas de senha forte */}
          {!usuario && (
            <Box sx={{ mb: 1, mt: -1 }}>
              {requisitos.map((r, i) => (
                <Typography key={i} variant="caption" sx={{ color: r.test(form.senha || '') ? 'success.main' : 'text.secondary', display: 'block', pl: 1 }}>
                  {r.test(form.senha || '') ? '✔' : '✖'} {r.label}
                </Typography>
              ))}
            </Box>
          )}
          <Button type="submit" variant="contained" disabled={!form.nome || !form.email || !form.departamento || (!usuario && (!form.senha || !senhaValida))}>Salvar</Button>
        </Stack>
      </Box>
      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({ ...toast, open: false })}>
        <Alert severity={toast.type} sx={{ width: '100%' }}>{toast.msg}</Alert>
      </Snackbar>
      <Dialog open={openDepto} onClose={() => setOpenDepto(false)}>
        <DialogTitle>Editar Departamentos</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Box>
              <TextField label="Novo departamento" value={novoDepto} onChange={e => setNovoDepto(e.target.value)} size="small" />
              <Button onClick={handleAddDepto} sx={{ ml: 1 }} variant="contained">Adicionar</Button>
            </Box>
            <Box>
              {departamentos.map((d, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography sx={{ flex: 1 }}>{d}</Typography>
                  {d !== 'Outro' && <Button size="small" color="error" onClick={() => handleRemoveDepto(d)}>Remover</Button>}
                </Box>
              ))}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDepto(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
      {linkFinalizacao && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="primary" sx={{ mb: 1, fontWeight: 500 }}>Link de finalização de cadastro:</Typography>
          <TextField
            value={linkFinalizacao}
            fullWidth
            InputProps={{
              readOnly: true,
              endAdornment: (
                <InputAdornment position="end">
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(linkFinalizacao);
                      setToast({ open: true, msg: 'Link copiado!', type: 'success' });
                    }}
                    size="small"
                    startIcon={<ContentCopyIcon />}
                    variant="outlined"
                  >
                    Copiar
                  </Button>
                </InputAdornment>
              )
            }}
            sx={{ background: '#f5f5f5', fontWeight: 500 }}
          />
        </Box>
      )}
    </Paper>
  );
}
