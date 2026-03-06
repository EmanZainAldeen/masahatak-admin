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
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  CircularProgress,
  Alert,
  Tab,
  Tabs,
  Tooltip
} from '@mui/material';
import { Visibility, Delete, Block, CheckCircle } from '@mui/icons-material';
import api from '../utils/api';
import MainLayout from '../components/Layout/MainLayout';

const Owners = () => {
  const { t } = useTranslation();
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalOwners, setTotalOwners] = useState(0);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [ownerSpaces, setOwnerSpaces] = useState([]);
  const [ownerBookings, setOwnerBookings] = useState([]);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [actionDialog, setActionDialog] = useState({ open: false, type: '', reason: '' });
  const [adminNames, setAdminNames] = useState({});

  useEffect(() => {
    fetchOwners();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage]);

  const fetchOwners = async () => {
    try {
      setLoading(true);
      const response = await api.get('/providers', {
        params: {
          page: page + 1,
          limit: rowsPerPage
        }
      });
      setOwners(response.data.providers || []);
      setTotalOwners(response.data.pagination?.total || 0);
    } catch (err) {
      setError('Failed to load owners');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOwnerDetails = async (ownerId) => {
    try {
      const [profileRes, spacesRes, bookingsRes] = await Promise.all([
        api.get(`/owners/${ownerId}`),
        api.get(`/owners/${ownerId}/spaces`),
        api.get(`/owners/${ownerId}/bookings`)
      ]);

      const owner = profileRes.data.owner;
      setSelectedOwner(owner);
      setOwnerSpaces(spacesRes.data.spaces || []);
      setOwnerBookings(bookingsRes.data.bookings || []);
      setDetailsDialogOpen(true);

      // Fetch admin names if available
      if (owner.updatedBy) {
        await fetchAdminName(owner.updatedBy);
      }
      if (owner.deletedBy) {
        await fetchAdminName(owner.deletedBy);
      }
    } catch (err) {
      setError('Failed to load owner details');
      console.error(err);
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

  const handleOpenActionDialog = (owner, type) => {
    setSelectedOwner(owner);
    setActionDialog({ open: true, type, reason: '' });
  };

  const handleCloseActionDialog = () => {
    setActionDialog({ open: false, type: '', reason: '' });
    setSelectedOwner(null);
  };

  const handleAction = async () => {
    try {
      if (actionDialog.type === 'delete') {
        await api.delete(`/providers/${selectedOwner.id}`, {
          data: { reason: actionDialog.reason }
        });
      } else {
        await api.put(`/providers/${selectedOwner.id}/status`, {
          status: actionDialog.type,
          reason: actionDialog.reason
        });
      }
      handleCloseActionDialog();
      fetchOwners();
      setSuccess(`Owner ${actionDialog.type === 'delete' ? 'deleted' : actionDialog.type} successfully`);
    } catch (err) {
      setError(`Failed to ${actionDialog.type} owner`);
      console.error(err);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'suspended':
        return 'error';
      case 'deleted':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && owners.length === 0) {
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
          {t('owners.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('owners.subtitle')}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Card elevation={2}>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('owners.businessName')}</TableCell>
                  <TableCell>{t('owners.contactEmail')}</TableCell>
                  <TableCell>{t('owners.contactPhone')}</TableCell>
                  <TableCell>{t('common.status')}</TableCell>
                  <TableCell>{t('users.joinedDate')}</TableCell>
                  <TableCell>{t('common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {owners.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary">
                        {t('owners.noOwners')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  owners.map((owner) => (
                    <TableRow key={owner.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {owner.businessName || owner.fullName || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {owner.contactEmail || owner.email || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {owner.contactPhone || owner.phone || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={owner.status || 'active'}
                          color={getStatusColor(owner.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(owner.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={t('common.viewDetails')}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => fetchOwnerDetails(owner.id)}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {owner.status !== 'suspended' && owner.status !== 'deleted' && (
                          <Tooltip title={t('users.suspend')}>
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => handleOpenActionDialog(owner, 'suspended')}
                            >
                              <Block fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {owner.status === 'suspended' && (
                          <Tooltip title={t('users.activate')}>
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleOpenActionDialog(owner, 'active')}
                            >
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {owner.status !== 'deleted' && (
                          <Tooltip title={t('users.deleteUser')}>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleOpenActionDialog(owner, 'delete')}
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
            count={totalOwners}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </CardContent>
      </Card>

      {/* Action Dialog (Suspend/Delete) */}
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
              ? `${t('common.confirm')} ${selectedOwner?.businessName || selectedOwner?.fullName}?`
              : actionDialog.type === 'suspended'
              ? `${t('common.confirm')} ${selectedOwner?.businessName || selectedOwner?.fullName}?`
              : `${t('common.confirm')} ${selectedOwner?.businessName || selectedOwner?.fullName}?`}
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

      {/* Owner Details Dialog */}
      <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t('owners.ownerDetails')}</DialogTitle>
        <DialogContent>
          {selectedOwner && (
            <>
              <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
                <Tab label={t('owners.profile')} />
                <Tab label={`${t('owners.spaces')} (${ownerSpaces.length})`} />
                <Tab label={`${t('owners.bookings')} (${ownerBookings.length})`} />
              </Tabs>

              {tabValue === 0 && (
                <Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">{t('owners.businessName')}</Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {selectedOwner.businessName || t('common.notAvailable')}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">{t('owners.contactEmail')}</Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {selectedOwner.contactEmail || selectedOwner.email || t('common.notAvailable')}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">{t('owners.contactPhone')}</Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {selectedOwner.contactPhone || selectedOwner.phone || t('common.notAvailable')}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">{t('common.status')}</Typography>
                      <Chip
                        label={
                          selectedOwner.status === 'active' ? t('common.active') :
                          selectedOwner.status === 'suspended' ? t('common.suspended') :
                          selectedOwner.status === 'pending' ? t('common.pending') :
                          t('common.deleted')
                        }
                        color={getStatusColor(selectedOwner.status)}
                      />
                    </Grid>
                  </Grid>

                  {selectedOwner.status === 'suspended' && (
                    <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
                      {selectedOwner.statusReason && (
                        <>
                          <Typography variant="subtitle2" color="text.secondary">{t('users.suspensionReason')}</Typography>
                          <Typography variant="body1" fontWeight="bold" sx={{ mb: 2 }}>
                            {selectedOwner.statusReason}
                          </Typography>
                        </>
                      )}
                      {selectedOwner.updatedBy && (
                        <>
                          <Typography variant="subtitle2" color="text.secondary">{t('users.suspendedBy')}</Typography>
                          <Typography variant="body1" fontWeight="bold" sx={{ mb: 2 }}>
                            {adminNames[selectedOwner.updatedBy] || t('common.loading')}
                          </Typography>
                        </>
                      )}
                      {selectedOwner.updatedAt && (
                        <>
                          <Typography variant="subtitle2" color="text.secondary">{t('users.suspendedOn')}</Typography>
                          <Typography variant="body1" fontWeight="bold" sx={{ mb: 2 }}>
                            {selectedOwner.updatedAt?.toDate?.()?.toLocaleString() || t('common.notAvailable')}
                          </Typography>
                        </>
                      )}
                    </Box>
                  )}

                  {selectedOwner.status === 'deleted' && (
                    <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
                      {selectedOwner.statusReason && (
                        <>
                          <Typography variant="subtitle2" color="text.secondary">{t('users.deletionReason')}</Typography>
                          <Typography variant="body1" fontWeight="bold" sx={{ mb: 2 }}>
                            {selectedOwner.statusReason}
                          </Typography>
                        </>
                      )}
                      {selectedOwner.deletedBy && (
                        <>
                          <Typography variant="subtitle2" color="text.secondary">{t('users.deletedBy')}</Typography>
                          <Typography variant="body1" fontWeight="bold" sx={{ mb: 2 }}>
                            {adminNames[selectedOwner.deletedBy] || t('common.loading')}
                          </Typography>
                        </>
                      )}
                      {selectedOwner.deletedAt && (
                        <>
                          <Typography variant="subtitle2" color="text.secondary">{t('users.deletedOn')}</Typography>
                          <Typography variant="body1" fontWeight="bold" sx={{ mb: 2 }}>
                            {selectedOwner.deletedAt?.toDate?.()?.toLocaleString() || t('common.notAvailable')}
                          </Typography>
                        </>
                      )}
                    </Box>
                  )}
                </Box>
              )}

              {tabValue === 1 && (
                <Box>
                  {ownerSpaces.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">{t('workspaces.noWorkspaces')}</Typography>
                  ) : (
                    ownerSpaces.map((space) => (
                      <Card key={space.id} sx={{ mb: 2 }}>
                        <CardContent>
                          <Typography variant="h6">{space.spaceName}</Typography>
                          <Typography variant="body2" color="text.secondary">{space.location}</Typography>
                          <Chip
                            label={
                              space.status === 'active' ? t('common.active') :
                              space.status === 'pending' ? t('common.pending') :
                              space.status === 'rejected' ? t('common.rejected') :
                              t('common.deleted')
                            }
                            color={getStatusColor(space.status)}
                            size="small"
                            sx={{ mt: 1 }}
                          />
                        </CardContent>
                      </Card>
                    ))
                  )}
                </Box>
              )}

              {tabValue === 2 && (
                <Box>
                  {ownerBookings.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">{t('bookings.noBookingsFound')}</Typography>
                  ) : (
                    ownerBookings.map((booking) => (
                      <Card key={booking.id} sx={{ mb: 2 }}>
                        <CardContent>
                          <Typography variant="body2">{t('bookings.bookingId')}: {booking.id?.substring(0, 8)}...</Typography>
                          <Typography variant="body2">{t('common.status')}: <Chip label={booking.status} size="small" /></Typography>
                          <Typography variant="body2">{t('bookings.startDate')}: {formatDate(booking.startDate)}</Typography>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
};

export default Owners;
