import React, { useEffect, useState } from 'react';
import { Box, Typography, TextField, Button, Paper, Grid, Switch, FormControlLabel, MenuItem, Divider, Snackbar, Alert, CircularProgress } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { getEmailConfig, saveEmailConfig, testEmailConfig, suggestEmailTemplate } from './services/api';

const tiposNotificacao = [
  { key: 'novoChamado', label: 'Abertura de Chamado' },
  { key: 'comentarioChamado', label: 'Comentário/Resposta' },
  { key: 'chamadoAtribuido', label: 'Atribuição/Reivindicação' },
  { key: 'chamadoFinalizado', label: 'Finalização' },
];

export default function PainelEmailConfig() {
  const [config, setConfig] = useState({
    emailEnabled: false,
    emailService: 'gmail',
    emailUser: '',
    emailPassword: '',
    emailFrom: '',
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    templates: {
      novoChamado: { assunto: '', html: '', texto: '' },
      comentarioChamado: { assunto: '', html: '', texto: '' },
      chamadoAtribuido: { assunto: '', html: '', texto: '' },
      chamadoFinalizado: { assunto: '', html: '', texto: '' },
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [testando, setTestando] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [iaLoading, setIaLoading] = useState({});
  const [erro, setErro] = useState('');

  useEffect(() => {
    getEmailConfig().then(cfg => {
      if (cfg) setConfig(cfg);
      setLoading(false);
    }).catch(e => {
      setErro(e.message?.includes('403') || e.message?.includes('401')
        ? 'Acesso restrito: apenas administradores podem acessar esta configuração.'
        : 'Erro ao buscar configuração de e-mail.');
      setLoading(false);
    });
  }, []);

  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleTemplateChange = (tipo, campo, value) => {
    setConfig(prev => ({
      ...prev,
      templates: {
        ...prev.templates,
        [tipo]: { ...prev.templates[tipo], [campo]: value }
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveEmailConfig(config);
      setSnackbar({ open: true, message: 'Configurações salvas com sucesso!', severity: 'success' });
    } catch (e) {
      setSnackbar({ open: true, message: 'Erro ao salvar: ' + e.message, severity: 'error' });
    }
    setSaving(false);
  };

  const handleTest = async () => {
    setTestando(true);
    try {
      await testEmailConfig({ ...config, destinatario: testEmail });
      setSnackbar({ open: true, message: 'E-mail de teste enviado!', severity: 'success' });
    } catch (e) {
      setSnackbar({ open: true, message: 'Erro ao enviar teste: ' + e.message, severity: 'error' });
    }
    setTestando(false);
  };

  const handleIASuggest = async (tipo) => {
    setIaLoading(prev => ({ ...prev, [tipo]: true }));
    try {
      const sugestao = await suggestEmailTemplate(tipo);
      if (sugestao) {
        setConfig(prev => ({
          ...prev,
          templates: {
            ...prev.templates,
            [tipo]: { ...prev.templates[tipo], ...sugestao }
          }
        }));
      }
    } catch (e) {
      setSnackbar({ open: true, message: 'Erro ao sugerir template: ' + e.message, severity: 'error' });
    }
    setIaLoading(prev => ({ ...prev, [tipo]: false }));
  };

  if (loading) return <Box p={4} textAlign="center"><CircularProgress /></Box>;
  if (erro) return <Box p={4} textAlign="center"><Alert severity="error">{erro}</Alert></Box>;

  return (
    <Box maxWidth={900} mx="auto" my={4}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom><EmailIcon sx={{ mr: 1 }} />Configuração de E-mail do DeskHelp</Typography>
        <Divider sx={{ my: 2 }} />
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={<Switch checked={config.emailEnabled} onChange={e => handleChange('emailEnabled', e.target.checked)} />}
              label="Ativar envio de e-mails"
            />
            <TextField fullWidth label="Remetente (From)" value={config.emailFrom} onChange={e => handleChange('emailFrom', e.target.value)} sx={{ my: 1 }} />
            <TextField select fullWidth label="Serviço de E-mail" value={config.emailService} onChange={e => handleChange('emailService', e.target.value)} sx={{ my: 1 }}>
              <MenuItem value="gmail">Gmail</MenuItem>
              <MenuItem value="outlook">Outlook/Microsoft</MenuItem>
              <MenuItem value="smtp">SMTP Customizado</MenuItem>
            </TextField>
            <TextField fullWidth label="Usuário" value={config.emailUser} onChange={e => handleChange('emailUser', e.target.value)} sx={{ my: 1 }} />
            <TextField fullWidth label="Senha" type="password" value={config.emailPassword} onChange={e => handleChange('emailPassword', e.target.value)} sx={{ my: 1 }} />
            {config.emailService === 'smtp' && (
              <>
                <TextField fullWidth label="Host SMTP" value={config.smtpHost} onChange={e => handleChange('smtpHost', e.target.value)} sx={{ my: 1 }} />
                <TextField fullWidth label="Porta SMTP" type="number" value={config.smtpPort} onChange={e => handleChange('smtpPort', e.target.value)} sx={{ my: 1 }} />
                <FormControlLabel
                  control={<Switch checked={!!config.smtpSecure} onChange={e => handleChange('smtpSecure', e.target.checked)} />}
                  label="Conexão segura (SSL/TLS)"
                />
              </>
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>Teste de envio</Typography>
            <TextField fullWidth label="E-mail para teste" value={testEmail} onChange={e => setTestEmail(e.target.value)} sx={{ my: 1 }} />
            <Button variant="contained" onClick={handleTest} disabled={testando || !testEmail} startIcon={<EmailIcon />} sx={{ mb: 2 }}>
              {testando ? 'Enviando...' : 'Enviar E-mail de Teste'}
            </Button>
          </Grid>
        </Grid>
        <Divider sx={{ my: 3 }} />
        <Typography variant="h6" gutterBottom>Templates de Notificação</Typography>
        {tiposNotificacao.map(tipo => (
          <Paper key={tipo.key} sx={{ p: 2, my: 2, background: '#f8fafc' }}>
            <Typography variant="subtitle1">{tipo.label}</Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Assunto" value={config.templates[tipo.key]?.assunto || ''} onChange={e => handleTemplateChange(tipo.key, 'assunto', e.target.value)} sx={{ my: 1 }} />
              </Grid>
              <Grid item xs={12} md={8}>
                <Button onClick={() => handleIASuggest(tipo.key)} startIcon={<SmartToyIcon />} disabled={iaLoading[tipo.key]} sx={{ float: 'right', mb: 1 }}>
                  {iaLoading[tipo.key] ? 'Gerando com IA...' : 'Sugerir com IA'}
                </Button>
                <TextField fullWidth label="Corpo do E-mail (HTML)" multiline minRows={4} value={config.templates[tipo.key]?.html || ''} onChange={e => handleTemplateChange(tipo.key, 'html', e.target.value)} sx={{ my: 1 }} />
                <TextField fullWidth label="Corpo do E-mail (Texto simples)" multiline minRows={2} value={config.templates[tipo.key]?.texto || ''} onChange={e => handleTemplateChange(tipo.key, 'texto', e.target.value)} sx={{ my: 1 }} />
              </Grid>
            </Grid>
          </Paper>
        ))}
        <Box textAlign="right" mt={2}>
          <Button variant="contained" color="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </Box>
      </Paper>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
