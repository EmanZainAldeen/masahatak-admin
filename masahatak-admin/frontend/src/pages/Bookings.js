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
  Cancel,
  FilterList,
  EventAvailable,
  Person,
  MeetingRoom
} from '@mui/icons-material';
import api from '../utils/api';
import MainLayout from '../components/Layout/MainLayout';

const Bookings = () => {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalBookings, setTotalBookings] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [cancelDialog, setCancelDialog] = useState({ open: false, reason: '' });
  const [bookingDetails, setBookingDetails] = useState(null);

  useEffect(() => {
    fetchBookings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, statusFilter]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/bookings', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          status: statusFilter
        }
      });
      setBookings(response.data.bookings);
      setTotalBookings(response.data.pagination.total);
    } catch (err) {
      setError('Failed to load bookings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookingDetails = async (bookingId) => {
    try {
      const response = await api.get(`/bookings/${bookingId}`);
      setBookingDetails(response.data.booking);
      setDetailsDialog(true);
    } catch (err) {
      setError('Failed to load booking details');
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

  const handleOpenCancelDialog = (booking) => {
    setSelectedBooking(booking);
    setCancelDialog({ open: true, reason: '' });
  };

  const handleCloseCancelDialog = () => {
    setCancelDialog({ open: false, reason: '' });
    setSelectedBooking(null);
  };

  const handleCancelBooking = async () => {
    try {
      await api.put(`/bookings/${selectedBooking.id}/cancel`, {
        reason: cancelDialog.reason
      });
      handleCloseCancelDialog();
      fetchBookings();
    } catch (err) {
      setError('Failed to cancel booking');
      console.error(err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'completed':
        return 'info';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <MainLayout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          {t('bookings.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('bookings.subtitle')}
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
              <InputLabel>{t('bookings.statusFilter')}</InputLabel>
              <Select
                value={statusFilter}
                label={t('bookings.statusFilter')}
                onChange={(e) => setStatusFilter(e.target.value)}
                startAdornment={<FilterList sx={{ mr: 1, ml: 1 }} />}
              >
                <MenuItem value="all">{t('bookings.allBookings')}</MenuItem>
                <MenuItem value="pending">{t('common.pending')}</MenuItem>
                <MenuItem value="confirmed">{t('bookings.confirmed')}</MenuItem>
                <MenuItem value="completed">{t('bookings.completed')}</MenuItem>
                <MenuItem value="cancelled">{t('bookings.cancelled')}</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('bookings.bookingId')}</TableCell>
                  <TableCell>{t('bookings.user')}</TableCell>
                  <TableCell>{t('bookings.workspace')}</TableCell>
                  <TableCell>{t('bookings.startDate')}</TableCell>
                  <TableCell>{t('bookings.endDate')}</TableCell>
                  <TableCell>{t('bookings.amount')}</TableCell>
                  <TableCell>{t('common.status')}</TableCell>
                  <TableCell align="center">{t('common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : bookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No bookings found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  bookings.map((booking) => (
                    <TableRow key={booking.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {booking.id.substring(0, 8)}...
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Person fontSize="small" color="action" />
                          {booking.user?.fullName || 'N/A'}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <MeetingRoom fontSize="small" color="action" />
                          {booking.workspace?.spaceName || 'N/A'}
                        </Box>
                      </TableCell>
                      <TableCell>{formatDate(booking.startDate)}</TableCell>
                      <TableCell>{formatDate(booking.endDate)}</TableCell>
                      <TableCell>${booking.totalAmount || 0}</TableCell>
                      <TableCell>
                        <Chip
                          label={booking.status || 'pending'}
                          color={getStatusColor(booking.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => fetchBookingDetails(booking.id)}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                          <Tooltip title="Cancel Booking">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleOpenCancelDialog(booking)}
                            >
                              <Cancel fontSize="small" />
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
            count={totalBookings}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </CardContent>
      </Card>

      {/* Booking Details Dialog */}
      <Dialog open={detailsDialog} onClose={() => setDetailsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EventAvailable color="primary" />
            Booking Details
          </Box>
        </DialogTitle>
        <DialogContent>
          {bookingDetails && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Booking ID</Typography>
                <Typography variant="body1" fontFamily="monospace" gutterBottom>
                  {bookingDetails.id}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">User</Typography>
                <Typography variant="body1" gutterBottom>
                  {bookingDetails.user?.fullName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {bookingDetails.user?.email}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Workspace</Typography>
                <Typography variant="body1" gutterBottom>
                  {bookingDetails.workspace?.spaceName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {bookingDetails.workspace?.location?.city}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Start Date & Time</Typography>
                <Typography variant="body1" gutterBottom>
                  {formatDate(bookingDetails.startDate)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">End Date & Time</Typography>
                <Typography variant="body1" gutterBottom>
                  {formatDate(bookingDetails.endDate)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Total Amount</Typography>
                <Typography variant="h6" color="primary" gutterBottom>
                  ${bookingDetails.totalAmount}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                <Chip
                  label={bookingDetails.status}
                  color={getStatusColor(bookingDetails.status)}
                  sx={{ mt: 0.5 }}
                />
              </Grid>
              {bookingDetails.payment && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Payment Information</Typography>
                  <Typography variant="body2">
                    Method: {bookingDetails.payment.paymentMethod}
                  </Typography>
                  <Typography variant="body2">
                    Status: {bookingDetails.payment.status}
                  </Typography>
                </Grid>
              )}
              {bookingDetails.cancellationReason && (
                <Grid item xs={12}>
                  <Alert severity="warning">
                    <Typography variant="subtitle2">Cancellation Reason:</Typography>
                    <Typography variant="body2">{bookingDetails.cancellationReason}</Typography>
                  </Alert>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Booking Dialog */}
      <Dialog open={cancelDialog.open} onClose={handleCloseCancelDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Cancel Booking</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Are you sure you want to cancel this booking? This action cannot be undone.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Cancellation Reason"
            value={cancelDialog.reason}
            onChange={(e) => setCancelDialog({ ...cancelDialog, reason: e.target.value })}
            margin="normal"
            placeholder="Enter reason for cancellation..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCancelDialog}>Cancel</Button>
          <Button onClick={handleCancelBooking} variant="contained" color="error">
            Confirm Cancellation
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
};

export default Bookings;
