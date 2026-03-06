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
  TextField,
  CircularProgress,
  Alert,
  Tooltip,
  Rating,
  Grid
} from '@mui/material';
import {
  Delete,
  Flag,
  RateReview,
  Person,
  MeetingRoom
} from '@mui/icons-material';
import api from '../utils/api';
import MainLayout from '../components/Layout/MainLayout';

const Reviews = () => {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalReviews, setTotalReviews] = useState(0);
  const [selectedReview, setSelectedReview] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, reason: '' });

  useEffect(() => {
    fetchReviews();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reviews', {
        params: {
          page: page + 1,
          limit: rowsPerPage
        }
      });
      setReviews(response.data.reviews);
      setTotalReviews(response.data.pagination.total);
    } catch (err) {
      setError('Failed to load reviews');
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

  const handleToggleFlag = async (reviewId, currentStatus) => {
    try {
      await api.put(`/reviews/${reviewId}/flag`, {
        flag: !currentStatus
      });
      fetchReviews();
    } catch (err) {
      setError('Failed to update review flag');
      console.error(err);
    }
  };

  const handleOpenDeleteDialog = (review) => {
    setSelectedReview(review);
    setDeleteDialog({ open: true, reason: '' });
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialog({ open: false, reason: '' });
    setSelectedReview(null);
  };

  const handleDeleteReview = async () => {
    try {
      await api.delete(`/reviews/${selectedReview.id}`, {
        data: { reason: deleteDialog.reason }
      });
      handleCloseDeleteDialog();
      fetchReviews();
    } catch (err) {
      setError('Failed to delete review');
      console.error(err);
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
    return date.toLocaleDateString();
  };

  return (
    <MainLayout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          {t('reviews.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('reviews.subtitle')}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card elevation={2}>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('reviews.user')}</TableCell>
                  <TableCell>{t('reviews.workspace')}</TableCell>
                  <TableCell>{t('reviews.rating')}</TableCell>
                  <TableCell>{t('reviews.review')}</TableCell>
                  <TableCell>{t('reviews.date')}</TableCell>
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
                ) : reviews.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">{t('reviews.noReviews')}</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  reviews.map((review) => (
                    <TableRow key={review.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Person fontSize="small" color="action" />
                          {review.user?.fullName || 'N/A'}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <MeetingRoom fontSize="small" color="action" />
                          {review.workspace?.spaceName || 'N/A'}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Rating value={review.rating || 0} readOnly size="small" />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 300,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {review.comment || t('reviews.noComment')}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatDate(review.createdAt)}</TableCell>
                      <TableCell>
                        {review.flagged ? (
                          <Chip label={t('reviews.flagged')} color="error" size="small" />
                        ) : (
                          <Chip label={t('common.active')} color="success" size="small" />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title={review.flagged ? t('reviews.unflagReview') : t('reviews.flagReview')}>
                          <IconButton
                            size="small"
                            color={review.flagged ? 'error' : 'default'}
                            onClick={() => handleToggleFlag(review.id, review.flagged)}
                          >
                            <Flag fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('reviews.deleteReview')}>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleOpenDeleteDialog(review)}
                          >
                            <Delete fontSize="small" />
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
            count={totalReviews}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </CardContent>
      </Card>

      {/* Delete Review Dialog */}
      <Dialog open={deleteDialog.open} onClose={handleCloseDeleteDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <RateReview color="error" />
            {t('reviews.deleteReview')}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {t('reviews.confirmDelete')}
          </Typography>
          {selectedReview && (
            <Card variant="outlined" sx={{ mb: 2, p: 2 }}>
              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <Rating value={selectedReview.rating} readOnly size="small" />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2">{selectedReview.comment}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    By {selectedReview.user?.fullName} on {formatDate(selectedReview.createdAt)}
                  </Typography>
                </Grid>
              </Grid>
            </Card>
          )}
          <TextField
            fullWidth
            multiline
            rows={3}
            label={t('reviews.deletionReason')}
            value={deleteDialog.reason}
            onChange={(e) => setDeleteDialog({ ...deleteDialog, reason: e.target.value })}
            margin="normal"
            placeholder={t('reviews.deletionReasonPlaceholder')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>{t('common.cancel')}</Button>
          <Button onClick={handleDeleteReview} variant="contained" color="error">
            {t('reviews.deleteReview')}
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
};

export default Reviews;
