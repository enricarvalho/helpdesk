import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Rating,
  Stack,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip
} from '@mui/material';
import {
  Psychology as AIIcon,
  LightbulbOutlined as SuggestionIcon,
  TrendingUp as AnalysisIcon,
  History as HistoryIcon,
  AccessTime as TimeIcon,
  PriorityHigh as PriorityIcon,
  Feedback as FeedbackIcon,
  ExpandMore as ExpandMoreIcon,
  SmartToy as BotIcon,
  Insights as InsightsIcon
} from '@mui/icons-material';
import { getChamadoAIAnalysis, sendAIFeedback } from './services/api';

function AIAssistant({ chamadoId, isOpen, onClose }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackData, setFeedbackData] = useState({
    suggestionUsed: '',
    helpful: 0,
    feedback: ''
  });

  // Buscar análise quando o modal abrir
  useEffect(() => {
    if (isOpen && chamadoId) {
      fetchAIAnalysis();
    }
  }, [isOpen, chamadoId]);

  const fetchAIAnalysis = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await getChamadoAIAnalysis(chamadoId);
      setAnalysis(result.analysis);
    } catch (err) {
      setError(err.message || 'Erro ao obter análise de IA');
      console.error('Erro na análise de IA:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async () => {
    try {
      await sendAIFeedback(chamadoId, feedbackData);
      setFeedbackOpen(false);
      setFeedbackData({ suggestionUsed: '', helpful: 0, feedback: '' });
      // Mostrar sucesso
    } catch (err) {
      console.error('Erro ao enviar feedback:', err);
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'success';
    if (confidence >= 60) return 'warning';
    return 'error';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Urgente': return 'error';
      case 'Alta': return 'warning';
      case 'Média': return 'info';
      case 'Baixa': return 'success';
      default: return 'default';
    }
  };

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BotIcon color="primary" />
          Assistente de IA - Análise do Chamado
        </DialogTitle>
        
        <DialogContent>
          {loading && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
              <CircularProgress sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                🤖 Analisando padrões e gerando sugestões...
              </Typography>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
              <Button size="small" onClick={fetchAIAnalysis} sx={{ ml: 1 }}>
                Tentar novamente
              </Button>
            </Alert>
          )}

          {analysis && !loading && (
            <Stack spacing={3}>
              {/* Resumo da análise */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AnalysisIcon color="primary" />
                    Análise Geral
                  </Typography>
                  
                  <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                    <Chip 
                      label={`Categoria: ${analysis.analysis.detectedCategory}`}
                      color="primary"
                      variant="outlined"
                    />
                    <Chip 
                      label={`Prioridade: ${analysis.analysis.suggestedPriority}`}
                      color={getPriorityColor(analysis.analysis.suggestedPriority)}
                      variant="outlined"
                    />
                    <Chip 
                      label={`Tempo estimado: ${analysis.analysis.estimatedResolutionTime}`}
                      icon={<TimeIcon />}
                      variant="outlined"
                    />
                  </Stack>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Confiança da análise:
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <LinearProgress 
                        variant="determinate" 
                        value={analysis.analysis.confidence}
                        color={getConfidenceColor(analysis.analysis.confidence)}
                        sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                      />
                      <Typography variant="body2" fontWeight="bold">
                        {analysis.analysis.confidence.toFixed(1)}%
                      </Typography>
                    </Stack>
                  </Box>
                </CardContent>
              </Card>

              {/* Sugestões de resolução */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SuggestionIcon color="warning" />
                    Sugestões de Resolução
                  </Typography>
                  
                  <List dense>
                    {analysis.suggestions.map((suggestion, index) => (
                      <ListItem key={index} sx={{ pl: 0 }}>
                        <ListItemIcon>
                          <Chip 
                            label={index + 1} 
                            size="small" 
                            color="primary"
                            sx={{ minWidth: 32, height: 24 }}
                          />
                        </ListItemIcon>
                        <ListItemText 
                          primary={suggestion}
                          sx={{ '& .MuiListItemText-primary': { fontSize: '0.95rem' } }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>

              {/* Casos similares */}
              {analysis.similarCases && analysis.similarCases.length > 0 && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <HistoryIcon color="info" />
                      Casos Similares Resolvidos ({analysis.similarCases.length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={2}>
                      {analysis.similarCases.map((caso, index) => (
                        <Card key={index} variant="outlined" sx={{ bgcolor: 'grey.50' }}>
                          <CardContent sx={{ pb: '16px !important' }}>
                            <Typography variant="subtitle2" gutterBottom>
                              {caso.titulo}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              <strong>Resolução:</strong> {caso.resolucao}
                            </Typography>
                            <Stack direction="row" spacing={1}>
                              <Chip 
                                label={`${(caso.similarity * 100).toFixed(1)}% similar`}
                                size="small"
                                color="info"
                                variant="outlined"
                              />
                              {caso.tempoResolucao && (
                                <Chip 
                                  label={`Resolvido em ${caso.tempoResolucao}`}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </Stack>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Insights do usuário */}
              {analysis.userInsights && Object.keys(analysis.userInsights).length > 0 && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <InsightsIcon color="success" />
                      Histórico do Usuário
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={1}>
                      <Typography variant="body2">
                        <strong>Total de chamados:</strong> {analysis.userInsights.totalChamados}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Taxa de resolução:</strong> {analysis.userInsights.taxaResolucao}%
                      </Typography>
                      <Typography variant="body2">
                        <strong>Tempo médio de resolução:</strong> {analysis.userInsights.tempoMedioResolucao}
                      </Typography>
                      {analysis.userInsights.categoriasMaisComuns && (
                        <Typography variant="body2">
                          <strong>Categorias mais comuns:</strong> {analysis.userInsights.categoriasMaisComuns.join(', ')}
                        </Typography>
                      )}
                      {analysis.userInsights.usuarioRecorrente && (
                        <Alert severity="info" sx={{ mt: 1 }}>
                          👤 Usuário recorrente - considere oferecer treinamento específico
                        </Alert>
                      )}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              )}
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          <Button 
            startIcon={<FeedbackIcon />}
            onClick={() => setFeedbackOpen(true)}
            disabled={!analysis}
          >
            Dar Feedback
          </Button>
          <Button onClick={onClose}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de feedback */}
      <Dialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Feedback sobre as Sugestões de IA</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Sugestão utilizada (opcional)"
              multiline
              rows={2}
              value={feedbackData.suggestionUsed}
              onChange={(e) => setFeedbackData({...feedbackData, suggestionUsed: e.target.value})}
              placeholder="Qual sugestão foi mais útil?"
            />
            
            <Box>
              <Typography component="legend" gutterBottom>
                Quão úteis foram as sugestões?
              </Typography>
              <Rating
                value={feedbackData.helpful}
                onChange={(e, newValue) => setFeedbackData({...feedbackData, helpful: newValue})}
                size="large"
              />
            </Box>

            <TextField
              label="Comentários adicionais (opcional)"
              multiline
              rows={3}
              value={feedbackData.feedback}
              onChange={(e) => setFeedbackData({...feedbackData, feedback: e.target.value})}
              placeholder="Como podemos melhorar as sugestões?"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackOpen(false)}>Cancelar</Button>
          <Button onClick={handleFeedback} variant="contained">
            Enviar Feedback
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default AIAssistant;
