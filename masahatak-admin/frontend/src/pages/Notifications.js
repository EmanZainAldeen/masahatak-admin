import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  CircularProgress,
  Alert,
  Pagination,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import { Delete, Send, MarkEmailRead } from '@mui/icons-material';
import api from '../utils/api';
import MainLayout from '../components/Layout/MainLayout';

const Notifications = () => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [newNotification, setNewNotification] = useState({
    userId: '',
    title: '',
    message: '',
    type: 'general'
  });

  useEffect(() => {
    fetchNotifications();
    fetchAdmins();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications/all', {
        params: { page, limit: 10 }
      });
      setNotifications(response.data.notifications || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
    } catch (err) {
      setError('Failed to load notifications');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const response = await api.get('/superadmin/admins');
      setAdmins(response.data.admins || []);
    } catch (err) {
      console.error('Failed to load admins:', err);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await api.post(`/notifications/${notificationId}/read`);
      setSuccess('Notification marked as read');
      fetchNotifications();
    } catch (err) {
      setError('Failed to mark notification as read');
      console.error(err);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      setSuccess('Notification deleted successfully');
      fetchNotifications();
    } catch (err) {
      setError('Failed to delete notification');
      console.error(err);
    }
  };

  const handleSendNotification = async () => {
    try {
      await api.post('/notifications/send', newNotification);
      setSuccess('Notification sent successfully');
      setSendDialogOpen(false);
      setNewNotification({ userId: '', title: '', message: '', type: 'general' });
      fetchNotifications();
    } catch (err) {
      setError('Failed to send notification');
      console.error(err);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && notifications.length === 0) {
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
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            {t('notifications.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('notifications.subtitle')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Send />}
          onClick={() => setSendDialogOpen(true)}
        >
          {t('notifications.sendNotification')}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Card elevation={2}>
        <CardContent>
          <List>
            {notifications.length === 0 ? (
              <ListItem>
                <ListItemText
                  primary={
                    <Typography variant="body1" color="text.secondary" align="center">
                      {t('notifications.noNotifications')}
                    </Typography>
                  }
                />
              </ListItem>
            ) : (
              notifications.map((notification) => (
                <ListItem
                  key={notification.id}
                  sx={{
                    borderBottom: '1px solid #eee',
                    backgroundColor: notification.isRead ? 'transparent' : '#f5f5f5'
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {notification.title}
                        </Typography>
                        {!notification.isRead && (
                          <Chip label={t('notifications.unread')} size="small" color="primary" />
                        )}
                        <Chip label={notification.type} size="small" />
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          {formatDate(notification.createdAt)}
                        </Typography>
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    {!notification.isRead && (
                      <IconButton
                        edge="end"
                        onClick={() => handleMarkAsRead(notification.id)}
                        sx={{ mr: 1 }}
                      >
                        <MarkEmailRead />
                      </IconButton>
                    )}
                    <IconButton
                      edge="end"
                      onClick={() => handleDelete(notification.id)}
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))
            )}
          </List>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Send Notification Dialog */}
      <Dialog open={sendDialogOpen} onClose={() => setSendDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('notifications.sendNotification')}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Select Admin</InputLabel>
                <Select
                  value={newNotification.userId}
                  label="Select Admin"
                  onChange={(e) => setNewNotification({ ...newNotification, userId: e.target.value })}
                >
                  {admins.map((admin) => (
                    <MenuItem key={admin.id} value={admin.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        <Typography variant="body1">
                          {admin.fullName || admin.email}
                        </Typography>
                        <Chip
                          label={admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                          size="small"
                          color={admin.role === 'super_admin' ? 'primary' : 'default'}
                          sx={{ ml: 'auto' }}
                        />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('notifications.notificationTitle')}
                value={newNotification.title}
                onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('notifications.message')}
                multiline
                rows={4}
                value={newNotification.message}
                onChange={(e) => setNewNotification({ ...newNotification, message: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label={t('notifications.type')}
                value={newNotification.type}
                onChange={(e) => setNewNotification({ ...newNotification, type: e.target.value })}
                SelectProps={{ native: true }}
              >
                <option value="general">{t('notifications.general')}</option>
                <option value="booking">{t('notifications.booking')}</option>
                <option value="payment">{t('notifications.payment')}</option>
                <option value="promotion">{t('notifications.promotion')}</option>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSendDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button
            onClick={handleSendNotification}
            variant="contained"
            disabled={!newNotification.userId || !newNotification.title || !newNotification.message}
          >
            {t('notifications.send')}
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
};

export default Notifications;
