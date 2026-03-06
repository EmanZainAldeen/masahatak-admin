import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import {
  TrendingUp,
  EventAvailable,
  AttachMoney,
  Star
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import api from '../utils/api';
import MainLayout from '../components/Layout/MainLayout';

const Analytics = () => {
  const [revenueData, setRevenueData] = useState([]);
  const [bookingStats, setBookingStats] = useState([]);
  const [popularWorkspaces, setPopularWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    fetchAnalytics();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [revenueRes, , workspacesRes] = await Promise.all([
        api.get(`/analytics/revenue?period=${period}`),
        api.get('/analytics/bookings'),
        api.get('/analytics/popular-workspaces?limit=10')
      ]);

      setRevenueData(revenueRes.data.revenue || []);
      setBookingStats(revenueRes.data.bookings || []);
      setPopularWorkspaces(workspacesRes.data.workspaces || []);
    } catch (err) {
      setError('Failed to load analytics data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#5B7DB1', '#F8A14D', '#4CAF50', '#F44336', '#9C27B0', '#00BCD4'];

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <Alert severity="error">{error}</Alert>
      </MainLayout>
    );
  }

  const totalRevenue = revenueData.reduce((sum, item) => sum + (item.revenue || 0), 0);
  const totalBookings = revenueData.reduce((sum, item) => sum + (item.bookings || 0), 0);
  const avgBookingValue = totalBookings > 0 ? (totalRevenue / totalBookings).toFixed(2) : 0;

  return (
    <MainLayout>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Analytics
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Detailed insights and performance metrics
          </Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Period</InputLabel>
          <Select
            value={period}
            label="Period"
            onChange={(e) => setPeriod(e.target.value)}
          >
            <MenuItem value="month">Monthly</MenuItem>
            <MenuItem value="quarter">Quarterly</MenuItem>
            <MenuItem value="year">Yearly</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    backgroundColor: '#5B7DB115',
                    borderRadius: 2,
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <AttachMoney sx={{ fontSize: 32, color: '#5B7DB1' }} />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Revenue
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    ${totalRevenue.toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    backgroundColor: '#F8A14D15',
                    borderRadius: 2,
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <EventAvailable sx={{ fontSize: 32, color: '#F8A14D' }} />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Bookings
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {totalBookings.toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    backgroundColor: '#4CAF5015',
                    borderRadius: 2,
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <TrendingUp sx={{ fontSize: 32, color: '#4CAF50' }} />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Avg. Booking Value
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    ${avgBookingValue}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Revenue Trend Chart */}
        <Grid item xs={12} md={8}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Revenue & Booking Trends
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {period === 'month' ? 'Monthly' : period === 'quarter' ? 'Quarterly' : 'Yearly'} performance overview
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#5B7DB1"
                    strokeWidth={3}
                    name="Revenue ($)"
                    dot={{ r: 4 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="bookings"
                    stroke="#F8A14D"
                    strokeWidth={3}
                    name="Bookings"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Booking Status Distribution */}
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Booking Status
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Distribution by status
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={bookingStats}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.status}: ${entry.count}`}
                  >
                    {bookingStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Popular Workspaces Chart */}
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Top Performing Workspaces
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Most booked workspaces and revenue generated
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={popularWorkspaces}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="spaceName" angle={-45} textAnchor="end" height={100} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="bookingCount"
                    fill="#5B7DB1"
                    name="Total Bookings"
                    radius={[8, 8, 0, 0]}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="revenue"
                    fill="#F8A14D"
                    name="Revenue ($)"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Popular Workspaces Table */}
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Workspace Performance Details
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Rank</TableCell>
                      <TableCell>Workspace Name</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell align="right">Total Bookings</TableCell>
                      <TableCell align="right">Total Revenue</TableCell>
                      <TableCell align="right">Avg. Rating</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {popularWorkspaces.map((workspace, index) => (
                      <TableRow key={workspace.id} hover>
                        <TableCell>
                          <Chip
                            label={`#${index + 1}`}
                            color={index === 0 ? 'primary' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{workspace.spaceName}</TableCell>
                        <TableCell>{workspace.location?.city || 'N/A'}</TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="bold">
                            {workspace.bookingCount}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="bold" color="primary">
                            ${workspace.revenue?.toLocaleString() || 0}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                            <Star fontSize="small" sx={{ color: '#F8A14D' }} />
                            <Typography variant="body2">
                              {workspace.avgRating?.toFixed(1) || 'N/A'}
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </MainLayout>
  );
};

export default Analytics;
