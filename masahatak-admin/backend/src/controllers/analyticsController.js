const { db, COLLECTIONS } = require('../config/firebase');

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const [
      usersSnapshot,
      providersSnapshot,
      workspacesSnapshot,
      bookingsSnapshot
    ] = await Promise.all([
      db.collection('users').get(),
      db.collection('providers').get(),
      db.collection(COLLECTIONS.SPACES).get(),
      db.collection('bookings').get()
    ]);

    // Calculate stats from existing data
    const activeUsers = usersSnapshot.docs.filter(doc => doc.data().status === 'active').length;
    const activeProviders = providersSnapshot.docs.filter(doc => doc.data().status === 'active').length;
    const activeWorkspaces = workspacesSnapshot.docs.filter(doc => doc.data().status === 'active').length;
    const newUsersThisMonth = 0; // TODO: Calculate based on createdAt

    // Placeholder revenue (will be calculated when payments exist)
    let totalRevenue = 0;
    let monthlyRevenue = 0;

    // Booking statistics
    const completedBookings = bookingsSnapshot.docs.filter(doc => doc.data().status === 'completed').length;
    const upcomingBookings = bookingsSnapshot.docs.filter(doc => doc.data().status === 'upcoming').length;

    res.json({
      success: true,
      totalUsers: usersSnapshot.size,
      totalProviders: providersSnapshot.size,
      activeProviders,
      totalWorkspaces: workspacesSnapshot.size,
      activeWorkspaces,
      newUsersThisMonth,
      totalRevenue,
      monthlyRevenue
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get revenue analytics
exports.getRevenueAnalytics = async (req, res) => {
  try {
    const { period = 'month' } = req.query; // month, quarter, year

    // Return empty data for now since we don't have payments yet
    res.json({
      success: true,
      revenue: [],
      bookings: [
        { status: 'pending', count: 0 },
        { status: 'confirmed', count: 0 },
        { status: 'completed', count: 0 },
        { status: 'cancelled', count: 0 }
      ]
    });
    return;

    /* Original code - will use when payments exist
    const paymentsSnapshot = await db.collection('payments')
      .get();

    const revenueData = {};
    let totalRevenue = 0;

    paymentsSnapshot.forEach(doc => {
      const payment = doc.data();
      const date = payment.createdAt?.toDate() || new Date(payment.createdAt);

      let key;
      if (period === 'month') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else if (period === 'quarter') {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        key = `${date.getFullYear()}-Q${quarter}`;
      } else {
        key = `${date.getFullYear()}`;
      }

      if (!revenueData[key]) {
        revenueData[key] = 0;
      }

      revenueData[key] += payment.amount || 0;
      totalRevenue += payment.amount || 0;
    });

    const chartData = Object.entries(revenueData).map(([period, amount]) => ({
      period,
      amount
    }));

    res.json({
      success: true,
      totalRevenue,
      chartData
    });
    */
  } catch (error) {
    console.error('Get revenue analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get booking analytics
exports.getBookingAnalytics = async (req, res) => {
  try {
    const bookingsSnapshot = await db.collection('bookings').get();

    const statusCounts = {
      upcoming: 0,
      'in-progress': 0,
      completed: 0,
      cancelled: 0
    };

    const planCounts = {
      daily: 0,
      weekly: 0,
      monthly: 0
    };

    bookingsSnapshot.forEach(doc => {
      const booking = doc.data();
      statusCounts[booking.status] = (statusCounts[booking.status] || 0) + 1;
      planCounts[booking.bookingPlan] = (planCounts[booking.bookingPlan] || 0) + 1;
    });

    res.json({
      success: true,
      statusDistribution: statusCounts,
      planDistribution: planCounts
    });
  } catch (error) {
    console.error('Get booking analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get popular workspaces
exports.getPopularWorkspaces = async (req, res) => {
  try {
    // Get all bookings without complex queries
    const bookingsSnapshot = await db.collection('bookings').get();

    const workspaceCounts = {};

    // Filter on client side to avoid index requirement
    bookingsSnapshot.forEach(doc => {
      const booking = doc.data();
      const status = booking.status;

      // Only count active bookings
      if (status === 'completed' || status === 'in-progress' || status === 'upcoming') {
        const workspaceId = booking.workspaceId;
        workspaceCounts[workspaceId] = (workspaceCounts[workspaceId] || 0) + 1;
      }
    });

    // Sort by booking count
    const sortedWorkspaces = Object.entries(workspaceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Get workspace details
    const popularWorkspaces = await Promise.all(
      sortedWorkspaces.map(async ([workspaceId, bookingCount]) => {
        const workspaceDoc = await db.collection(COLLECTIONS.SPACES).doc(workspaceId).get();
        return {
          id: workspaceId,
          spaceName: workspaceDoc.data()?.spaceName || 'Unknown',
          location: workspaceDoc.data()?.location || 'Unknown',
          bookingCount
        };
      })
    );

    res.json({
      success: true,
      workspaces: popularWorkspaces
    });
  } catch (error) {
    console.error('Get popular workspaces error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
