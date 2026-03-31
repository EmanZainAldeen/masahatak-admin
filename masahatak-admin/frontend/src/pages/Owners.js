import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Card, CardContent, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, Chip,
  IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, CircularProgress, Alert, Tab, Tabs, Tooltip,
  Collapse, List, ListItem, ListItemText, ListItemIcon
} from '@mui/material';
import {
  Visibility, Delete, Block, CheckCircle,
  ExpandMore, ExpandLess, Person, PeopleAlt
} from '@mui/icons-material';
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
  // Assistants dropdown state: { [ownerId]: { open, assistants, loading } }
  const [assistantsMap, setAssistantsMap] = useState({});

  useEffect(() => {
    fetchOwners();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage]);

  const fetchOwners = async () => {
    try {
      setLoading(true);
      const response = await api.get('/providers', { params: { page: page + 1, limit: rowsPerPage } });
      setOwners(response.data.providers || []);
      setTotalOwners(response.data.pagination?.total || 0);
    } catch (err) {
      setError('Failed to load owners');
    } finally {
      setLoading(false);
    }
  };

  const toggleAssistants = async (ownerId) => {
    const current = assistantsMap[ownerId];

    // Close if already open
    if (current?.open) {
      setAssistantsMap(prev => ({ ...prev, [ownerId]: { ...prev[ownerId], open: false } }));
      return;
    }

    // Already loaded, just open
    if (current?.assistants) {
      setAssistantsMap(prev => ({ ...prev, [ownerId]: { ...prev[ownerId], open: true } }));
      return;
    }

    // Load assistants
    setAssistantsMap(prev => ({ ...prev, [ownerId]: { open: true, assistants: null, loading: true } }));
    try {
      const res = await api.get(`/owners/${ownerId}/assistants`);
      setAssistantsMap(prev => ({
        ...prev,
        [ownerId]: { open: true, assistants: res.data.assistants || [], loading: false }
      }));
    } catch {
      setAssistantsMap(prev => ({ ...prev, [ownerId]: { open: true, assistants: [], loading: false } }));
    }
  };

  const fetchOwnerDetails = async (ownerId) => {
    try {
      const [profileRes, spacesRes, bookingsRes] = await Promise.all([
        api.get(`/owners/${ownerId}`),
        api.get(`/owners/${ownerId}/spaces`),
        api.get(`/owners/${ownerId}/bookings`)
      ]);
      setSelectedOwner(profileRes.data.owner);
      setOwnerSpaces(spacesRes.data.spaces || []);
      setOwnerBookings(bookingsRes.data.bookings || []);
      setDetailsDialogOpen(true);
      if (profileRes.data.owner.updatedBy) fetchAdminName(profileRes.data.owner.updatedBy);
      if (profileRes.data.owner.deletedBy) fetchAdminName(profileRes.data.owner.deletedBy);
    } catch {
      setError('Failed to load owner details');
    }
  };

  const fetchAdminName = async (adminId) => {
    if (!adminId || adminNames[adminId]) return adminNames[adminId];
    try {
      const response = await api.get(`/superadmin/admins/${adminId}`);
      const name = response.data.admin.fullName || 'Unknown Admin';
      setAdminNames(prev => ({ ...prev, [adminId]: name }));
      return name;
    } catch { return 'Unknown Admin'; }
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
        await api.delete(`/providers/${selectedOwner.id}`, { data: { reason: actionDialog.reason } });
      } else {
        await api.put(`/providers/${selectedOwner.id}/status`, { status: actionDialog.type, reason: actionDialog.reason });
      }
      handleCloseActionDialog();
      fetchOwners();
      setSuccess(`Owner ${actionDialog.type === 'delete' ? 'deleted' : actionDialog.type} successfully`);
    } catch {
      setError(`Failed to ${actionDialog.type} owner`);
    }
  };

  const getStatusColor = (status) => ({ active: 'success', pending: 'warning', suspended: 'error', deleted: 'default' }[status] || 'default');

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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
        <Typography variant="h4" fontWeight="bold" gutterBottom>{t('owners.title')}</Typography>
        <Typography variant="body1" color="text.secondary">{t('owners.subtitle')}</Typography>
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
                  <TableCell>Assistants</TableCell>
                  <TableCell>{t('common.status')}</TableCell>
                  <TableCell>{t('users.joinedDate')}</TableCell>
                  <TableCell>{t('common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {owners.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary">{t('owners.noOwners')}</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  owners.map((owner) => {
                    const aState = assistantsMap[owner.id];
                    const isOpen = aState?.open || false;
                    return (
                      <React.Fragment key={owner.id}>
                        <TableRow hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {owner.businessName || owner.fullName || 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>{owner.contactEmail || owner.email || 'N/A'}</TableCell>
                          <TableCell>{owner.contactPhone || owner.phone || 'N/A'}</TableCell>

                          {/* Assistants dropdown button */}
                          <TableCell>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<PeopleAlt fontSize="small" />}
                              endIcon={isOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                              onClick={() => toggleAssistants(owner.id)}
                              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                            >
                              Assistants
                            </Button>
                          </TableCell>

                          <TableCell>
                            <Chip label={owner.status || 'active'} color={getStatusColor(owner.status)} size="small" />
                          </TableCell>
                          <TableCell>{formatDate(owner.createdAt)}</TableCell>
                          <TableCell>
                            <Tooltip title={t('common.viewDetails')}>
                              <IconButton size="small" color="primary" onClick={() => fetchOwnerDetails(owner.id)}>
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {owner.status !== 'suspended' && owner.status !== 'deleted' && (
                              <Tooltip title={t('users.suspend')}>
                                <IconButton size="small" color="warning" onClick={() => handleOpenActionDialog(owner, 'suspended')}>
                                  <Block fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {owner.status === 'suspended' && (
                              <Tooltip title={t('users.activate')}>
                                <IconButton size="small" color="success" onClick={() => handleOpenActionDialog(owner, 'active')}>
                                  <CheckCircle fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {owner.status !== 'deleted' && (
                              <Tooltip title={t('users.deleteUser')}>
                                <IconButton size="small" color="error" onClick={() => handleOpenActionDialog(owner, 'delete')}>
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>

                        {/* Assistants expanded row */}
                        {isOpen && (
                          <TableRow>
                            <TableCell colSpan={7} sx={{ p: 0, borderBottom: 'none' }}>
                              <Collapse in={isOpen} timeout="auto" unmountOnExit>
                                <Box sx={{ mx: 4, my: 1, bgcolor: '#f9f9f9', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                                  {aState?.loading ? (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2 }}>
                                      <CircularProgress size={16} />
                                      <Typography variant="body2" color="text.secondary">Loading assistants...</Typography>
                                    </Box>
                                  ) : aState?.assistants?.length === 0 ? (
                                    <Box sx={{ p: 2 }}>
                                      <Typography variant="body2" color="text.secondary" fontStyle="italic">
                                        No assistants assigned to this owner's spaces.
                                      </Typography>
                                    </Box>
                                  ) : (
                                    <List dense disablePadding>
                                      {aState?.assistants?.map((assistant, idx) => (
                                        <ListItem
                                          key={assistant.id}
                                          divider={idx < aState.assistants.length - 1}
                                          sx={{ px: 2, py: 0.75 }}
                                        >
                                          <ListItemIcon sx={{ minWidth: 32 }}>
                                            <Person fontSize="small" color="primary" />
                                          </ListItemIcon>
                                          <ListItemText
                                            primary={<Typography variant="body2" fontWeight={600}>{assistant.fullName}</Typography>}
                                            secondary={<Typography variant="caption" color="text.secondary">{assistant.email}</Typography>}
                                          />
                                          <Chip
                                            label={assistant.status || 'active'}
                                            color={getStatusColor(assistant.status)}
                                            size="small"
                                          />
                                        </ListItem>
                                      ))}
                                    </List>
                                  )}
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={totalOwners}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onClose={handleCloseActionDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionDialog.type === 'delete' ? t('users.deleteUser') : actionDialog.type === 'suspended' ? t('users.suspend') : t('users.activate')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {t('common.confirm')} "{selectedOwner?.businessName || selectedOwner?.fullName}"?
          </Typography>
          {actionDialog.type !== 'active' && (
            <TextField
              fullWidth multiline rows={3}
              label={actionDialog.type === 'delete' ? t('users.deletionReason') : t('users.suspensionReason')}
              value={actionDialog.reason}
              onChange={(e) => setActionDialog({ ...actionDialog, reason: e.target.value })}
              margin="normal"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseActionDialog}>{t('common.cancel')}</Button>
          <Button onClick={handleAction} variant="contained" color={actionDialog.type === 'delete' || actionDialog.type === 'suspended' ? 'error' : 'primary'}>
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
              <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 3 }}>
                <Tab label={t('owners.profile')} />
                <Tab label={`${t('owners.spaces')} (${ownerSpaces.length})`} />
                <Tab label={`${t('owners.bookings')} (${ownerBookings.length})`} />
              </Tabs>

              {tabValue === 0 && (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">{t('owners.businessName')}</Typography>
                    <Typography variant="body1" fontWeight="bold">{selectedOwner.businessName || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">{t('owners.contactEmail')}</Typography>
                    <Typography variant="body1" fontWeight="bold">{selectedOwner.contactEmail || selectedOwner.email || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">{t('owners.contactPhone')}</Typography>
                    <Typography variant="body1" fontWeight="bold">{selectedOwner.contactPhone || selectedOwner.phone || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">{t('common.status')}</Typography>
                    <Chip label={selectedOwner.status || 'active'} color={getStatusColor(selectedOwner.status)} />
                  </Grid>
                  {selectedOwner.status === 'suspended' && selectedOwner.statusReason && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">{t('users.suspensionReason')}</Typography>
                      <Typography variant="body1" fontWeight="bold">{selectedOwner.statusReason}</Typography>
                    </Grid>
                  )}
                  {selectedOwner.status === 'deleted' && selectedOwner.statusReason && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">{t('users.deletionReason')}</Typography>
                      <Typography variant="body1" fontWeight="bold">{selectedOwner.statusReason}</Typography>
                    </Grid>
                  )}
                </Grid>
              )}

              {tabValue === 1 && (
                <Box>
                  {ownerSpaces.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">{t('workspaces.noWorkspaces')}</Typography>
                  ) : ownerSpaces.map((space) => (
                    <Card key={space.id} sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="h6">{space.spaceName}</Typography>
                        <Typography variant="body2" color="text.secondary">{space.location}</Typography>
                        <Chip label={space.status || 'active'} color={getStatusColor(space.status)} size="small" sx={{ mt: 1 }} />
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}

              {tabValue === 2 && (
                <Box>
                  {ownerBookings.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">{t('bookings.noBookingsFound')}</Typography>
                  ) : ownerBookings.map((booking) => (
                    <Card key={booking.id} sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="body2">{t('bookings.bookingId')}: {booking.id?.substring(0, 8)}...</Typography>
                        <Typography variant="body2">{t('common.status')}: <Chip label={booking.status} size="small" /></Typography>
                        <Typography variant="body2">{t('bookings.startDate')}: {formatDate(booking.startDate)}</Typography>
                      </CardContent>
                    </Card>
                  ))}
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
