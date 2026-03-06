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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  CircularProgress,
  Alert,
  Tooltip,
  Grid
} from '@mui/material';
import {
  Visibility,
  CheckCircle,
  Cancel,
  Delete,
  FilterList,
  MeetingRoom,
  LocationOn
} from '@mui/icons-material';
import api from '../utils/api';
import MainLayout from '../components/Layout/MainLayout';

const Workspaces = () => {
  const { t } = useTranslation();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalWorkspaces, setTotalWorkspaces] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [actionDialog, setActionDialog] = useState({ open: false, type: '', reason: '' });
  const [workspaceDetails, setWorkspaceDetails] = useState(null);
  const [adminNames, setAdminNames] = useState({});

  useEffect(() => {
    fetchWorkspaces();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, statusFilter]);

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      const response = await api.get('/workspaces', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          status: statusFilter
        }
      });
      setWorkspaces(response.data.workspaces);
      setTotalWorkspaces(response.data.pagination.total);
    } catch (err) {
      setError('Failed to load workspaces');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkspaceDetails = async (workspaceId) => {
    try {
      const response = await api.get(`/workspaces/${workspaceId}`);
      setWorkspaceDetails(response.data);
      setDetailsDialog(true);

      // Fetch admin names if available
      const workspace = response.data.workspace;
      if (workspace.reviewedBy) {
        await fetchAdminName(workspace.reviewedBy);
      }
      if (workspace.deletedBy) {
        await fetchAdminName(workspace.deletedBy);
      }
    } catch (err) {
      setError('Failed to load workspace details');
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

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenActionDialog = (workspace, type) => {
    setSelectedWorkspace(workspace);
    setActionDialog({ open: true, type, reason: '' });
  };

  const handleCloseActionDialog = () => {
    setActionDialog({ open: false, type: '', reason: '' });
    setSelectedWorkspace(null);
  };

  const handleAction = async () => {
    try {
      if (actionDialog.type === 'delete') {
        await api.delete(`/workspaces/${selectedWorkspace.id}`, {
          data: { reason: actionDialog.reason }
        });
      } else {
        await api.put(`/workspaces/${selectedWorkspace.id}/status`, {
          status: actionDialog.type,
          rejectionReason: actionDialog.reason
        });
      }
      handleCloseActionDialog();
      fetchWorkspaces();
    } catch (err) {
      setError(`Failed to ${actionDialog.type} workspace`);
      console.error(err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      case 'deleted':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <MainLayout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          {t('workspaces.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('workspaces.subtitle')}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card elevation={2}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>{t('workspaces.filterStatus')}</InputLabel>
              <Select
                value={statusFilter}
                label={t('workspaces.filterStatus')}
                onChange={(e) => setStatusFilter(e.target.value)}
                startAdornment={<FilterList sx={{ mr: 1, ml: 1 }} />}
              >
                <MenuItem value="all">{t('workspaces.allSpaces')}</MenuItem>
                <MenuItem value="active">{t('common.active')}</MenuItem>
                <MenuItem value="pending">{t('workspaces.pendingApproval')}</MenuItem>
                <MenuItem value="rejected">{t('common.rejected')}</MenuItem>
                <MenuItem value="deleted">{t('common.deleted')}</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('workspaces.spaceName')}</TableCell>
                  <TableCell>{t('workspaces.location')}</TableCell>
                  <TableCell>{t('workspaces.type')}</TableCell>
                  <TableCell>{t('workspaces.capacity')}</TableCell>
                  <TableCell>{t('workspaces.pricePerHour')}</TableCell>
                  <TableCell>{t('common.status')}</TableCell>
                  <TableCell align="center">{t('common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : workspaces.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">{t('workspaces.noWorkspaces')}</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  workspaces.map((workspace) => (
                    <TableRow key={workspace.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <MeetingRoom color="primary" />
                          {workspace.spaceName}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LocationOn fontSize="small" color="action" />
                          {workspace.location?.city || 'N/A'}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={workspace.spaceType || 'N/A'} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{workspace.capacity || 'N/A'}</TableCell>
                      <TableCell>${workspace.pricePerHour || 0}</TableCell>
                      <TableCell>
                        <Chip
                          label={workspace.status || 'pending'}
                          color={getStatusColor(workspace.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title={t('common.viewDetails')}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => fetchWorkspaceDetails(workspace.id)}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {workspace.status === 'pending' && (
                          <>
                            <Tooltip title={t('workspaces.approve')}>
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleOpenActionDialog(workspace, 'active')}
                              >
                                <CheckCircle fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t('workspaces.reject')}>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleOpenActionDialog(workspace, 'rejected')}
                              >
                                <Cancel fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        {workspace.status !== 'deleted' && (
                          <Tooltip title={t('common.delete')}>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleOpenActionDialog(workspace, 'delete')}
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
            count={totalWorkspaces}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </CardContent>
      </Card>

      {/* Workspace Details Dialog */}
      <Dialog open={detailsDialog} onClose={() => setDetailsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MeetingRoom color="primary" />
            {t('workspaces.workspaceDetails')}
          </Box>
        </DialogTitle>
        <DialogContent>
          {workspaceDetails && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="h6">{workspaceDetails.workspace.spaceName}</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {workspaceDetails.workspace.description}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">{t('workspaces.owner')}</Typography>
                <Typography variant="body1" gutterBottom>
                  {workspaceDetails.workspace.owner?.businessName || t('common.notAvailable')}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">{t('workspaces.spaceType')}</Typography>
                <Typography variant="body1" gutterBottom>{workspaceDetails.workspace.spaceType}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">{t('workspaces.capacity')}</Typography>
                <Typography variant="body1" gutterBottom>{workspaceDetails.workspace.capacity} {t('common.person')}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">{t('workspaces.pricePerHourLabel')}</Typography>
                <Typography variant="body1" gutterBottom>${workspaceDetails.workspace.pricePerHour}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">{t('workspaces.amenities')}</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                  {workspaceDetails.workspace.amenities?.map((amenity, index) => (
                    <Chip key={index} label={amenity} size="small" />
                  ))}
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">{t('workspaces.recentBookings')}</Typography>
                <Typography variant="body2">{workspaceDetails.recentBookings?.length || 0} {t('common.booking')}</Typography>
              </Grid>

              {workspaceDetails.workspace.status === 'rejected' && (
                <>
                  {workspaceDetails.workspace.statusReason && (
                    <Grid item xs={12}>
                      <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                        <Typography variant="subtitle2" color="text.secondary">{t('workspaces.rejectionReason')}</Typography>
                        <Typography variant="body1" fontWeight="bold" sx={{ mb: 2 }}>
                          {workspaceDetails.workspace.statusReason}
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                  {workspaceDetails.workspace.reviewedBy && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary">{t('workspaces.rejectedBy')}</Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {adminNames[workspaceDetails.workspace.reviewedBy] || t('common.loading')}
                      </Typography>
                    </Grid>
                  )}
                  {workspaceDetails.workspace.updatedAt && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary">{t('workspaces.rejectedDate')}</Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {workspaceDetails.workspace.updatedAt?.toDate?.()?.toLocaleString() || t('common.notAvailable')}
                      </Typography>
                    </Grid>
                  )}
                </>
              )}

              {workspaceDetails.workspace.status === 'deleted' && (
                <>
                  {workspaceDetails.workspace.statusReason && (
                    <Grid item xs={12}>
                      <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                        <Typography variant="subtitle2" color="text.secondary">{t('workspaces.deletionReason')}</Typography>
                        <Typography variant="body1" fontWeight="bold" sx={{ mb: 2 }}>
                          {workspaceDetails.workspace.statusReason}
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                  {workspaceDetails.workspace.deletedBy && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary">{t('workspaces.deletedBy')}</Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {adminNames[workspaceDetails.workspace.deletedBy] || t('common.loading')}
                      </Typography>
                    </Grid>
                  )}
                  {workspaceDetails.workspace.deletedAt && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary">{t('workspaces.deletedDate')}</Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {workspaceDetails.workspace.deletedAt?.toDate?.()?.toLocaleString() || t('common.notAvailable')}
                      </Typography>
                    </Grid>
                  )}
                </>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialog(false)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onClose={handleCloseActionDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionDialog.type === 'delete'
            ? t('workspaces.deleteWorkspace')
            : actionDialog.type === 'active'
            ? t('workspaces.approveWorkspace')
            : t('workspaces.rejectWorkspace')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {actionDialog.type === 'delete'
              ? `${t('common.confirm')} "${selectedWorkspace?.spaceName}"?`
              : actionDialog.type === 'active'
              ? `${t('common.confirm')} "${selectedWorkspace?.spaceName}"?`
              : `${t('common.confirm')} "${selectedWorkspace?.spaceName}"?`}
          </Typography>
          {(actionDialog.type === 'rejected' || actionDialog.type === 'delete') && (
            <TextField
              fullWidth
              multiline
              rows={3}
              label={actionDialog.type === 'rejected' ? t('workspaces.rejectionReason') : t('workspaces.deletionReason')}
              value={actionDialog.reason}
              onChange={(e) => setActionDialog({ ...actionDialog, reason: e.target.value })}
              required={actionDialog.type === 'rejected'}
              margin="normal"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseActionDialog}>{t('common.cancel')}</Button>
          <Button
            onClick={handleAction}
            variant="contained"
            color={actionDialog.type === 'delete' || actionDialog.type === 'rejected' ? 'error' : 'primary'}
          >
            {t('common.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
};

export default Workspaces;
