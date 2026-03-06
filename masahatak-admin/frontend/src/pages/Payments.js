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
  TextField,
  MenuItem,
  Grid,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tooltip
} from '@mui/material';
import { Visibility, Payment as PaymentIcon } from '@mui/icons-material';
import api from '../utils/api';
import MainLayout from '../components/Layout/MainLayout';

const Payments = () => {
  const { t } = useTranslation();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPayments, setTotalPayments] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  useEffect(() => {
    fetchPayments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, statusFilter]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = {
        page: page + 1,
        limit: rowsPerPage
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await api.get('/payments', { params });
      setPayments(response.data.payments || []);
      setTotalPayments(response.data.pagination?.total || 0);
    } catch (err) {
      setError('Failed to load payments');
      console.error(err);
    } finally {
      setLoading(false);
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
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      case 'refunded':
        return 'info';
      default:
        return 'default';
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

  const formatCurrency = (amount) => {
    return `$${(amount || 0).toLocaleString()}`;
  };

  const handleViewDetails = async (paymentId) => {
    try {
      const response = await api.get(`/payments/${paymentId}`);
      setSelectedPayment(response.data.payment);
      setDetailsDialog(true);
    } catch (err) {
      setError('Failed to load payment details');
      console.error(err);
    }
  };

  if (loading && payments.length === 0) {
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
          {t('payments.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('payments.subtitle')}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Card elevation={2}>
        <CardContent>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                label={t('payments.statusFilter')}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="all">{t('payments.allStatus')}</MenuItem>
                <MenuItem value="pending">{t('common.pending')}</MenuItem>
                <MenuItem value="completed">{t('payments.completed')}</MenuItem>
                <MenuItem value="failed">{t('payments.failed')}</MenuItem>
                <MenuItem value="refunded">{t('payments.refunded')}</MenuItem>
              </TextField>
            </Grid>
          </Grid>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('payments.paymentId')}</TableCell>
                  <TableCell>{t('payments.bookingId')}</TableCell>
                  <TableCell>{t('payments.amount')}</TableCell>
                  <TableCell>{t('common.status')}</TableCell>
                  <TableCell>{t('payments.date')}</TableCell>
                  <TableCell>{t('common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary">
                        {t('payments.noPayments')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment) => (
                    <TableRow key={payment.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {payment.id?.substring(0, 8)}...
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {payment.bookingId?.substring(0, 8)}...
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(payment.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={payment.status}
                          color={getStatusColor(payment.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(payment.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleViewDetails(payment.id)}
                          >
                            <Visibility fontSize="small" />
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
            component="div"
            count={totalPayments}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </CardContent>
      </Card>

      {/* Payment Details Dialog */}
      <Dialog open={detailsDialog} onClose={() => setDetailsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PaymentIcon color="primary" />
            Payment Details
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedPayment && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Payment ID</Typography>
                <Typography variant="body1" fontFamily="monospace" gutterBottom>
                  {selectedPayment.id}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Booking ID</Typography>
                <Typography variant="body1" fontFamily="monospace" gutterBottom>
                  {selectedPayment.bookingId}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">User ID</Typography>
                <Typography variant="body1" fontFamily="monospace" gutterBottom>
                  {selectedPayment.userId}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Amount</Typography>
                <Typography variant="h6" color="primary" gutterBottom>
                  {formatCurrency(selectedPayment.amount)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Currency</Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedPayment.currency || 'USD'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                <Chip
                  label={selectedPayment.status}
                  color={getStatusColor(selectedPayment.status)}
                  sx={{ mt: 0.5 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Payment Method</Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedPayment.paymentMethod || 'N/A'}
                </Typography>
              </Grid>
              {selectedPayment.transactionId && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Transaction ID</Typography>
                  <Typography variant="body1" fontFamily="monospace" gutterBottom>
                    {selectedPayment.transactionId}
                  </Typography>
                </Grid>
              )}
              {selectedPayment.refundTransactionId && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Refund Transaction ID</Typography>
                  <Typography variant="body1" fontFamily="monospace" gutterBottom>
                    {selectedPayment.refundTransactionId}
                  </Typography>
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Created At</Typography>
                <Typography variant="body1" gutterBottom>
                  {formatDate(selectedPayment.createdAt)}
                </Typography>
              </Grid>
              {selectedPayment.completedAt && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Completed At</Typography>
                  <Typography variant="body1" gutterBottom>
                    {formatDate(selectedPayment.completedAt)}
                  </Typography>
                </Grid>
              )}
              {selectedPayment.refundedAt && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Refunded At</Typography>
                  <Typography variant="body1" gutterBottom>
                    {formatDate(selectedPayment.refundedAt)}
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
};

export default Payments;
