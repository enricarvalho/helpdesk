import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, TextField, List, ListItem, ListItemText, Divider, IconButton, Paper, Snackbar, Alert, CircularProgress, useTheme } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { getUsuarios, getDepartamentos, criarDepartamento, deletarDepartamento } from './services/api';

export default function Departamentos() {
  const [departamentos, setDepartamentos] = useState([]);
  const [novo, setNovo] = useState('');
  const [toast, setToast] = useState({ open: false, msg: '', type: 'success' });
  const inputRef = useRef(null);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true); // Iniciar como true para mostrar o loader inicialmente
  const theme = useTheme();

  // Busca usuários e departamentos do backend
  useEffect(() => {
    setLoading(true);
    Promise.all([
      getUsuarios().then(data => setUsuarios(data || [])), // Garantir que usuarios seja sempre um array
      getDepartamentos().then(deps => setDepartamentos(deps ? deps.map(d => d.nome) : [])) // Garantir que deps seja um array
    ])
      .catch(() => setToast({ open: true, msg: 'Erro ao carregar dados iniciais.', type: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  async function adicionarDepartamento() {
    const nome = novo.trim();
    if (!nome) {
      setToast({ open: true, msg: 'O nome do departamento não pode estar vazio.', type: 'warning' });
      return;
    }
    if (departamentos.some(dep => dep.toLowerCase() === nome.toLowerCase())) {
      setToast({ open: true, msg: 'Departamento já existe.', type: 'error' });
      return;
    }
    try {
      const novoDepartamento = await criarDepartamento({ nome });
      // Assumindo que criarDepartamento retorna o departamento criado com seu nome
      setDepartamentos(prev => [...prev, novoDepartamento.nome].sort((a, b) => a.localeCompare(b)));
      setNovo('');
      setToast({ open: true, msg: 'Departamento adicionado com sucesso!', type: 'success' });
      if (inputRef.current) inputRef.current.focus();
    } catch (err) {
      setToast({ open: true, msg: err.response?.data?.message || err.message || 'Erro ao adicionar departamento.', type: 'error' });
    }
  }

  async function removerDepartamento(depNome) {
    const emUso = usuarios.some(u => u.departamento === depNome);
    if (emUso) {
      setToast({ open: true, msg: 'Não é possível remover: departamento em uso por um ou mais usuários.', type: 'warning' });
      return;
    }
    try {
      // Precisamos do ID do departamento para deletar, ou ajustar a API para deletar por nome.
      // Por enquanto, vamos assumir que a API deletarDepartamento pode lidar com o nome.
      // Se a API espera um ID, será necessário buscar o ID do departamento antes.
      await deletarDepartamento(depNome); // Se a API deleta por nome.
      setDepartamentos(departamentos.filter(d => d !== depNome));
      setToast({ open: true, msg: 'Departamento removido com sucesso!', type: 'success' });
    } catch (err) {
      setToast({ open: true, msg: err.response?.data?.message || err.message || 'Erro ao remover departamento.', type: 'error' });
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}> {/* 64px é a altura comum de um AppBar */}
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: theme.spacing(4), 
        margin: 'auto', // Centraliza horizontalmente
        marginTop: theme.spacing(5), // Margem no topo
        maxWidth: 600, 
        width: '100%',
        borderRadius: theme.shape.borderRadius * 2, // Cantos mais arredondados
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing(3)
      }}
    >
      <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center', fontWeight: 'bold', color: theme.palette.primary.main }}>
        Gerenciar Departamentos
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexDirection: { xs: 'column', sm: 'row' } }}>
        <TextField
          label="Novo departamento"
          variant="outlined"
          value={novo}
          onChange={e => setNovo(e.target.value)}
          size="small"
          fullWidth
          inputRef={inputRef}
          inputProps={{ 'aria-label': 'Novo departamento' }}
          onKeyDown={e => { if (e.key === 'Enter') adicionarDepartamento(); }}
          sx={{ flexGrow: 1 }}
        />
        <Button 
          variant="contained" 
          color="primary" 
          onClick={adicionarDepartamento} 
          startIcon={<AddIcon />} 
          sx={{ 
            minWidth: { xs: '100%', sm: 140 }, // Botão ocupa largura total em telas pequenas
            height: '40px' // Altura consistente com TextField size="small"
          }} 
          aria-label="Adicionar departamento"
        >
          Adicionar
        </Button>
      </Box>

      {departamentos.length > 0 ? (
        <Paper variant="outlined" sx={{ mt: 2, maxHeight: 350, overflowY: 'auto', p: 1 }}>
          <List>
            {departamentos.map((dep, index) => (
              <React.Fragment key={dep}>
                <ListItem
                  secondaryAction={
                    <IconButton edge="end" aria-label={`Remover departamento ${dep}`} onClick={() => removerDepartamento(dep)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  }
                  sx={{ 
                    '&:hover': {
                      backgroundColor: theme.palette.action.hover
                    },
                    borderRadius: theme.shape.borderRadius,
                    mb: index < departamentos.length -1 ? 0.5 : 0 // Pequena margem inferior, exceto no último
                  }}
                >
                  <ListItemText primary={dep} />
                </ListItem>
                {index < departamentos.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      ) : (
        <Typography sx={{ textAlign: 'center', mt: 3, color: theme.palette.text.secondary }}>
          Nenhum departamento cadastrado.
        </Typography>
      )}

      <Snackbar 
        open={toast.open} 
        autoHideDuration={4000} 
        onClose={() => setToast({ ...toast, open: false })} 
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.type} sx={{ width: '100%' }} variant="filled" onClose={() => setToast({ ...toast, open: false })}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
