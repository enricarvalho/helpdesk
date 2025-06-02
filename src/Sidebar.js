import React from 'react';
import { Drawer, List, ListItem, Button, Divider, Box, useMediaQuery } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import ListAltIcon from '@mui/icons-material/ListAlt';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import HistoryIcon from '@mui/icons-material/History';
import AssessmentIcon from '@mui/icons-material/Assessment'; // Novo ícone para relatórios
import EmailIcon from '@mui/icons-material/Email';
import logoUnic from './logo-unic.png';

export default function Sidebar({ onMenuClick, selected, colaborador, isAdmin }) {
  const admin = typeof isAdmin === 'boolean' ? isAdmin : (colaborador && colaborador.isAdmin);
  const isMobile = useMediaQuery('(max-width:600px)');
  const menusAdmin = [
    { label: 'Dashboard', value: 'inicio', icon: <HomeIcon /> },    { label: 'Chamados', value: 'chamados', icon: <ListAltIcon /> },
    { label: 'Usuários', value: 'usuarios', icon: <PeopleIcon /> },
    { label: 'Departamentos', value: 'departamentos', icon: <BusinessIcon /> },
    { label: 'Relatórios', value: 'relatorioProblemas', icon: <AssessmentIcon /> },
    { label: 'Config. E-mail', value: 'config-email', icon: <EmailIcon /> },
  ];
  const menusUser = [
    { label: 'Dashboard', value: 'inicio', icon: <HomeIcon /> },
    { label: 'Criar Chamado', value: 'abrir', icon: <ListAltIcon /> },
    { label: 'Histórico de Chamados', value: 'historico', icon: <HistoryIcon /> }
  ];

  const menus = admin ? menusAdmin : menusUser;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: isMobile ? 70 : 220,
        flexShrink: 0,
        zIndex: 1100,
        [`& .MuiDrawer-paper`]: {
          width: isMobile ? 70 : 220,
          boxSizing: 'border-box',
          background: '#f5f5f5',
          color: '#222',
          top: 64,
          height: 'calc(100vh - 64px)',
          position: 'fixed',
          borderRight: 0,
          transition: 'width 0.2s',
        },
      }}
    >
      <Divider />
      <Box sx={{ height: 120, width: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1, mx: 'auto' }}>
        <img src={logoUnic} alt="Logo UNIC" style={{ width: 180, height: 180, objectFit: 'contain' }} />
      </Box>
      <Divider />
      <List>
        {menus.map((item) => (
          <ListItem key={item.value} disablePadding sx={{ display: 'block' }}>
            <Button
              fullWidth
              sx={{
                justifyContent: isMobile ? 'center' : 'flex-start',
                color: selected === item.value ? 'primary.main' : 'inherit',
                fontWeight: selected === item.value ? 700 : 400,
                px: 2, py: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                background: selected === item.value ? '#e3f2fd' : 'none',
                mb: 0.5,
                minWidth: 0
              }}
              onClick={() => onMenuClick(item.value)}
              startIcon={isMobile ? null : item.icon}
            >
              {isMobile ? null : item.label}
            </Button>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
}
