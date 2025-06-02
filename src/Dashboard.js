import React from 'react';
import { Paper, Typography, Grid, Box, Button, TextField, MenuItem, Stack } from '@mui/material';
import { Pie, Bar } from 'react-chartjs-2';
import { Chart, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import FileSaver from 'file-saver';
import PainelTI from './PainelTI';
import { useState } from 'react';
import NovoChamado from './NovoChamado';
import logoUnic from './logo-unic.png'; // Importar o logo

Chart.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

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

export default function Dashboard({ chamados, usuariosTI = [], onAtribuir, onStatus, onReivindicar, onTransferir, onExcluir, usuarios, onAbrirChamado, onExcluirChamado, todosDepartamentos = [], colaborador }) {
  const [filtros, setFiltros] = React.useState({
    status: '',
    prioridade: '',
    setor: '', // Mantido para compatibilidade, mas usaremos a lista de departamentos
    responsavel: '',
  });
  const [pagina, setPagina] = React.useState(1);
  const [chamadosPorPagina, setChamadosPorPagina] = React.useState(10);
  const [dataInicio, setDataInicio] = React.useState('');
  const [dataFim, setDataFim] = React.useState('');
  const [busca, setBusca] = React.useState('');
  const [exibirNovoChamado, setExibirNovoChamado] = React.useState(false);

  // Função para buscar o nome do responsável pelo email
  const obterNomeResponsavel = (emailResponsavel) => {
    if (!emailResponsavel) return '-';
    // Prioriza a lista usuariosTI, depois a lista geral de usuarios
    const usuarioEncontrado = usuariosTI.find(u => u.email === emailResponsavel) || usuarios.find(u => u.email === emailResponsavel);
    return usuarioEncontrado?.nome || emailResponsavel; // Retorna nome ou email como fallback
  };

  // Filtro de responsável robusto (nome) - agora lista todos os TI/Admin
  const responsaveisParaFiltro = React.useMemo(() => {
    const set = new Set();
    (usuariosTI || []).forEach(u => set.add(u.nome));
    (usuarios || []).filter(u => u.isAdmin).forEach(u => set.add(u.nome));
    return Array.from(set).filter(Boolean).sort((a,b) => a.localeCompare(b));
  }, [usuariosTI, usuarios]);

  // Filtro de busca robusta
  function filtrarBusca(c) {
    const termo = busca.trim().toLowerCase();
    if (!termo) return true;
    return (
      (c.titulo && c.titulo.toLowerCase().includes(termo)) ||
      (c.descricao && c.descricao.toLowerCase().includes(termo)) ||
      (c.nome && c.nome.toLowerCase().includes(termo))
    );
  }
  // Filtro de data (range) - corrigido para não precisar +1 dia
  function filtrarData(c) {
    if (!dataInicio && !dataFim) return true;
    
    // Usa a data mais relevante do chamado, priorizando 'criadoEm' ou 'data'
    const dataOriginalChamado = c.criadoEm || c.data || c.updatedAt;
    if (!dataOriginalChamado) return false; // Se não houver data, não pode filtrar

    const dataChamado = new Date(dataOriginalChamado);
    if (isNaN(dataChamado.getTime())) return false; // Data inválida

    // Normaliza a data do chamado para o início do dia para consistência na comparação
    dataChamado.setHours(0, 0, 0, 0);

    let inicio = null;
    if (dataInicio) {
      inicio = new Date(dataInicio); // YYYY-MM-DD string from input
      if (isNaN(inicio.getTime())) return true; // Data de início inválida, não filtra
      inicio.setHours(0, 0, 0, 0); // Garante que é o início do dia
    }

    let fim = null;
    if (dataFim) {
      fim = new Date(dataFim); // YYYY-MM-DD string from input
      if (isNaN(fim.getTime())) return true; // Data de fim inválida, não filtra
      fim.setHours(23, 59, 59, 999); // Garante que é o fim do dia
    }
    
    if (inicio && fim) return dataChamado >= inicio && dataChamado <= fim;
    if (inicio) return dataChamado >= inicio;
    if (fim) return dataChamado <= fim;
    return true;
  }

  // NOVO: Função para filtrar departamento considerando todos os campos possíveis
  function filtrarDepartamento(c) {
    if (!filtros.setor) return true;
    return (
      c.setor === filtros.setor ||
      c.departamento === filtros.setor ||
      (c.usuario && c.usuario.departamento === filtros.setor)
    );
  }

  // NOVO: Função para filtrar responsável considerando nome exibido no filtro
  function filtrarResponsavel(c) {
    if (!filtros.responsavel) return true;
    const nomes = [];
    if (c.atribuido) nomes.push(obterNomeResponsavel(c.atribuido));
    if (c.responsavel) nomes.push(obterNomeResponsavel(c.responsavel));
    return nomes.includes(filtros.responsavel);
  }

  // Ordena chamados por data de abertura (mais recente no topo)
  const chamadosFiltrados = chamados
    .filter((c) => (
      (!filtros.status || c.status === filtros.status) &&
      (!filtros.prioridade || c.prioridade === filtros.prioridade) &&
      filtrarDepartamento(c) &&
      filtrarResponsavel(c) &&
      filtrarBusca(c) &&
      filtrarData(c)
    ))
    .sort((a, b) => {
      // Ordena corretamente por data de abertura (campo 'data' no formato DD/MM/AAAA ou ISO)
      function parseData(d) {
        if (!d) return 0;
        if (/\d{2}\/\d{2}\/\d{4}/.test(d)) {
          const [dia, mes, ano] = d.split('/');
          return new Date(`${ano}-${mes}-${dia}T00:00:00`).getTime();
        }
        return new Date(d).getTime();
      }
      return parseData(b.data || b.criadoEm || b.updatedAt) - parseData(a.data || a.criadoEm || a.updatedAt);
    });

  React.useEffect(() => { setPagina(1); }, [filtros]);
  const totalPaginas = Math.ceil(chamadosFiltrados.length / chamadosPorPagina) || 1;
  const chamadosPaginados = chamadosFiltrados.slice((pagina - 1) * chamadosPorPagina, pagina * chamadosPorPagina);

  // Opções padronizadas de status para o dashboard inicial (sem 'Finalizado')
  const statusOptions = [
    { value: '', label: 'Todos' },
    { value: 'Aberto', label: 'Aberto' },
    { value: 'Em atendimento', label: 'Em Atendimento' },
    { value: 'Aguardando resposta', label: 'Aguardando Resposta' },
    { value: 'Reaberto', label: 'Reaberto' }
  ];

  // Filtro de departamento robusto: usa todosDepartamentos se disponível, senão extrai dos chamados
  const departamentosParaFiltro = React.useMemo(() => {
    if (Array.isArray(todosDepartamentos) && todosDepartamentos.length > 0) {
      // Se vierem objetos, extrai nome
      return todosDepartamentos.map(d => (typeof d === 'object' && d.nome ? d.nome : d)).filter(Boolean).sort((a, b) => a.localeCompare(b));
    }
    // Fallback: extrai dos chamados
    const set = new Set();
    chamados.forEach(c => {
      if (c.setor) set.add(c.setor);
      if (c.departamento) set.add(c.departamento);
      if (c.usuario?.departamento) set.add(c.usuario.departamento);
    });
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [todosDepartamentos, chamados]);

  function formatarData(data) {
    if (!data) return '';
    // Se já estiver no formato DD/MM/AAAA
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
      return data;
    }
    // Tenta converter para Date e formatar DD/MM/AAAA
    const d = new Date(data);
    if (!isNaN(d.getTime())) {
      const dia = String(d.getDate()).padStart(2, '0');
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const ano = d.getFullYear();
      return `${dia}/${mes}/${ano}`;
    }
    return '';
  }

  async function exportarPDF() {
    if (!chamadosFiltrados.length) {
      alert('Nenhum chamado para exportar!');
      return;
    }

    toDataURL(logoUnic, (logoDataURL) => {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;

      // Adicionar logo
      const imgWidth = 55; // Largura da imagem no PDF (em pt) - Mantida
      const imgHeight = 20; // Altura da imagem no PDF (em pt) - Aumentada para 20pt
      const logoX = (pageWidth - imgWidth) / 2; // Centralizar horizontalmente
      const logoY = margin;
      doc.addImage(logoDataURL, 'PNG', logoX, logoY, imgWidth, imgHeight);

      // Título do relatório - abaixo do logo
      doc.setFontSize(18);
      doc.setTextColor(40);
      const tituloY = logoY + imgHeight + 7; // Posição Y abaixo do logo com um pequeno espaço
      doc.text('Relatório de Chamados', pageWidth / 2, tituloY, { align: 'center' });

      // Data de emissão
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin, margin + 5, { align: 'right' });

      // Calcular a altura aproximada do título para o startY da tabela
      const alturaTituloEstimada = 10; // Estimativa da altura do texto do título em pt
      const startYTable = tituloY + alturaTituloEstimada + 7; // Posição Y da tabela abaixo do título com espaço

      autoTable(doc, {
        head: [[
          'Data', 'Nome', 'Departamento', 'Título', 'Prioridade', 'Status', 'Responsável'
        ]],
        body: chamadosFiltrados.map(c => [
          formatarData(c.data || c.criadoEm || c.updatedAt || ''),
          c.nome || c.usuario?.nome || '-',
          c.setor || c.departamento || c.usuario?.departamento || '-',
          c.titulo || '',
          c.prioridade || '',
          c.status || '',
          obterNomeResponsavel(c.responsavel || c.atribuido)
        ]),
        startY: startYTable,
        theme: 'striped', // 'striped', 'grid', 'plain'
        styles: { 
          fontSize: 8,
          cellPadding: 2,
          overflow: 'linebreak'
        },
        headStyles: { 
          fillColor: [26, 35, 126], // Azul escuro para o cabeçalho
          textColor: 255, // Texto branco
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [240, 240, 240] // Cinza claro para linhas alternadas
        },
        margin: { top: margin, right: margin, bottom: margin, left: margin }, // Ajustar top margin se necessário, mas startY controla o início da tabela
        didDrawPage: function (data) {
          // Rodapé
          doc.setFontSize(8);
          doc.setTextColor(150);
          const pageCount = doc.internal.getNumberOfPages();
          doc.text('Página ' + data.pageNumber + ' de ' + pageCount, pageWidth / 2, pageHeight - 10, { align: 'center' });
        }
      });
      doc.save(`chamados_DeskHelp_${new Date().toISOString().slice(0,10)}.pdf`);
    });
  }

  function exportarCSV() {
    if (!chamadosFiltrados.length) {
      alert('Nenhum chamado para exportar!');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(
      chamadosFiltrados.map(c => ({
        Data: formatarData(c.data || c.criadoEm || c.updatedAt || ''),
        Nome: c.nome || c.usuario?.nome || '-',
        Departamento: c.setor || c.departamento || c.usuario?.departamento || '-',
        Título: c.titulo || '',
        Prioridade: c.prioridade || '',
        Status: c.status || '',
        Responsável: obterNomeResponsavel(c.responsavel || c.atribuido) // Modificado aqui
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Chamados');
    const csv = XLSX.utils.sheet_to_csv(ws, { FS: ';', RS: '\r\n' });
    // Adiciona BOM UTF-8 para garantir acentuação correta no Excel
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    FileSaver.saveAs(blob, `chamados_${new Date().toISOString().slice(0,10)}.csv`);
  }

  // Gráfico de chamados por status
  const statusCount = chamados.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});
  const prioridadeCount = chamados.reduce((acc, c) => {
    acc[c.prioridade] = (acc[c.prioridade] || 0) + 1;
    return acc;
  }, {});
  const depCount = chamados.reduce((acc, c) => {
    acc[c.setor] = (acc[c.setor] || 0) + 1;
    return acc;
  }, {});

  // Remove valores falsos/undefined e labels curtas dos departamentos
  const depLabels = Object.keys(depCount).filter(dep => dep && dep.trim().length > 2 && dep !== 'undefined');
  const depData = depLabels.map(dep => depCount[dep]);
  // Remove valores falsos/undefined das prioridades
  const prioridadeLabels = Object.keys(prioridadeCount).filter(p => p && p.trim() && p !== 'undefined');
  const prioridadeData = prioridadeLabels.map(p => prioridadeCount[p]);

  // Log dos chamados para debug
  React.useEffect(() => {
    console.log('DEBUG - chamados recebidos no Dashboard:', chamados);
    console.log('DEBUG - todosDepartamentos recebidos no Dashboard:', todosDepartamentos);
    console.log('DEBUG - usuariosTI recebidos no Dashboard:', usuariosTI); // Log para usuariosTI
  }, [chamados, todosDepartamentos, usuariosTI]);

  // Supondo que Dashboard recebe props: chamados, usuariosTI, colaborador (usuário logado)
  // Dentro do componente:
  const emailLogado = colaborador && colaborador.email ? colaborador.email : '';
  const chamadosAbertos = chamados.filter(c => (!c.atribuido && !c.responsavel) && c.status === 'Aberto');
  const chamadosEmAtendimento = emailLogado ? chamados.filter(c => (c.atribuido === emailLogado || c.responsavel === emailLogado) && c.status !== 'Finalizado') : [];

  // Handler para abrir o formulário de novo chamado
  function handleAbrirNovoChamado() {
    setExibirNovoChamado(true);
  }
  // Handler para fechar o formulário de novo chamado (após criar ou cancelar)
  function handleFecharNovoChamado() {
    setExibirNovoChamado(false);
  }

  // Foco automático no campo de busca do dashboard
  const buscaRef = React.useRef();
  React.useEffect(() => {
    if (buscaRef.current) buscaRef.current.focus();
  }, []);

  // Renderização condicional: se exibirNovoChamado, mostra o formulário
  if (exibirNovoChamado) {
    return (
      <NovoChamado
        colaborador={colaborador}
        onAdd={() => { handleFecharNovoChamado(); }}
        onAfterCreate={handleFecharNovoChamado}
        hideSugestoes={false}
        isAdmin={false}
      />
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3, background: '#fff', mb: 4 }}>
      <Typography variant="h5" mb={2} color="primary">Dashboard de Chamados</Typography>
      {/* Botão de abrir chamado só para usuário comum */}
      {!colaborador?.isAdmin && (
        <Box mb={2}>
          <Button variant="contained" color="primary" onClick={handleAbrirNovoChamado} aria-label="Abrir novo chamado">
            Abrir novo chamado
          </Button>
        </Box>
      )}      {/* Filtros com layout responsivo aprimorado */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2}>
          {/* Primeira linha: Campo de busca (largura total) */}
          <Grid item xs={12}>
            <TextField 
              label="Busca (Título, descrição, nome...)" 
              value={busca} 
              onChange={e => setBusca(e.target.value)} 
              size="small" 
              fullWidth
              inputRef={buscaRef} 
              inputProps={{ 'aria-label': 'Buscar chamados', 'aria-describedby': 'dica-busca-dashboard' }} 
            />
            <span id="dica-busca-dashboard" style={{ display: 'none' }}>Digite parte do título, descrição ou nome para filtrar chamados.</span>
          </Grid>
          
          {/* Segunda linha: Filtros principais */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField 
              select 
              label="Status" 
              name="status" 
              value={filtros.status} 
              onChange={e => setFiltros(f => ({ ...f, status: e.target.value }))} 
              size="small" 
              fullWidth
            >
              {statusOptions.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <TextField 
              select 
              label="Prioridade" 
              name="prioridade" 
              value={filtros.prioridade} 
              onChange={e => setFiltros(f => ({ ...f, prioridade: e.target.value }))} 
              size="small" 
              fullWidth
            >
              <MenuItem value="">Todas</MenuItem>
              <MenuItem value="Baixa">Baixa</MenuItem>
              <MenuItem value="Média">Média</MenuItem>
              <MenuItem value="Alta">Alta</MenuItem>
              <MenuItem value="Urgente">Urgente</MenuItem>
            </TextField>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <TextField 
              select 
              label="Departamento" 
              name="setor" 
              value={filtros.setor} 
              onChange={e => setFiltros(f => ({ ...f, setor: e.target.value }))} 
              size="small" 
              fullWidth
            >
              <MenuItem value="">Todos</MenuItem>
              {departamentosParaFiltro.map(dep => (
                <MenuItem key={dep} value={dep}>{dep}</MenuItem>
              ))}
            </TextField>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <TextField 
              select 
              label="Responsável" 
              name="responsavel" 
              value={filtros.responsavel || ''} 
              onChange={e => setFiltros(f => ({ ...f, responsavel: e.target.value }))} 
              size="small" 
              fullWidth
            >
              <MenuItem value="">Todos</MenuItem>
              {responsaveisParaFiltro.map(r => (
                <MenuItem key={r} value={r}>{r}</MenuItem>
              ))}
            </TextField>
          </Grid>
          
          {/* Terceira linha: Filtros de data */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField 
              type="date" 
              label="Data inicial" 
              InputLabelProps={{ shrink: true }} 
              value={dataInicio} 
              onChange={e => setDataInicio(e.target.value)} 
              size="small" 
              fullWidth
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <TextField 
              type="date" 
              label="Data final" 
              InputLabelProps={{ shrink: true }} 
              value={dataFim} 
              onChange={e => setDataFim(e.target.value)} 
              size="small" 
              fullWidth
            />
          </Grid>
          
          {/* Quarta linha: Botões de ação */}
          <Grid item xs={12} md={6}>
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={1} 
              sx={{ height: '100%', justifyContent: { md: 'flex-end' } }}
            >
              <Button 
                variant="outlined" 
                color="warning" 
                onClick={() => {
                  setFiltros({ status: '', prioridade: '', setor: '', responsavel: '' });
                  setDataInicio('');
                  setDataFim('');
                  setBusca('');
                }} 
                aria-label="Limpar filtros"
                size="small"
                sx={{ minWidth: 120 }}
              >
                Limpar filtros
              </Button>
              
              <Button 
                variant="outlined" 
                color="primary" 
                onClick={exportarPDF} 
                aria-label="Exportar chamados em PDF"
                size="small"
                sx={{ minWidth: 120 }}
              >
                Exportar PDF
              </Button>
              
              <Button 
                variant="outlined" 
                color="secondary" 
                onClick={exportarCSV} 
                aria-label="Exportar chamados em CSV"
                size="small"
                sx={{ minWidth: 120 }}
              >
                Exportar CSV
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Typography align="center">Por Status</Typography>
          <Box sx={{ height: 250, maxHeight: 250 }}>
            <Pie data={{
              labels: Object.keys(statusCount),
              datasets: [{
                data: Object.values(statusCount),
                backgroundColor: ['#1976d2', '#ff9800', '#43a047', '#e53935'],
              }]
            }} options={{ plugins: { legend: { labels: { boxWidth: 20, font: { size: 14 } }, title: { display: true, text: 'Status dos chamados', color: '#333' } } }, responsive: true, maintainAspectRatio: false }} aria-label="Gráfico de chamados por status" />
          </Box>
        </Grid>
        <Grid item xs={12} md={4}>
          <Typography align="center">Por Prioridade</Typography>
          <Box sx={{ height: 250, maxHeight: 250 }}>
            <Bar data={{
              labels: prioridadeLabels,
              datasets: [{
                label: 'Chamados',
                data: prioridadeData,
                backgroundColor: ['#00eaff', '#1976d2', '#ff9800', '#e53935'],
              }]
            }} options={{ plugins: { legend: { display: false }, title: { display: true, text: 'Prioridade dos chamados', color: '#333' } }, responsive: true, maintainAspectRatio: false }} aria-label="Gráfico de chamados por prioridade" />
          </Box>
        </Grid>
        <Grid item xs={12} md={4}>
          <Typography align="center">Por Departamento</Typography>
          <Box sx={{ height: 250, maxHeight: 250 }}>
            <Bar data={{
              labels: depLabels,
              datasets: [{
                label: 'Chamados',
                data: depData,
                backgroundColor: '#1976d2',
              }]
            }} options={{ plugins: { legend: { display: false }, title: { display: true, text: 'Chamados por departamento', color: '#333' } }, responsive: true, maintainAspectRatio: false }} aria-label="Gráfico de chamados por departamento" />
          </Box>
        </Grid>
      </Grid>      {/* Fila de chamados funcional abaixo dos gráficos */}
      <Box mt={5}>
        <Typography variant="h6" mb={2} color="primary">Fila de Chamados</Typography>        <PainelTI
          chamados={chamadosFiltrados}
          usuariosTI={usuariosTI}
          onReivindicar={onReivindicar}
          onAtribuir={onAtribuir}
          onStatus={onStatus}
          onTransferir={onTransferir}
          onExcluir={onExcluir || onExcluirChamado}
          usuarios={usuarios}
          onAbrirChamado={onAbrirChamado}
          abaEmAndamentoLabel="Em atendimento"
          colaborador={colaborador}
          exibirFiltros={false} // Admin não vê filtros duplicados
          modoAbas={true}
        />
      </Box>
    </Paper>
  );
}
// Incrementos: acessibilidade nos gráficos e botões, dica oculta para busca, aria-labels em botões de exportação e limpar filtros, opções de acessibilidade nos gráficos.
