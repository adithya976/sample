import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  Dashboard,
  People,
  SwapHoriz,
  Settings,
  Logout,
  AdminPanelSettings,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout, isAdmin } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileMenuAnchorEl, setMobileMenuAnchorEl] = useState(null);

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMobileMenuOpen = (event) => {
    setMobileMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMobileMenuAnchorEl(null);
  };

  const handleNavigation = (path) => {
    navigate(path);
    handleMenuClose();
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    handleMenuClose();
  };

  const menuItems = [
    { label: 'Dashboard', path: '/dashboard', icon: <Dashboard /> },
    { label: 'Browse Users', path: '/browse', icon: <People /> },
    { label: 'Swap Requests', path: '/swaps', icon: <SwapHoriz /> },
  ];

  const renderProfileMenu = (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={handleMenuClose}
      onClick={handleMenuClose}
      PaperProps={{
        elevation: 0,
        sx: {
          overflow: 'visible',
          filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
          mt: 1.5,
          '& .MuiAvatar-root': {
            width: 32,
            height: 32,
            ml: -0.5,
            mr: 1,
          },
          '&:before': {
            content: '""',
            display: 'block',
            position: 'absolute',
            top: 0,
            right: 14,
            width: 10,
            height: 10,
            bgcolor: 'background.paper',
            transform: 'translateY(-50%) rotate(45deg)',
            zIndex: 0,
          },
        },
      }}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
    >
      <MenuItem onClick={() => handleNavigation('/profile')}>
        <Avatar sx={{ mr: 2 }} />
        Profile
      </MenuItem>
      <MenuItem onClick={() => handleNavigation('/profile')}>
        <Settings sx={{ mr: 2 }} />
        Settings
      </MenuItem>
      {isAdmin() && (
        <MenuItem onClick={() => handleNavigation('/admin')}>
          <AdminPanelSettings sx={{ mr: 2 }} />
          Admin Panel
        </MenuItem>
      )}
      <MenuItem onClick={handleLogout}>
        <Logout sx={{ mr: 2 }} />
        Logout
      </MenuItem>
    </Menu>
  );

  const renderMobileMenu = (
    <Menu
      anchorEl={mobileMenuAnchorEl}
      open={Boolean(mobileMenuAnchorEl)}
      onClose={handleMenuClose}
      PaperProps={{
        elevation: 0,
        sx: {
          overflow: 'visible',
          filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
          mt: 1.5,
        },
      }}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
    >
      {menuItems.map((item) => (
        <MenuItem 
          key={item.path} 
          onClick={() => handleNavigation(item.path)}
          selected={location.pathname === item.path}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {item.icon}
            {item.label}
          </Box>
        </MenuItem>
      ))}
    </Menu>
  );

  return (
    <AppBar position="static" elevation={2}>
      <Toolbar>
        <Typography
          variant="h6"
          component="div"
          sx={{ 
            flexGrow: 0, 
            fontWeight: 'bold',
            cursor: 'pointer',
            mr: 4,
          }}
          onClick={() => navigate(isAuthenticated ? '/dashboard' : '/')}
        >
          SkillSwap
        </Typography>

        {isAuthenticated && (
          <>
            {/* Desktop Navigation */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2, flexGrow: 1 }}>
              {menuItems.map((item) => (
                <Button
                  key={item.path}
                  color="inherit"
                  startIcon={item.icon}
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    backgroundColor: location.pathname === item.path ? 'rgba(255,255,255,0.1)' : 'transparent',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.1)',
                    },
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>

            {/* Mobile Navigation */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, flexGrow: 1 }}>
              <IconButton
                size="large"
                aria-label="show more"
                aria-controls="mobile-menu"
                aria-haspopup="true"
                onClick={handleMobileMenuOpen}
                color="inherit"
              >
                <MenuIcon />
              </IconButton>
            </Box>

            {/* User Profile Section */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
                Welcome, {user?.name}
              </Typography>
              <Tooltip title="Account settings">
                <IconButton
                  onClick={handleProfileMenuOpen}
                  size="small"
                  sx={{ ml: 2 }}
                  aria-controls={Boolean(anchorEl) ? 'account-menu' : undefined}
                  aria-haspopup="true"
                  aria-expanded={Boolean(anchorEl) ? 'true' : undefined}
                >
                  <Avatar 
                    sx={{ width: 32, height: 32 }}
                    src={user?.profile_photo ? `http://localhost:5000${user.profile_photo}` : undefined}
                  >
                    {user?.name?.charAt(0).toUpperCase()}
                  </Avatar>
                </IconButton>
              </Tooltip>
            </Box>
          </>
        )}

        {!isAuthenticated && (
          <Box sx={{ display: 'flex', gap: 2, ml: 'auto' }}>
            <Button 
              color="inherit" 
              onClick={() => navigate('/login')}
              sx={{ 
                backgroundColor: location.pathname === '/login' ? 'rgba(255,255,255,0.1)' : 'transparent',
              }}
            >
              Login
            </Button>
            <Button 
              color="inherit" 
              variant="outlined"
              onClick={() => navigate('/register')}
              sx={{ 
                borderColor: 'rgba(255,255,255,0.5)',
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.8)',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              Register
            </Button>
          </Box>
        )}
      </Toolbar>

      {renderProfileMenu}
      {renderMobileMenu}
    </AppBar>
  );
};

export default Navbar;