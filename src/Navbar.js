import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';

export default function Navbar({ onLogout, onPerfil, onAlterarSenha, colaborador, children }) {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  function handleMenu(e) {
    setAnchorEl(e.currentTarget);
  }
  function handleClose() {
    setAnchorEl(null);
  }

  return (
    <AppBar position="fixed" sx={{ background: '#1a237e', zIndex: 1201 }}>
      <Toolbar sx={{ minHeight: 64, px: { xs: 1, sm: 2 }, position: 'relative' }}>
        {/* Centralização absoluta do nome/logo */}
        <Box sx={{ position: 'absolute', left: '50%', top: 0, height: 1, transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', minWidth: 0, pointerEvents: 'none', width: '100%', justifyContent: 'center' }}>
          {/* Nome da empresa centralizado, sem logo */}
          <Typography
            variant="h6"
            component="div"
            sx={{
              color: '#fff',
              fontWeight: 700,
              letterSpacing: 2,
              textAlign: 'center',
              fontFamily: 'Segoe UI, Arial, Helvetica, sans-serif',
              fontSize: { xs: '1rem', sm: '1.3rem', md: '1.7rem', lg: '2rem' },
              textShadow: '0 1px 4px rgba(0,0,0,0.15)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: { xs: 180, sm: 400, md: 600 },
              pointerEvents: 'auto'
            }}
          >
            U.NIC - Sistema de Chamados
          </Typography>
        </Box>
        {/* Espaço para ações à direita */}
        <Box sx={{ flexGrow: 1 }} />
        {/* Notificações (sininho) e menu usuário */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, ml: 2 }}>
          {children}
          <Typography variant="body1" sx={{ ml: 2 }}>{colaborador?.nome || ''}</Typography>
          <IconButton onClick={handleMenu} sx={{ p: 0, ml: 1 }}>
            <Avatar src={colaborador?.fotoPerfil || ''} alt={colaborador?.nome || colaborador?.email || ''} />
          </IconButton>
          <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
            <MenuItem onClick={() => { handleClose(); if (onPerfil) onPerfil(); }}>Meu Perfil</MenuItem>
            <MenuItem onClick={() => { handleClose(); if (typeof onAlterarSenha === 'function') onAlterarSenha(); }}>Alterar Senha</MenuItem>
            <MenuItem onClick={onLogout}>Sair</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
