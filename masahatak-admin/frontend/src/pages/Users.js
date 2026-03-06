import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Tooltip,
  Grid
} from '@mui/material';
import {
  Search,
  Visibility,
  Block,
  CheckCircle,
  Delete,
  FilterList,
  Add
} from '@mui/icons-material';
import api from '../utils/api';
import MainLayout from '../components/Layout/MainLayout';

const Users = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionDialog, setActionDialog] = useState({ open: false, type: '', reason: '' });
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [adminNames, setAdminNames] = useState({});
  const [newUser, setNewUser] = useState({
    email: '',
    fullName: '',
    phoneNumber: '',
    password: ''
  });

  useEffect(() => {
    fetchUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, search, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          search,
          status: statusFilter
        }
      });
      setUsers(response.data.users);
      setTotalUsers(response.data.pagination.total);
    } catch (err) {
      setError('Failed to load users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminName = async (adminId) => {
    if (!adminId || adminNames[adminId]) {
      return adminNames[adminId];
    }

    try {
      const response = await api.get(`/superadmin/admins/${adminId}`);
      const name = response.data.admin.fullName || 'Unknown Admin';
      setAdminNames(prev => ({ ...prev, [adminId]: name }));
      return name;
    } catch (err) {
      console.error('Failed to fetch admin name:', err);
      return 'Unknown Admin';
    }
  };

  const handleOpenDetailsDialog = async (user) => {
    setSelectedUser(user);
    setDetailsDialogOpen(true);

    // Fetch admin names if available
    if (user.updatedBy) {
      await fetchAdminName(user.updatedBy);
    }
    if (user.deletedBy) {
      await fetchAdminName(user.deletedBy);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenActionDialog = (user, type) => {
    setSelectedUser(user);
    setActionDialog({ open: true, type, reason: '' });
  };

  const handleCloseActionDialog = () => {
    setActionDialog({ open: false, type: '', reason: '' });
    setSelectedUser(null);
  };

  const handleAction = async () => {
    try {
      if (actionDialog.type === 'delete') {
        await api.delete(`/users/${selectedUser.id}`, {
          data: { reason: actionDialog.reason }
        });
      } else {
        await api.put(`/users/${selectedUser.id}/status`, {
          status: actionDialog.type,
          reason: actionDialog.reason
        });
      }
      handleCloseActionDialog();
      fetchUsers();
    } catch (err) {
      setError(`Failed to ${actionDialog.type} user`);
      console.error(err);
    }
  };

  const handleCreateUser = async () => {
    try {
      await api.post('/superadmin/admins', {
        email: newUser.email,
        fullName: newUser.fullName,
        password: newUser.password,
        role: 'admin',
      });
      setSuccess('Admin created successfully');
      setCreateDialogOpen(false);
      setNewUser({ email: '', fullName: '', phoneNumber: '', password: '' });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create admin');
      console.error(err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'suspended':
        return 'error';
      case 'deleted':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <MainLayout>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            {t('users.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('users.subtitle')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
        >
          {t('users.addUser')}
        </Button>
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

      <Card elevation={2}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <TextField
              placeholder={t('common.search')}
              variant="outlined"
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flexGrow: 1, minWidth: 250 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                )
              }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>{t('common.status')}</InputLabel>
              <Select
                value={statusFilter}
                label={t('common.status')}
                onChange={(e) => setStatusFilter(e.target.value)}
                startAdornment={<FilterList sx={{ mr: 1, ml: 1 }} />}
              >
                <MenuItem value="all">{t('users.allUsers')}</MenuItem>
                <MenuItem value="active">{t('common.active')}</MenuItem>
                <MenuItem value="suspended">{t('common.suspended')}</MenuItem>
                <MenuItem value="deleted">{t('common.deleted')}</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('users.fullName')}</TableCell>
                  <TableCell>{t('users.email')}</TableCell>
                  <TableCell>{t('users.phone')}</TableCell>
                  <TableCell>{t('common.status')}</TableCell>
                  <TableCell>{t('users.joinedDate')}</TableCell>
                  <TableCell align="center">{t('common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">{t('users.noUsers')}</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>{user.fullName || 'N/A'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phoneNumber || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip
                          label={user.status || 'active'}
                          color={getStatusColor(user.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {user.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title={t('common.viewDetails')}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenDetailsDialog(user)}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {user.status !== 'suspended' && user.status !== 'deleted' && (
                          <Tooltip title={t('users.suspend')}>
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => handleOpenActionDialog(user, 'suspended')}
                            >
                              <Block fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {user.status === 'suspended' && (
                          <Tooltip title={t('users.activate')}>
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleOpenActionDialog(user, 'active')}
                            >
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {user.status !== 'deleted' && (
                          <Tooltip title={t('users.deleteUser')}>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleOpenActionDialog(user, 'delete')}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={totalUsers}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </CardContent>
      </Card>

      <Dialog open={actionDialog.open} onClose={handleCloseActionDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionDialog.type === 'delete'
            ? t('users.deleteUser')
            : actionDialog.type === 'suspended'
            ? t('users.suspend')
            : t('users.activate')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {actionDialog.type === 'delete'
              ? `${t('common.confirm')} ${selectedUser?.fullName}?`
              : actionDialog.type === 'suspended'
              ? `${t('common.confirm')} ${selectedUser?.fullName}?`
              : `${t('common.confirm')} ${selectedUser?.fullName}?`}
          </Typography>
          {actionDialog.type !== 'active' && (
            <TextField
              fullWidth
              multiline
              rows={3}
              label={actionDialog.type === 'delete' ? t('users.deletionReason') : t('users.suspensionReason')}
              value={actionDialog.reason}
              onChange={(e) => setActionDialog({ ...actionDialog, reason: e.target.value })}
              margin="normal"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseActionDialog}>{t('common.cancel')}</Button>
          <Button
            onClick={handleAction}
            variant="contained"
            color={actionDialog.type === 'delete' || actionDialog.type === 'suspended' ? 'error' : 'primary'}
          >
            {t('common.confirm')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('users.userDetails')}</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">{t('users.fullName')}</Typography>
              <Typography variant="body1" fontWeight="bold" sx={{ mb: 2 }}>
                {selectedUser.fullName || t('common.notAvailable')}
              </Typography>

              <Typography variant="subtitle2" color="text.secondary">{t('users.email')}</Typography>
              <Typography variant="body1" fontWeight="bold" sx={{ mb: 2 }}>
                {selectedUser.email || t('common.notAvailable')}
              </Typography>

              <Typography variant="subtitle2" color="text.secondary">{t('users.phone')}</Typography>
              <Typography variant="body1" fontWeight="bold" sx={{ mb: 2 }}>
                {selectedUser.phone || t('common.notAvailable')}
              </Typography>

              <Typography variant="subtitle2" color="text.secondary">{t('common.status')}</Typography>
              <Box sx={{ mb: 2 }}>
                <Chip
                  label={selectedUser.status === 'active' ? t('common.active') : selectedUser.status === 'suspended' ? t('common.suspended') : t('common.deleted')}
                  color={
                    selectedUser.status === 'active' ? 'success' :
                    selectedUser.status === 'suspended' ? 'error' : 'default'
                  }
                />
              </Box>

              <Typography variant="subtitle2" color="text.secondary">{t('users.joinedDate')}</Typography>
              <Typography variant="body1" fontWeight="bold" sx={{ mb: 2 }}>
                {selectedUser.createdAt?.toDate?.()?.toLocaleDateString() || t('common.notAvailable')}
              </Typography>

              {selectedUser.status === 'suspended' && (
                <>
                  {selectedUser.statusReason && (
                    <>
                      <Typography variant="subtitle2" color="text.secondary">{t('users.suspensionReason')}</Typography>
                      <Typography variant="body1" fontWeight="bold" sx={{ mb: 2 }}>
                        {selectedUser.statusReason}
                      </Typography>
                    </>
                  )}
                  {selectedUser.updatedBy && (
                    <>
                      <Typography variant="subtitle2" color="text.secondary">{t('users.suspendedBy')}</Typography>
                      <Typography variant="body1" fontWeight="bold" sx={{ mb: 2 }}>
                        {adminNames[selectedUser.updatedBy] || t('common.loading')}
                      </Typography>
                    </>
                  )}
                  {selectedUser.updatedAt && (
                    <>
                      <Typography variant="subtitle2" color="text.secondary">{t('users.suspendedOn')}</Typography>
                      <Typography variant="body1" fontWeight="bold" sx={{ mb: 2 }}>
                        {selectedUser.updatedAt?.toDate?.()?.toLocaleString() || t('common.notAvailable')}
                      </Typography>
                    </>
                  )}
                </>
              )}

              {selectedUser.status === 'deleted' && (
                <>
                  {selectedUser.statusReason && (
                    <>
                      <Typography variant="subtitle2" color="text.secondary">{t('users.deletionReason')}</Typography>
                      <Typography variant="body1" fontWeight="bold" sx={{ mb: 2 }}>
                        {selectedUser.statusReason}
                      </Typography>
                    </>
                  )}
                  {selectedUser.deletedBy && (
                    <>
                      <Typography variant="subtitle2" color="text.secondary">{t('users.deletedBy')}</Typography>
                      <Typography variant="body1" fontWeight="bold" sx={{ mb: 2 }}>
                        {adminNames[selectedUser.deletedBy] || t('common.loading')}
                      </Typography>
                    </>
                  )}
                  {selectedUser.deletedAt && (
                    <>
                      <Typography variant="subtitle2" color="text.secondary">{t('users.deletedOn')}</Typography>
                      <Typography variant="body1" fontWeight="bold" sx={{ mb: 2 }}>
                        {selectedUser.deletedAt?.toDate?.()?.toLocaleString() || t('common.notAvailable')}
                      </Typography>
                    </>
                  )}
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>

      {/* Create Admin Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Admin</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('users.fullName')}
                value={newUser.fullName}
                onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('users.email')}
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                required
                error={newUser.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('users.password')}
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                required
                helperText="Minimum 6 characters"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button
            onClick={handleCreateUser}
            variant="contained"
            disabled={
              !newUser.email ||
              !newUser.fullName ||
              !newUser.password ||
              newUser.password.length < 6 ||
              !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email)
            }
          >
            {t('common.create')}
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
};

export default Users;
