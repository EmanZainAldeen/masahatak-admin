import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Box,
  Typography,
  Avatar,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  EventSeat as WorkspaceIcon,
  BookOnline as BookingIcon,
  RateReview as ReviewIcon,
  Payment as PaymentIcon,
  Notifications as NotificationsIcon,
  Store as StoreIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Language as LanguageIcon,
  AddBusiness as AddBusinessIcon,
} from '@mui/icons-material';
import authService from '../../services/authService';

const DRAWER_WIDTH = 260;

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const adminData = authService.getAdminData();
  const [langMenuAnchor, setLangMenuAnchor] = useState(null);

  const menuItems = [
    { text: t('nav.dashboard'), icon: <DashboardIcon />, path: '/' },
    { text: t('nav.users'), icon: <PeopleIcon />, path: '/users' },
    { text: t('nav.owners'), icon: <StoreIcon />, path: '/owners' },
    { text: t('nav.workspaces'), icon: <WorkspaceIcon />, path: '/workspaces' },
    { text: t('nav.bookings'), icon: <BookingIcon />, path: '/bookings' },
    { text: t('nav.payments'), icon: <PaymentIcon />, path: '/payments' },
    { text: t('nav.reviews'), icon: <ReviewIcon />, path: '/reviews' },
    { text: t('nav.notifications'), icon: <NotificationsIcon />, path: '/notifications' },
    { text: 'Request Add Space', icon: <AddBusinessIcon />, path: '/request-add-space' },
  ];

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const handleLanguageClick = (event) => {
    setLangMenuAnchor(event.currentTarget);
  };

  const handleLanguageClose = () => {
    setLangMenuAnchor(null);
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
    document.dir = lng === 'ar' ? 'rtl' : 'ltr';
    handleLanguageClose();
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          backgroundColor: '#2C3E50',
          color: 'white',
        },
      }}
    >
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Box
          sx={{
            backgroundColor: 'white',
            borderRadius: 1,
            p: 1.5,
            display: 'inline-block',
            mb: 1
          }}
        >
          <img
            src="/logo.png"
            alt="Masahatak Logo"
            style={{
              maxWidth: '140px',
              height: 'auto',
              display: 'block'
            }}
          />
        </Box>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 1 }}>
          Admin Dashboard
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ bgcolor: '#5B7DB1' }}>
          {adminData?.fullName?.charAt(0) || 'A'}
        </Avatar>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'white' }}>
            {adminData?.fullName || 'Admin'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            {adminData?.email}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

      <List sx={{ px: 1, py: 2 }}>
        {menuItems
          .filter(item => {
            // Only show items marked superAdminOnly for super_admin role
            if (item.superAdminOnly) {
              return adminData?.role === 'super_admin';
            }
            return true;
          })
          .map((item) => (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => navigate(item.path)}
                selected={location.pathname === item.path}
                sx={{
                  borderRadius: 2,
                  color: 'rgba(255,255,255,0.9)',
                  '&.Mui-selected': {
                    backgroundColor: '#5B7DB1',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: '#4D6FA0',
                    },
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
      </List>

      <Box sx={{ flexGrow: 1 }} />

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

      <List sx={{ px: 1, py: 2 }}>
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton
            onClick={() => navigate('/settings')}
            selected={location.pathname === '/settings'}
            sx={{
              borderRadius: 2,
              color: 'rgba(255,255,255,0.9)',
              '&.Mui-selected': {
                backgroundColor: '#5B7DB1',
                color: 'white',
              },
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.1)',
              },
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary={t('nav.settings')} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton
            onClick={handleLanguageClick}
            sx={{
              borderRadius: 2,
              color: 'rgba(255,255,255,0.9)',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.1)',
              },
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
              <LanguageIcon />
            </ListItemIcon>
            <ListItemText primary={i18n.language === 'ar' ? 'العربية' : 'English'} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              color: 'rgba(255,255,255,0.9)',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.1)',
              },
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary={t('nav.logout')} />
          </ListItemButton>
        </ListItem>
      </List>

      <Menu
        anchorEl={langMenuAnchor}
        open={Boolean(langMenuAnchor)}
        onClose={handleLanguageClose}
      >
        <MenuItem onClick={() => changeLanguage('en')}>English</MenuItem>
        <MenuItem onClick={() => changeLanguage('ar')}>العربية</MenuItem>
      </Menu>
    </Drawer>
  );
};

export default Sidebar;
