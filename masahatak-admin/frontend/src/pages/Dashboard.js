import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  People,
  Business,
  MeetingRoom,
  AttachMoney,
} from '@mui/icons-material';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../utils/api';
import MainLayout from '../components/Layout/MainLayout';

const StatCard = ({ title, value, icon, color, subtitle }) => (
  <Card elevation={2}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            backgroundColor: `${color}15`,
            borderRadius: 2,
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {React.cloneElement(icon, { sx: { fontSize: 32, color } })}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [bookingStats, setBookingStats] = useState([]);
  const [popularWorkspaces, setPopularWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, revenueRes, , workspacesRes] = await Promise.all([
        api.get('/analytics/dashboard-stats'),
        api.get('/analytics/revenue?period=month'),
        api.get('/analytics/bookings'),
        api.get('/analytics/popular-workspaces?limit=5')
      ]);

      setStats(statsRes.data);
      setRevenueData(revenueRes.data.revenue || []);
      setBookingStats(revenueRes.data.bookings || []);
      setPopularWorkspaces(workspacesRes.data.workspaces || []);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#5B7DB1', '#F8A14D', '#4CAF50', '#F44336', '#9C27B0'];

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

  return (
    <MainLayout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          {t('dashboard.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('dashboard.subtitle')}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.totalUsers')}
            value={stats?.totalUsers || 0}
            icon={<People />}
            color="#5B7DB1"
            subtitle={`${stats?.newUsersThisMonth || 0} ${t('dashboard.newThisMonth')}`}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.totalProviders')}
            value={stats?.totalProviders || 0}
            icon={<Business />}
            color="#F8A14D"
            subtitle={`${stats?.activeProviders || 0} ${t('common.active')}`}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.totalWorkspaces')}
            value={stats?.totalWorkspaces || 0}
            icon={<MeetingRoom />}
            color="#4CAF50"
            subtitle={`${stats?.activeWorkspaces || 0} ${t('common.active')}`}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.totalRevenue')}
            value={`$${(stats?.totalRevenue || 0).toLocaleString()}`}
            icon={<AttachMoney />}
            color="#9C27B0"
            subtitle={`$${(stats?.monthlyRevenue || 0).toLocaleString()} ${t('dashboard.thisMonth')}`}
          />
        </Grid>

        <Grid item xs={12} md={8}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                {t('dashboard.revenueOverview')}
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#5B7DB1" strokeWidth={2} name={`${t('dashboard.revenue')} ($)`} />
                  <Line type="monotone" dataKey="bookings" stroke="#F8A14D" strokeWidth={2} name={t('nav.bookings')} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                {t('dashboard.bookingStatus')}
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={bookingStats}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {bookingStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                {t('dashboard.popularWorkspaces')}
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={popularWorkspaces}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="spaceName" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="bookingCount" fill="#5B7DB1" name={t('dashboard.totalBookings')} />
                  <Bar dataKey="revenue" fill="#F8A14D" name={`${t('dashboard.revenue')} ($)`} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </MainLayout>
  );
};

export default Dashboard;
