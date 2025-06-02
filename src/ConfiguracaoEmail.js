import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  Alert,
  Snackbar,
  Tab,
  Tabs,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Email as EmailIcon,
  Settings as SettingsIcon,
  Article as TemplateIcon,
  Science as TestIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Send as SendIcon
} from '@mui/icons-material';

export default function ConfiguracaoEmail() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', type: 'success' });
  const [testDialog, setTestDialog] = useState(false);
  const [emailTeste, setEmailTeste] = useState('');
  const [templateVariables, setTemplateVariables] = useState({});
    const [config, setConfig] = useState({
    emailEnabled: true,
    emailService: 'gmail',
    emailUser: '',
    emailPassword: '',
    emailFrom: 'DeskHelp <noreply@deskhelp.com>',
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    templates: {
      novoChamado: { assunto: '', corpo: '' },
      comentario: { assunto: '', corpo: '' },
      atribuicao: { assunto: '', corpo: '' },
      finalizacao: { assunto: '', corpo: '' }
    }
  });

  useEffect(() => {
    carregarConfiguracoes();
    carregarVariaveisTemplate();
  }, []);  const carregarConfiguracoes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/email-config', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📧 Dados carregados da API:', data);
        console.log('📧 Templates recebidos:', data.templates);
        
        // Garantir que todos os templates tenham a estrutura correta
        const templatesCompletos = {
          novoChamado: data.templates?.novoChamado || { assunto: '', corpo: '' },
          comentario: data.templates?.comentario || { assunto: '', corpo: '' },
          atribuicao: data.templates?.atribuicao || { assunto: '', corpo: '' },
          finalizacao: data.templates?.finalizacao || { assunto: '', corpo: '' }
        };
        
        setConfig({
          ...data,
          templates: templatesCompletos
        });
        
        console.log('📧 Templates após processamento:', templatesCompletos);
      } else {
        throw new Error('Erro ao carregar configurações');
      }
    } catch (error) {
      console.error('Erro:', error);
      setToast({ open: true, message: 'Erro ao carregar configurações', type: 'error' });
    } finally {
      setLoading(false);
    }
  };
  const carregarVariaveisTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/email-config/template-variables', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTemplateVariables(data);
      }
    } catch (error) {
      console.error('Erro ao carregar variáveis:', error);
    }
  };  const salvarConfiguracoes = async () => {
    setSaving(true);
    try {
      console.log('📧 Iniciando salvamento de configurações...');
      
      // Prepara os dados para envio - APENAS campos assunto e corpo
      const configParaSalvar = {
        emailEnabled: config.emailEnabled,
        emailService: config.emailService,
        emailUser: config.emailUser,
        emailPassword: config.emailPassword,
        emailFrom: config.emailFrom,
        smtpHost: config.smtpHost,
        smtpPort: config.smtpPort,
        smtpSecure: config.smtpSecure,
        templates: {
          novoChamado: {
            assunto: config.templates?.novoChamado?.assunto || '',
            corpo: config.templates?.novoChamado?.corpo || ''
          },
          comentario: {
            assunto: config.templates?.comentario?.assunto || '',
            corpo: config.templates?.comentario?.corpo || ''
          },
          atribuicao: {
            assunto: config.templates?.atribuicao?.assunto || '',
            corpo: config.templates?.atribuicao?.corpo || ''
          },
          finalizacao: {
            assunto: config.templates?.finalizacao?.assunto || '',
            corpo: config.templates?.finalizacao?.corpo || ''
          }
        }
      };
      
      console.log('📧 Dados a serem enviados:', JSON.stringify(configParaSalvar, null, 2));
      
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/email-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(configParaSalvar)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Configurações salvas com sucesso:', result);
        setToast({ open: true, message: 'Configurações salvas com sucesso!', type: 'success' });
        
        // Recarrega as configurações para garantir sincronização
        await carregarConfiguracoes();
      } else {
        const errorData = await response.json();
        console.error('❌ Erro ao salvar:', errorData);
        throw new Error(errorData.error || 'Erro ao salvar configurações');
      }
    } catch (error) {
      console.error('❌ Erro:', error);
      setToast({ open: true, message: `Erro ao salvar configurações: ${error.message}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const testarEmail = async () => {
    if (!emailTeste) {
      setToast({ open: true, message: 'Digite um email para teste', type: 'error' });
      return;
    }

    setTesting(true);    try {
      const token = localStorage.getItem('token');      const response = await fetch('http://localhost:5000/api/email-config/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ destinatario: emailTeste })
      });      const data = await response.json();
      
      if (response.ok && data.ok) {
        setToast({ open: true, message: 'Email de teste enviado com sucesso!', type: 'success' });
        setTestDialog(false);
        setEmailTeste('');
      } else {
        setToast({ open: true, message: `Erro no teste: ${data.error || data.detalhe || 'Erro desconhecido'}`, type: 'error' });
      }
    } catch (error) {
      console.error('Erro:', error);
      setToast({ open: true, message: 'Erro ao testar email', type: 'error' });
    } finally {
      setTesting(false);
    }
  };

  const resetarTemplates = async () => {    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/email-config/reset-templates', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(prev => ({ ...prev, templates: data.templates }));
        setToast({ open: true, message: 'Templates resetados para o padrão', type: 'success' });
      }
    } catch (error) {
      console.error('Erro:', error);
      setToast({ open: true, message: 'Erro ao resetar templates', type: 'error' });
    }
  };

  const handleConfigChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleTemplateChange = (tipo, campo, valor) => {
    setConfig(prev => ({
      ...prev,
      templates: {
        ...prev.templates,
        [tipo]: {
          ...prev.templates[tipo],
          [campo]: valor
        }
      }
    }));
  };

  // Recarrega configurações sempre que a aba 'Templates' for selecionada
  useEffect(() => {
    if (tabValue === 1) {
      carregarConfiguracoes();
    }
    // Não altera nada para as outras abas
    // eslint-disable-next-line
  }, [tabValue]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: '1200px', margin: '0 auto', p: 3 }}>
      <Paper elevation={3} sx={{ mb: 3 }}>
        <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <EmailIcon color="primary" />
            <Typography variant="h4">Configuração de Email</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Configure as credenciais e templates para notificações por email
          </Typography>
        </Box>

        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab icon={<SettingsIcon />} label="Configurações" />
          <Tab icon={<TemplateIcon />} label="Templates" />
          <Tab icon={<TestIcon />} label="Teste" />
        </Tabs>
      </Paper>

      {/* Tab 1: Configurações */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Configurações Básicas
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.emailEnabled}
                      onChange={(e) => handleConfigChange('emailEnabled', e.target.checked)}
                    />
                  }
                  label="Notificações por email ativadas"
                  sx={{ mb: 2 }}
                />

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Provedor de Email</InputLabel>
                  <Select
                    value={config.emailService}
                    onChange={(e) => handleConfigChange('emailService', e.target.value)}
                  >
                    <MenuItem value="gmail">Gmail</MenuItem>
                    <MenuItem value="smtp">SMTP Personalizado</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Email do remetente"
                  value={config.emailUser}
                  onChange={(e) => handleConfigChange('emailUser', e.target.value)}
                  sx={{ mb: 2 }}
                  helperText="Para Gmail, use seu email completo"
                />

                <TextField
                  fullWidth
                  label="Senha ou App Password"
                  type="password"
                  value={config.emailPassword}
                  onChange={(e) => handleConfigChange('emailPassword', e.target.value)}
                  sx={{ mb: 2 }}
                  helperText="Para Gmail, use uma senha de app específica"
                />

                <TextField
                  fullWidth
                  label="Nome e email exibido"
                  value={config.emailFrom}
                  onChange={(e) => handleConfigChange('emailFrom', e.target.value)}
                  helperText="Ex: DeskHelp <noreply@empresa.com>"
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Configurações SMTP Avançadas
                </Typography>
                
                {config.emailService === 'smtp' && (
                  <>
                    <TextField
                      fullWidth
                      label="Servidor SMTP"
                      value={config.smtpHost}
                      onChange={(e) => handleConfigChange('smtpHost', e.target.value)}
                      sx={{ mb: 2 }}
                      placeholder="smtp.seuservidor.com"
                    />

                    <TextField
                      fullWidth
                      label="Porta SMTP"
                      type="number"
                      value={config.smtpPort}
                      onChange={(e) => handleConfigChange('smtpPort', parseInt(e.target.value))}
                      sx={{ mb: 2 }}
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.smtpSecure}
                          onChange={(e) => handleConfigChange('smtpSecure', e.target.checked)}
                        />
                      }
                      label="Conexão segura (SSL/TLS)"
                    />
                  </>
                )}

                {config.emailService === 'gmail' && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="subtitle2">Como configurar Gmail:</Typography>
                    <Typography variant="body2">
                      1. Ative a verificação em 2 etapas<br/>
                      2. Gere uma senha de app específica<br/>
                      3. Use a senha de app no campo senha
                    </Typography>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                onClick={salvarConfiguracoes}
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<TestIcon />}
                onClick={() => setTestDialog(true)}
                disabled={!config.emailEnabled}
              >
                Testar Email
              </Button>
            </Box>
          </Grid>
        </Grid>
      )}

      {/* Tab 2: Templates */}
      {tabValue === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              <TemplateIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Templates de Email
            </Typography>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={resetarTemplates}
              size="small"
            >
              Resetar para Padrão
            </Button>
          </Box>          {Object.entries(config.templates || {}).map(([tipo, template]) => (
            <Accordion key={tipo} sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                  {tipo.replace(/([A-Z])/g, ' $1').trim()}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={8}>
                    <TextField
                      fullWidth
                      label="Assunto do Email"
                      value={template?.assunto || ''}
                      onChange={(e) => handleTemplateChange(tipo, 'assunto', e.target.value)}
                      sx={{ mb: 2 }}
                    />
                    
                    <TextField
                      fullWidth
                      label="Corpo do Email (HTML)"
                      multiline
                      rows={12}
                      value={template?.corpo || ''}
                      onChange={(e) => handleTemplateChange(tipo, 'corpo', e.target.value)}
                      sx={{ fontFamily: 'monospace' }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" gutterBottom>
                      <InfoIcon sx={{ fontSize: 16, mr: 1 }} />
                      Variáveis Disponíveis:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {templateVariables[tipo]?.map((variable) => (
                        <Chip
                          key={variable}
                          label={variable}
                          size="small"
                          variant="outlined"
                          onClick={() => navigator.clipboard.writeText(variable)}
                          sx={{ cursor: 'pointer' }}
                        />
                      ))}
                    </Box>
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      Clique para copiar a variável
                    </Typography>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))}

          <Box sx={{ mt: 3 }}>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              onClick={salvarConfiguracoes}
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Salvar Templates'}
            </Button>
          </Box>
        </Box>
      )}

      {/* Tab 3: Teste */}
      {tabValue === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <TestIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Testar Configurações de Email
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Envie um email de teste para verificar se suas configurações estão funcionando
            </Typography>

            <TextField
              fullWidth
              label="Email para teste"
              type="email"
              value={emailTeste}
              onChange={(e) => setEmailTeste(e.target.value)}
              sx={{ mb: 3 }}
              placeholder="seu-email@exemplo.com"
            />

            <Button
              variant="contained"
              startIcon={testing ? <CircularProgress size={20} /> : <SendIcon />}
              onClick={testarEmail}
              disabled={testing || !emailTeste || !config.emailEnabled}
            >
              {testing ? 'Enviando...' : 'Enviar Email de Teste'}
            </Button>

            {!config.emailEnabled && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Ative as notificações por email na aba "Configurações" para poder testar.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog de teste */}
      <Dialog open={testDialog} onClose={() => setTestDialog(false)}>
        <DialogTitle>Testar Email</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Email para teste"
            type="email"
            value={emailTeste}
            onChange={(e) => setEmailTeste(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialog(false)}>Cancelar</Button>
          <Button
            onClick={testarEmail}
            variant="contained"
            disabled={testing || !emailTeste}
          >
            {testing ? 'Enviando...' : 'Enviar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast({ ...toast, open: false })}
      >
        <Alert severity={toast.type} onClose={() => setToast({ ...toast, open: false })}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
