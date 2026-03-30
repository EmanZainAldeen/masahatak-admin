import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Card, CardContent, Typography, TextField, Button, Grid,
  Alert, CircularProgress, Tabs, Tab, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { Save, Lock, AdminPanelSettings, Delete, Add, Person, Star } from '@mui/icons-material';
import api from '../utils/api';
import MainLayout from '../components/Layout/MainLayout';
import authService from '../services/authService';

const Settings = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const adminData = authService.getAdminData();
  const isSuperAdmin = adminData?.role === 'super_admin';

  // Profile state
  const [profileData, setProfileData] = useState({ fullName: '', email: '', phone: '' });
  const [profileLoading, setProfileLoading] = useState(false);

  // Password state
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Admins state
  const [admins, setAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ email: '', fullName: '', password: '', role: 'admin' });

  useEffect(() => { fetchProfile(); }, []);
  useEffect(() => {
    if (tab === 2 && isSuperAdmin) fetchAdmins();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/profile');
      const admin = res.data.admin;
      setProfileData({ fullName: admin.fullName || '', email: admin.email || '', phone: admin.phone || '' });
    } catch { setError('Failed to load profile'); }
    finally { setLoading(false); }
  };

  const fetchAdmins = async () => {
    try {
      setAdminsLoading(true);
      const res = await api.get('/superadmin/admins');
      setAdmins(res.data.admins || []);
    } catch { setError('Failed to load admins'); }
    finally { setAdminsLoading(false); }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!profileData.fullName || !profileData.email) { setError(t('settings.fillRequired')); return; }
    try {
      setProfileLoading(true);
      const res = await api.put('/auth/profile', profileData);
      const updated = res.data.admin;
      localStorage.setItem('adminData', JSON.stringify({ id: updated.id, email: updated.email, fullName: updated.fullName, role: updated.role }));
      setSuccess(t('settings.profileUpdated'));
    } catch (err) { setError(err.response?.data?.error || 'Failed to update profile'); }
    finally { setProfileLoading(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) { setError(t('settings.fillRequired')); return; }
    if (passwordData.newPassword.length < 6) { setError(t('settings.passwordMinLength')); return; }
    if (passwordData.newPassword !== passwordData.confirmPassword) { setError(t('settings.passwordMismatch')); return; }
    try {
      setPasswordLoading(true);
      await api.put('/auth/change-password', { currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword });
      setSuccess(t('settings.passwordChanged'));
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { setError(err.response?.data?.error || 'Failed to change password'); }
    finally { setPasswordLoading(false); }
  };

  const handleCreateAdmin = async () => {
    try {
      await api.post('/superadmin/admins', newAdmin);
      setSuccess('Admin created successfully');
      setCreateDialogOpen(false);
      setNewAdmin({ email: '', fullName: '', password: '', role: 'admin' });
      fetchAdmins();
    } catch (err) { setError(err.response?.data?.error || 'Failed to create admin'); }
  };

  const handleDeleteAdmin = async (id) => {
    if (!window.confirm('Are you sure you want to remove this admin?')) return;
    try {
      await api.delete(`/superadmin/admins/${id}`);
      setSuccess('Admin removed successfully');
      fetchAdmins();
    } catch (err) { setError(err.response?.data?.error || 'Failed to remove admin'); }
  };

  const handleMakeSuperAdmin = async (id) => {
    if (!window.confirm('Make this admin a super admin?')) return;
    try {
      await api.put(`/superadmin/admins/${id}/role`, { role: 'super_admin' });
      setSuccess('Role updated successfully');
      fetchAdmins();
    } catch (err) { setError(err.response?.data?.error || 'Failed to update role'); }
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
        <Typography variant="h4" fontWeight="bold" gutterBottom>{t('settings.title')}</Typography>
        <Typography variant="body1" color="text.secondary">{t('settings.subtitle')}</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab icon={<Save fontSize="small" />} iconPosition="start" label={t('settings.profile')} />
        <Tab icon={<Lock fontSize="small" />} iconPosition="start" label={t('settings.changePassword')} />
        {isSuperAdmin && <Tab icon={<AdminPanelSettings fontSize="small" />} iconPosition="start" label="Admins" />}
      </Tabs>

      {/* Tab 0: Profile */}
      {tab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Save sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight="bold">{t('settings.profile')}</Typography>
                </Box>
                <form onSubmit={handleUpdateProfile}>
                  <TextField fullWidth label={t('settings.fullName')} name="fullName" value={profileData.fullName} onChange={(e) => setProfileData(p => ({ ...p, fullName: e.target.value }))} margin="normal" required />
                  <TextField fullWidth label={t('settings.email')} name="email" type="email" value={profileData.email} onChange={(e) => setProfileData(p => ({ ...p, email: e.target.value }))} margin="normal" required />
                  <TextField fullWidth label={t('settings.phone')} name="phone" value={profileData.phone} onChange={(e) => setProfileData(p => ({ ...p, phone: e.target.value }))} margin="normal" />
                  <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 3 }} disabled={profileLoading} startIcon={profileLoading ? <CircularProgress size={20} /> : <Save />}>
                    {profileLoading ? t('common.loading') : t('settings.updateProfile')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 1: Change Password */}
      {tab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Lock sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight="bold">{t('settings.changePassword')}</Typography>
                </Box>
                <form onSubmit={handleChangePassword}>
                  <TextField fullWidth label={t('settings.currentPassword')} name="currentPassword" type="password" value={passwordData.currentPassword} onChange={(e) => setPasswordData(p => ({ ...p, currentPassword: e.target.value }))} margin="normal" required />
                  <TextField fullWidth label={t('settings.newPassword')} name="newPassword" type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData(p => ({ ...p, newPassword: e.target.value }))} margin="normal" required />
                  <TextField fullWidth label={t('settings.confirmPassword')} name="confirmPassword" type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData(p => ({ ...p, confirmPassword: e.target.value }))} margin="normal" required />
                  <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 3 }} disabled={passwordLoading} startIcon={passwordLoading ? <CircularProgress size={20} /> : <Lock />}>
                    {passwordLoading ? t('common.loading') : t('settings.updatePassword')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 2: Admins (super_admin only) */}
      {tab === 2 && isSuperAdmin && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" startIcon={<Add />} onClick={() => setCreateDialogOpen(true)}>
              Add Admin
            </Button>
          </Box>
          <Card elevation={2}>
            <CardContent sx={{ p: 0 }}>
              {adminsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableCell><strong>Full Name</strong></TableCell>
                        <TableCell><strong>Email</strong></TableCell>
                        <TableCell><strong>Role</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        <TableCell align="center"><strong>Actions</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {admins.length === 0 ? (
                        <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>No admins found</TableCell></TableRow>
                      ) : admins.map((admin) => (
                        <TableRow key={admin.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Person fontSize="small" color="action" />
                              <Typography variant="body2" fontWeight="medium">{admin.fullName || 'N/A'}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>{admin.email}</TableCell>
                          <TableCell>
                            <Chip label={admin.role === 'super_admin' ? 'Super Admin' : 'Admin'} size="small" color={admin.role === 'super_admin' ? 'primary' : 'default'} />
                          </TableCell>
                          <TableCell>
                            <Chip label={admin.status || 'active'} size="small" color="success" />
                          </TableCell>
                          <TableCell align="center">
                            {admin.role !== 'super_admin' && admin.id !== adminData?.id && (
                              <Tooltip title="Make Super Admin">
                                <IconButton size="small" color="primary" onClick={() => handleMakeSuperAdmin(admin.id)}><Star fontSize="small" /></IconButton>
                              </Tooltip>
                            )}
                            {admin.id !== adminData?.id && (
                              <Tooltip title="Remove Admin">
                                <IconButton size="small" color="error" onClick={() => handleDeleteAdmin(admin.id)}><Delete fontSize="small" /></IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Create Admin Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Admin</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="Full Name" value={newAdmin.fullName} onChange={(e) => setNewAdmin(p => ({ ...p, fullName: e.target.value }))} required />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Email" type="email" value={newAdmin.email} onChange={(e) => setNewAdmin(p => ({ ...p, email: e.target.value }))} required />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Password" type="password" value={newAdmin.password} onChange={(e) => setNewAdmin(p => ({ ...p, password: e.target.value }))} required helperText="Minimum 6 characters" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateAdmin} disabled={!newAdmin.email || !newAdmin.fullName || !newAdmin.password}>Create</Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
};

export default Settings;
