import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  CircularProgress, 
  Alert,
  Box,
  Button,
  Stack
} from '@mui/material';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import FileSaver from 'file-saver';
import logoUnic from './logo-unic.png'; // Importar o logo
// Supondo que você terá uma função em api.js para buscar esses dados
import { getRelatorioProblemasRecorrentes } from './services/api';

// Função para converter imagem para Data URL
const toDataURL = (url, callback) => {
  const xhr = new XMLHttpRequest();
  xhr.onload = function () {
    const reader = new FileReader();
    reader.onloadend = function () {
      callback(reader.result);
    };
    reader.readAsDataURL(xhr.response);
  };
  xhr.open('GET', url);
  xhr.responseType = 'blob';
  xhr.send();
};

function RelatorioProblemas() {
  const [dadosRelatorio, setDadosRelatorio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRelatorio();
  }, []);

  async function fetchRelatorio() {
    try {
      setLoading(true);
      setError('');
      const data = await getRelatorioProblemasRecorrentes();
      setDadosRelatorio(data);
    } catch (err) {
      setError(err.message || 'Erro ao buscar dados do relatório.');
      console.error("Erro ao buscar relatório de problemas:", err);
    } finally {
      setLoading(false);
    }
  }

  // Função para exportar PDF
  async function exportarPDF() {
    if (!dadosRelatorio.length) {
      alert('Nenhum dado para exportar!');
      return;
    }

    toDataURL(logoUnic, (logoDataURL) => {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;

      // Adicionar logo
      const imgWidth = 55;
      const imgHeight = 20;
      const logoX = (pageWidth - imgWidth) / 2;
      const logoY = margin;
      doc.addImage(logoDataURL, 'PNG', logoX, logoY, imgWidth, imgHeight);

      // Título do relatório
      doc.setFontSize(18);
      doc.setTextColor(40);
      const tituloY = logoY + imgHeight + 7;
      doc.text('Relatório de Problemas Recorrentes', pageWidth / 2, tituloY, { align: 'center' });      // Data de emissão
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin, margin + 5, { align: 'right' });

      // Resumo estatístico no PDF
      const resumoY = tituloY + 20;
      doc.setFontSize(12);
      doc.setTextColor(40);
      doc.text('Resumo Estatístico:', margin, resumoY);
      
      doc.setFontSize(10);
      doc.setTextColor(60);
      const totalCategorias = dadosRelatorio.length;
      const totalOcorrencias = dadosRelatorio.reduce((sum, item) => sum + item.totalOcorrencias, 0);
      const tempoMedioGeral = dadosRelatorio.length > 0 ? 
        (dadosRelatorio.reduce((sum, item) => sum + (item.avgTempoResolucaoHoras || 0), 0) / dadosRelatorio.length).toFixed(1) : '0';
      const problemaMaisRecorrente = dadosRelatorio.length > 0 ? dadosRelatorio[0].tipoProblema : 'N/A';
      
      doc.text(`• Total de categorias: ${totalCategorias}`, margin, resumoY + 12);
      doc.text(`• Total de ocorrências: ${totalOcorrencias}`, margin, resumoY + 18);
      doc.text(`• Tempo médio geral de resolução: ${tempoMedioGeral}h`, margin, resumoY + 24);
      doc.text(`• Problema mais recorrente: ${problemaMaisRecorrente}`, margin, resumoY + 30);

      // Calcular posição da tabela
      const alturaTituloEstimada = 10;
      const startYTable = resumoY + 45;// Calcular totais para percentuais
      const totalOcorrenciasGeral = dadosRelatorio.reduce((sum, item) => sum + item.totalOcorrencias, 0);

      autoTable(doc, {
        head: [[
          'Tipo de Problema (Categoria)', 'Total de Ocorrências', 'Tempo Médio (Horas)', 'Percentual (%)'
        ]],
        body: dadosRelatorio.map((item, index) => {
          const percentual = ((item.totalOcorrencias / totalOcorrenciasGeral) * 100).toFixed(1);
          return [
            (index === 0 ? '🏆 ' : '') + item.tipoProblema,
            item.totalOcorrencias.toString(),
            item.avgTempoResolucaoHoras ? item.avgTempoResolucaoHoras.toFixed(2) : 'N/A',
            percentual + '%'
          ];
        }),
        startY: startYTable,
        theme: 'striped',
        styles: { 
          fontSize: 8,
          cellPadding: 2,
          overflow: 'linebreak'
        },
        headStyles: { 
          fillColor: [26, 35, 126],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [240, 240, 240]
        },
        margin: { top: margin, right: margin, bottom: margin, left: margin },
        didDrawPage: function (data) {
          // Rodapé
          doc.setFontSize(8);
          doc.setTextColor(150);
          const pageCount = doc.internal.getNumberOfPages();
          doc.text('Página ' + data.pageNumber + ' de ' + pageCount, pageWidth / 2, pageHeight - 10, { align: 'center' });
        }
      });
      doc.save(`relatorio_problemas_recorrentes_${new Date().toISOString().slice(0,10)}.pdf`);
    });
  }
  // Função para exportar CSV
  function exportarCSV() {
    if (!dadosRelatorio.length) {
      alert('Nenhum dado para exportar!');
      return;
    }
    
    const totalOcorrenciasGeral = dadosRelatorio.reduce((sum, item) => sum + item.totalOcorrencias, 0);
    
    const ws = XLSX.utils.json_to_sheet(
      dadosRelatorio.map((item, index) => {
        const percentual = ((item.totalOcorrencias / totalOcorrenciasGeral) * 100).toFixed(1);
        return {
          'Ranking': index + 1,
          'Tipo de Problema': item.tipoProblema,
          'Total de Ocorrências': item.totalOcorrencias,
          'Tempo Médio de Resolução (Horas)': item.avgTempoResolucaoHoras ? item.avgTempoResolucaoHoras.toFixed(2) : 'N/A',
          'Percentual do Total (%)': percentual,
          'Status': index === 0 ? 'Mais Recorrente' : 'Recorrente'
        };
      })
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Problemas Recorrentes');
    const csv = XLSX.utils.sheet_to_csv(ws, { FS: ';', RS: '\r\n' });
    // Adiciona BOM UTF-8 para garantir acentuação correta no Excel
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    FileSaver.saveAs(blob, `relatorio_problemas_recorrentes_${new Date().toISOString().slice(0,10)}.csv`);
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
        <Button variant="outlined" onClick={fetchRelatorio} sx={{ mt: 2 }}>
          Tentar novamente
        </Button>
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      {/* Cabeçalho com título e botões de exportação */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="div">
          Relatório de Problemas Mais Recorrentes
        </Typography>
        
        <Stack direction="row" spacing={2}>
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={exportarPDF}
            disabled={!dadosRelatorio.length}
            size="small"
            sx={{ minWidth: 120 }}
          >
            Exportar PDF
          </Button>
          <Button 
            variant="outlined" 
            color="secondary" 
            onClick={exportarCSV}
            disabled={!dadosRelatorio.length}
            size="small"
            sx={{ minWidth: 120 }}
          >
            Exportar CSV
          </Button>
          <Button 
            variant="outlined" 
            onClick={fetchRelatorio}
            size="small"
            sx={{ minWidth: 120 }}
          >
            Atualizar
          </Button>
        </Stack>
      </Box>

      {/* Conteúdo do relatório */}
      {dadosRelatorio.length === 0 && !loading ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          Nenhum dado para exibir no relatório. Certifique-se de que existem chamados finalizados no sistema.
        </Alert>      ) : (
        <>
          {/* Resumo estatístico avançado */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom color="primary">
              📊 Resumo Estatístico
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
              <Paper sx={{ p: 2, flex: 1, textAlign: 'center', bgcolor: 'primary.light', color: 'white' }}>
                <Typography variant="h4" fontWeight="bold">
                  {dadosRelatorio.length}
                </Typography>
                <Typography variant="body2">
                  Categorias de Problemas
                </Typography>
              </Paper>
              
              <Paper sx={{ p: 2, flex: 1, textAlign: 'center', bgcolor: 'warning.light', color: 'white' }}>
                <Typography variant="h4" fontWeight="bold">
                  {dadosRelatorio.reduce((sum, item) => sum + item.totalOcorrencias, 0)}
                </Typography>
                <Typography variant="body2">
                  Total de Ocorrências
                </Typography>
              </Paper>
              
              <Paper sx={{ p: 2, flex: 1, textAlign: 'center', bgcolor: 'success.light', color: 'white' }}>
                <Typography variant="h4" fontWeight="bold">
                  {dadosRelatorio.length > 0 ? 
                    (dadosRelatorio.reduce((sum, item) => sum + (item.avgTempoResolucaoHoras || 0), 0) / dadosRelatorio.length).toFixed(1) 
                    : '0'
                  }h
                </Typography>
                <Typography variant="body2">
                  Tempo Médio Geral
                </Typography>
              </Paper>
              
              <Paper sx={{ p: 2, flex: 1, textAlign: 'center', bgcolor: 'error.light', color: 'white' }}>
                <Typography variant="h4" fontWeight="bold">
                  {dadosRelatorio.length > 0 ? dadosRelatorio[0].tipoProblema : 'N/A'}
                </Typography>
                <Typography variant="body2">
                  Problema Mais Recorrente
                </Typography>
              </Paper>
            </Stack>
          </Box>

          {/* Informações adicionais */}
          <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>📅 Última atualização:</strong> {new Date().toLocaleString('pt-BR')} | 
              <strong> 🎯 Foco:</strong> Problemas com maior número de ocorrências | 
              <strong> 📈 Ordenação:</strong> Por total de ocorrências (decrescente)
            </Typography>
          </Box>

          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="relatório de problemas recorrentes">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Tipo de Problema (Categoria)</strong></TableCell>
                  <TableCell align="right"><strong>Total de Ocorrências</strong></TableCell>
                  <TableCell align="right"><strong>Tempo Médio de Resolução (Horas)</strong></TableCell>
                  <TableCell align="right"><strong>Percentual do Total</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dadosRelatorio.map((row, index) => {
                  const totalOcorrencias = dadosRelatorio.reduce((sum, item) => sum + item.totalOcorrencias, 0);
                  const percentual = ((row.totalOcorrencias / totalOcorrencias) * 100).toFixed(1);
                  
                  return (
                    <TableRow
                      key={row.tipoProblema}
                      sx={{ 
                        '&:last-child td, &:last-child th': { border: 0 },
                        backgroundColor: index === 0 ? 'warning.light' : 'inherit' // Destaca o primeiro (mais recorrente)
                      }}
                    >
                      <TableCell component="th" scope="row">
                        {index === 0 && '🏆 '}{row.tipoProblema}
                      </TableCell>
                      <TableCell align="right">
                        <strong>{row.totalOcorrencias}</strong>
                      </TableCell>
                      <TableCell align="right">
                        {row.avgTempoResolucaoHoras ? row.avgTempoResolucaoHoras.toFixed(2) : 'N/A'}
                      </TableCell>
                      <TableCell align="right">
                        {percentual}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Paper>
  );
}

export default RelatorioProblemas;
