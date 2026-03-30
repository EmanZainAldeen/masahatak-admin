import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Card, CardContent, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, Chip,
  IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, CircularProgress, Alert, Grid, Tooltip, Divider
} from '@mui/material';
import {
  Visibility, Delete, CheckCircle, Cancel, Phone, WhatsApp,
  LocationOn, Person, AttachMoney, People, Schedule, AddBusiness
} from '@mui/icons-material';
import api from '../utils/api';
import MainLayout from '../components/Layout/MainLayout';

const statusColor = { pending: 'warning', approved: 'success', rejected: 'error' };

const RequestAddSpace = () => {
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [actionDialog, setActionDialog] = useState({ open: false, type: '', adminNote: '' });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });

  useEffect(() => {
    fetchRequests();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/request-spaces', {
        params: { page: page + 1, limit: rowsPerPage }
      });
      setRequests(res.data.requests || []);
      setTotal(res.data.pagination?.total || 0);
    } catch (err) {
      setError('Failed to load space requests');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setDetailsOpen(true);
  };

  const handleOpenAction = (type) => {
    setActionDialog({ open: true, type, adminNote: '' });
  };

  const handleConfirmAction = async () => {
    try {
      await api.put(`/request-spaces/${selectedRequest.idRequset}/status`, {
        status: actionDialog.type,
        adminNote: actionDialog.adminNote
      });
      setSuccess(`Request ${actionDialog.type} successfully`);
      setActionDialog({ open: false, type: '', adminNote: '' });
      setDetailsOpen(false);
      fetchRequests();
    } catch {
      setError('Failed to update request');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/request-spaces/${deleteDialog.id}`);
      setSuccess('Request deleted');
      setDeleteDialog({ open: false, id: null });
      fetchRequests();
    } catch {
      setError('Failed to delete request');
    }
  };

  return (
    <MainLayout>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <AddBusiness sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" fontWeight="bold">Request Add Space</Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Manage workspace addition requests from owners
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Card elevation={2}>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell><strong>Space Name</strong></TableCell>
                      <TableCell><strong>Contact Name</strong></TableCell>
                      <TableCell><strong>Phone</strong></TableCell>
                      <TableCell><strong>Location</strong></TableCell>
                      <TableCell><strong>Price/Day</strong></TableCell>
                      <TableCell><strong>Capacity</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell align="center"><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                          No requests found
                        </TableCell>
                      </TableRow>
                    ) : (
                      requests.map((req) => (
                        <TableRow key={req.idRequset} hover>
                          <TableCell>
                            <Typography fontWeight={600}>{req.nameSpace || '—'}</Typography>
                          </TableCell>
                          <TableCell>{req.contactName || '—'}</TableCell>
                          <TableCell>{req.phoneNo || '—'}</TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {req.locationDes || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>{req.pricePerDay ? `${req.pricePerDay} SAR` : '—'}</TableCell>
                          <TableCell>{req.capacity || '—'}</TableCell>
                          <TableCell>
                            <Chip
                              label={req.status || 'pending'}
                              color={statusColor[req.status] || 'warning'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="View Details">
                              <IconButton size="small" color="primary" onClick={() => handleViewDetails(req)}>
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, id: req.idRequset })}>
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={total}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Request Details
          <Chip
            label={selectedRequest?.status || 'pending'}
            color={statusColor[selectedRequest?.status] || 'warning'}
            size="small"
          />
        </DialogTitle>
        <DialogContent dividers>
          {selectedRequest && (
            <Grid container spacing={2}>
              {/* Space Info */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                  Space Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AddBusiness color="action" fontSize="small" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Space Name</Typography>
                    <Typography fontWeight={600}>{selectedRequest.nameSpace || '—'}</Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationOn color="action" fontSize="small" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Location</Typography>
                    <Typography>{selectedRequest.locationDes || '—'}</Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Description</Typography>
                  <Typography>{selectedRequest.descriptionSpace || '—'}</Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AttachMoney color="action" fontSize="small" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Price Per Day</Typography>
                    <Typography fontWeight={600}>{selectedRequest.pricePerDay ? `${selectedRequest.pricePerDay} SAR` : '—'}</Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <People color="action" fontSize="small" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Capacity</Typography>
                    <Typography>{selectedRequest.capacity || '—'}</Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Schedule color="action" fontSize="small" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Working Hours</Typography>
                    <Typography>{selectedRequest.workingHours || '—'}</Typography>
                  </Box>
                </Box>
              </Grid>

              {/* Contact Info */}
              <Grid item xs={12} sx={{ mt: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                  Contact Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              <Grid item xs={12} sm={4}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Person color="action" fontSize="small" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Contact Name</Typography>
                    <Typography>{selectedRequest.contactName || '—'}</Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Phone color="action" fontSize="small" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Phone</Typography>
                    <Typography>{selectedRequest.phoneNo || '—'}</Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WhatsApp color="action" fontSize="small" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">WhatsApp</Typography>
                    <Typography>{selectedRequest.whatsAppNo || '—'}</Typography>
                  </Box>
                </Box>
              </Grid>

              {selectedRequest.adminNote && (
                <Grid item xs={12} sx={{ mt: 1 }}>
                  <Alert severity={selectedRequest.status === 'approved' ? 'success' : 'error'}>
                    <strong>Admin Note:</strong> {selectedRequest.adminNote}
                  </Alert>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          {selectedRequest?.status === 'pending' && (
            <>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircle />}
                onClick={() => handleOpenAction('approved')}
              >
                Approve
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<Cancel />}
                onClick={() => handleOpenAction('rejected')}
              >
                Reject
              </Button>
            </>
          )}
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Approve / Reject Confirmation Dialog */}
      <Dialog open={actionDialog.open} onClose={() => setActionDialog({ open: false, type: '', adminNote: '' })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', color: actionDialog.type === 'approved' ? 'success.main' : 'error.main' }}>
          {actionDialog.type === 'approved' ? 'Approve Request' : 'Reject Request'}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to {actionDialog.type === 'approved' ? 'approve' : 'reject'} this space request?
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Admin Note (optional)"
            value={actionDialog.adminNote}
            onChange={(e) => setActionDialog(prev => ({ ...prev, adminNote: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog({ open: false, type: '', adminNote: '' })}>Cancel</Button>
          <Button
            variant="contained"
            color={actionDialog.type === 'approved' ? 'success' : 'error'}
            onClick={handleConfirmAction}
          >
            Confirm {actionDialog.type === 'approved' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null })}>
        <DialogTitle>Delete Request</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this request? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, id: null })}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
};

export default RequestAddSpace;
