import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Save, Lock } from '@mui/icons-material';
import api from '../utils/api';
import MainLayout from '../components/Layout/MainLayout';

const Settings = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Profile form state
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: ''
  });
  const [profileLoading, setProfileLoading] = useState(false);

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/auth/profile');
      const admin = response.data.admin;
      setProfileData({
        fullName: admin.fullName || '',
        email: admin.email || '',
        phone: admin.phone || ''
      });
    } catch (err) {
      setError('Failed to load profile');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!profileData.fullName || !profileData.email) {
      setError(t('settings.fillRequired'));
      return;
    }

    try {
      setProfileLoading(true);
      const response = await api.put('/auth/profile', profileData);

      // Update localStorage with new admin data
      const updatedAdmin = response.data.admin;
      localStorage.setItem('adminData', JSON.stringify({
        id: updatedAdmin.id,
        email: updatedAdmin.email,
        fullName: updatedAdmin.fullName,
        role: updatedAdmin.role
      }));

      setSuccess(t('settings.profileUpdated'));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
      console.error(err);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setError(t('settings.fillRequired'));
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError(t('settings.passwordMinLength'));
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError(t('settings.passwordMismatch'));
      return;
    }

    try {
      setPasswordLoading(true);
      await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      setSuccess(t('settings.passwordChanged'));
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
      console.error(err);
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          {t('settings.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('settings.subtitle')}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Profile Information Card */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Save sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight="bold">
                  {t('settings.profile')}
                </Typography>
              </Box>

              <form onSubmit={handleUpdateProfile}>
                <TextField
                  fullWidth
                  label={t('settings.fullName')}
                  name="fullName"
                  value={profileData.fullName}
                  onChange={handleProfileChange}
                  margin="normal"
                  required
                />
                <TextField
                  fullWidth
                  label={t('settings.email')}
                  name="email"
                  type="email"
                  value={profileData.email}
                  onChange={handleProfileChange}
                  margin="normal"
                  required
                />
                <TextField
                  fullWidth
                  label={t('settings.phone')}
                  name="phone"
                  value={profileData.phone}
                  onChange={handleProfileChange}
                  margin="normal"
                />

                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  sx={{ mt: 3 }}
                  disabled={profileLoading}
                  startIcon={profileLoading ? <CircularProgress size={20} /> : <Save />}
                >
                  {profileLoading ? t('common.loading') : t('settings.updateProfile')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </Grid>

        {/* Change Password Card */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Lock sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight="bold">
                  {t('settings.changePassword')}
                </Typography>
              </Box>

              <form onSubmit={handleChangePassword}>
                <TextField
                  fullWidth
                  label={t('settings.currentPassword')}
                  name="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  margin="normal"
                  required
                />
                <TextField
                  fullWidth
                  label={t('settings.newPassword')}
                  name="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  margin="normal"
                  required
                />
                <TextField
                  fullWidth
                  label={t('settings.confirmPassword')}
                  name="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  margin="normal"
                  required
                />

                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  sx={{ mt: 3 }}
                  disabled={passwordLoading}
                  startIcon={passwordLoading ? <CircularProgress size={20} /> : <Lock />}
                >
                  {passwordLoading ? t('common.loading') : t('settings.updatePassword')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </MainLayout>
  );
};

export default Settings;
