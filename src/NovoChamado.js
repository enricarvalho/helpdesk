import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, MenuItem, Typography, InputLabel, Select, FormControl, Paper, Stack, Snackbar, Alert } from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import Fuse from 'fuse.js';
import { criarChamado, getChamados } from './services/api';
import Autocomplete from '@mui/material/Autocomplete';

const initialForm = {
  descricao: '',
  prioridade: 'Média',
  anexos: [], // agora é array
  titulo: '',
  categoria: ''
};

// Validação de título e descrição mínimos
function validarTitulo(t) {
  return t && t.trim().length >= 5;
}
function validarDescricao(d) {
  return d && d.trim().length >= 10;
}

export default function NovoChamado({ onAdd, colaborador, hideSugestoes, onAfterCreate, isAdmin }) {
  const [form, setForm] = useState(initialForm);
  const [toast, setToast] = useState({ open: false, msg: '', type: 'success' });
  const [sugestoes, setSugestoes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chamadosResolvidos, setChamadosResolvidos] = useState([]);
  const [loadingSugestoes, setLoadingSugestoes] = useState(false);

  useEffect(() => {
    setForm(f => ({
      ...initialForm,
      nome: colaborador?.nome || '',
      departamento: colaborador?.departamento || ''
    }));
  }, [colaborador]);

  // Carregar chamados resolvidos uma vez ou quando necessário
  useEffect(() => {
    if (hideSugestoes) return;

    const fetchChamadosResolvidos = async () => {
      setLoadingSugestoes(true);
      try {
        const todosChamados = await getChamados(); // Assume que getChamados busca todos os chamados do usuário ou todos se admin
        const resolvidos = todosChamados.filter(
          c => ['Finalizado', 'Resolvido', 'Encerrado'].includes(c.status) && (c.historico?.length > 0 || c.comentarioResolucao)
        );
        setChamadosResolvidos(resolvidos);
      } catch (error) {
        console.error("Erro ao buscar chamados resolvidos:", error);
        setToast({ open: true, msg: 'Erro ao carregar sugestões.', type: 'error' });
      }
      setLoadingSugestoes(false);
    };

    fetchChamadosResolvidos();
  }, [hideSugestoes]);


  useEffect(() => {
    if (hideSugestoes || chamadosResolvidos.length === 0) {
      setSugestoes([]);
      return;
    }

    // Disparar busca por sugestões se título, descrição ou categoria mudarem
    const termoBusca = `${form.titulo} ${form.descricao} ${form.categoria}`.trim().toLowerCase();

    if (termoBusca.length < 5 && !form.categoria) { // Evita buscas com termos muito curtos sem categoria
        setSugestoes([]);
        return;
    }
    
    setLoadingSugestoes(true);
    // Busca fuzzy nos chamados resolvidos
    const fuse = new Fuse(chamadosResolvidos, {
      keys: ['titulo', 'descricao', 'categoria', 'historico.texto'], // Inclui categoria e texto do histórico na busca
      threshold: 0.45, // Ajustar conforme necessário
      minMatchCharLength: 3,
      includeScore: true,
      // Para priorizar chamados com a mesma categoria
      // sortFn: (a, b) => {
      //   if (form.categoria) {
      //     const aIsSameCategory = a.item.categoria === form.categoria;
      //     const bIsSameCategory = b.item.categoria === form.categoria;
      //     if (aIsSameCategory && !bIsSameCategory) return -1;
      //     if (!aIsSameCategory && bIsSameCategory) return 1;
      //   }
      //   return a.score - b.score; // Ordenação padrão por score
      // }
    });

    // Se uma categoria foi selecionada, podemos filtrar previamente ou dar mais peso
    let chamadosParaBusca = chamadosResolvidos;
    if (form.categoria) {
        // Opcional: filtrar por categoria antes do Fuse para maior relevância,
        // ou deixar o Fuse lidar com isso através das keys e sortFn.
        // chamadosParaBusca = chamadosResolvidos.filter(c => c.categoria === form.categoria);
    }
    
    const results = fuse.search(termoBusca)
                      .filter(r => r.score < 0.6) // Filtra por um score máximo para maior relevância
                      .slice(0, 3); // Limita a 3 sugestões

    setSugestoes(results.map(r => r.item));
    setLoadingSugestoes(false);

  }, [form.titulo, form.descricao, form.categoria, chamadosResolvidos, hideSugestoes]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleFile(e) {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setForm(f => ({ ...f, anexos: [...f.anexos, ...files] }));
    }
  }

  function handleRemoveAnexo(idx) {
    setForm(f => ({ ...f, anexos: f.anexos.filter((_, i) => i !== idx) }));
  }

  // Foco automático no campo título
  const tituloRef = React.useRef();
  React.useEffect(() => {
    if (tituloRef.current) tituloRef.current.focus();
  }, []);

  // Previne colar no campo descrição
  function handlePasteDescricao(e) {
    e.preventDefault();
    setToast({ open: true, msg: 'Por segurança, digite a descrição.', type: 'warning' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validarTitulo(form.titulo)) {
      setToast({ open: true, msg: 'O título deve ter pelo menos 5 caracteres.', type: 'error' });
      return;
    }
    if (!validarDescricao(form.descricao)) {
      setToast({ open: true, msg: 'A descrição deve ter pelo menos 10 caracteres.', type: 'error' });
      return;
    }
    if (colaborador && form.descricao) {
      setLoading(true);
      try {
        const chamadoCriado = await criarChamado({
          titulo: form.titulo,
          descricao: form.descricao,
          prioridade: form.prioridade,
          departamento: colaborador.departamento,
          nome: colaborador.nome,
          email: colaborador.email,
          categoria: form.categoria,
          anexos: form.anexos
        });
        setForm(initialForm);
        setToast({ open: true, msg: 'Chamado aberto com sucesso!', type: 'success' });
        // Atualiza a lista de chamados via API após criar
        if (onAdd) {
          const chamadosAtualizados = await getChamados();
          onAdd(chamadosAtualizados);
        }
        // Redireciona para a listagem imediatamente
        if (onAfterCreate) onAfterCreate();
      } catch (err) {
        setToast({ open: true, msg: err.message, type: 'error' });
      } finally {
        setLoading(false);
      }
    }
  }

  // Renderização condicional do painel de sugestões
  return (
    <Box sx={{ display: hideSugestoes ? 'block' : 'flex', gap: 3 }}>
      <Paper elevation={3} sx={{ p: 3, background: '#fff', mb: 4, flex: 1 }}>
        <Typography variant="h5" mb={2} color="primary">Abrir novo chamado</Typography>
        {/* Só exibe o formulário se houver colaborador via prop */}
        {colaborador && (
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2}>
              <TextField name="titulo" label="Título do chamado" value={form.titulo || ''} onChange={handleChange} required fullWidth inputRef={tituloRef} error={!!form.titulo && !validarTitulo(form.titulo)} helperText={form.titulo && !validarTitulo(form.titulo) ? 'Mínimo 5 caracteres' : ''} />
              <FormControl fullWidth>
                <InputLabel id="categoria-label">Categoria</InputLabel>
                <Select labelId="categoria-label" name="categoria" value={form.categoria || ''} label="Categoria" onChange={handleChange} required>
                  <MenuItem value="Rede">Rede</MenuItem>
                  <MenuItem value="Software">Software</MenuItem>
                  <MenuItem value="Hardware">Hardware</MenuItem>
                  <MenuItem value="Acesso">Acesso</MenuItem>
                  <MenuItem value="Impressora">Impressora</MenuItem>
                  <MenuItem value="Outro">Outro</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="prioridade-label">Prioridade</InputLabel>
                <Select labelId="prioridade-label" name="prioridade" value={form.prioridade} label="Prioridade" onChange={handleChange}>
                  <MenuItem value="Baixa">Baixa</MenuItem>
                  <MenuItem value="Média">Média</MenuItem>
                  <MenuItem value="Alta">Alta</MenuItem>
                  <MenuItem value="Urgente">Urgente</MenuItem>
                </Select>
              </FormControl>
              <TextField name="descricao" label="Descreva o problema" value={form.descricao} onChange={handleChange} required multiline rows={3} fullWidth onPaste={handlePasteDescricao} error={!!form.descricao && !validarDescricao(form.descricao)} helperText={form.descricao && !validarDescricao(form.descricao) ? 'Mínimo 10 caracteres' : ''} />
              <Button variant="outlined" component="label" startIcon={<AttachFileIcon />} color="secondary">
                {form.anexos.length > 0 ? `${form.anexos.length} arquivo(s) selecionado(s)` : 'Anexar arquivos'}
                <input type="file" hidden multiple onChange={handleFile} />
              </Button>
              {form.anexos.length > 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {form.anexos.map((file, idx) => (
                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption">{file.name}</Typography>
                      <Button size="small" color="error" onClick={() => handleRemoveAnexo(idx)}>Remover</Button>
                    </Box>
                  ))}
                </Box>
              )}
              <Button type="submit" variant="contained" color="primary" size="large" disabled={loading || !validarTitulo(form.titulo) || !validarDescricao(form.descricao)}>{loading ? 'Enviando...' : 'Abrir chamado'}</Button>
            </Stack>
          </Box>
        )}
        <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({ ...toast, open: false })}>
          <Alert severity={toast.type} sx={{ width: '100%' }}>{toast.msg}</Alert>
        </Snackbar>
      </Paper>
      {!hideSugestoes && (
        <Box sx={{ width: 340, minWidth: 260, maxWidth: 400 }}>
          <Paper elevation={2} sx={{ p: 2, background: '#f8fafd', height: '100%' }}>
            <Typography variant="subtitle1" color="primary" gutterBottom>Sugestões de solução</Typography>
            {loadingSugestoes && <Typography variant="body2" color="text.secondary">Buscando sugestões...</Typography>}
            {!loadingSugestoes && sugestoes.length === 0 && (
              <Typography variant="body2" color="text.secondary">Nenhuma sugestão encontrada ainda.<br/>Digite o título, descrição ou selecione uma categoria para ver sugestões.</Typography>
            )}
            {!loadingSugestoes && sugestoes.map((s, idx) => {
              // Determinar qual solução exibir com prioridade para comentarioResolucao
              let solucaoParaExibir = null;
              if (s.comentarioResolucao && s.comentarioResolucao.trim() !== '') {
                solucaoParaExibir = s.comentarioResolucao;
              } else if (s.historico && s.historico.length > 0) {
                const ultimoComentario = s.historico[s.historico.length - 1];
                if (ultimoComentario && ultimoComentario.texto && ultimoComentario.texto.trim() !== '') {
                  solucaoParaExibir = ultimoComentario.texto;
                }
              }

              return (
                <Box key={s._id || idx} sx={{ mb: 2, p: 1.5, border: '1px solid #e3e8fd', borderRadius: 2, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <Typography variant="subtitle2" color="secondary" sx={{ fontWeight: 'bold' }}>{s.titulo}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1, maxHeight: 100, overflow: 'auto' }}>
                    {s.descricao.length > 150 ? s.descricao.substring(0, 147) + '...' : s.descricao}
                  </Typography>
                  
                  {solucaoParaExibir && (
                    <>
                      <Typography variant="caption" display="block" sx={{ fontWeight: 'medium', color: 'success.main', mb: 0.5 }}>
                        Solução aplicada:
                      </Typography>
                      <Box sx={{ fontSize: '0.8rem', color: '#333', background: '#f0f4f8', borderRadius: 1, p: 1, whiteSpace: 'pre-wrap' }}>
                        {solucaoParaExibir}
                      </Box>
                    </>
                  )}

                  {s.responsavel && (
                     <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1, fontSize: '0.75rem' }}>
                       Resolvido por: {typeof s.responsavel === 'object' ? s.responsavel.nome : s.responsavel}
                     </Typography>
                  )}
                </Box>
              );
            })}
          </Paper>
        </Box>
      )}
    </Box>
  );
}
