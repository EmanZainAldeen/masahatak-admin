const { db, auth, COLLECTIONS } = require('../config/firebase');

// Get all providers (workspace owners/managers from users collection)
exports.getAllProviders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'all' } = req.query;

    // Fetch space owners from users collection (roles: admin, owner, provider — sub_admin are Assistants)
    const ownerRoles = ['admin', 'owner', 'provider'];
    const snapshots = await Promise.all(
      ownerRoles.map(role => db.collection('users').where('role', '==', role).get())
    );

    let providers = [];
    const seen = new Set();
    snapshots.forEach(snap => {
      snap.docs.forEach(doc => {
        if (!seen.has(doc.id)) {
          seen.add(doc.id);
          providers.push({ id: doc.id, ...doc.data() });
        }
      });
    });

    // Filter by status if provided
    if (status !== 'all') {
      providers = providers.filter(p => (p.status || 'active') === status);
    }

    // Remove passwords
    providers = providers.map(({ password, ...p }) => p);

    // Get workspace counts for each provider
    const providersWithStats = await Promise.all(
      providers.map(async (provider) => {
        const workspacesSnapshot = await db.collection(COLLECTIONS.SPACES)
          .where('adminId', '==', provider.id)
          .get();
        return { ...provider, workspaceCount: workspacesSnapshot.size };
      })
    );

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const paginated = providersWithStats.slice(startIndex, startIndex + parseInt(limit));

    res.json({
      success: true,
      providers: paginated,
      pagination: {
        total: providersWithStats.length,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(providersWithStats.length / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get provider by ID
exports.getProviderById = async (req, res) => {
  try {
    const { id } = req.params;

    const providerDoc = await db.collection('providers').doc(id).get();

    if (!providerDoc.exists) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    // Get provider's workspaces
    const workspacesSnapshot = await db.collection(COLLECTIONS.SPACES)
      .where('ownerId', '==', id)
      .get();

    const workspaces = workspacesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get total bookings and revenue
    let totalBookings = 0;
    let totalRevenue = 0;

    for (const workspace of workspaces) {
      const bookingsSnapshot = await db.collection('bookings')
        .where('workspaceId', '==', workspace.id)
        .where('status', '==', 'completed')
        .get();

      totalBookings += bookingsSnapshot.size;

      bookingsSnapshot.forEach(doc => {
        totalRevenue += doc.data().totalAmount || 0;
      });
    }

    res.json({
      success: true,
      provider: {
        id: providerDoc.id,
        ...providerDoc.data()
      },
      workspaces,
      stats: {
        totalWorkspaces: workspaces.length,
        totalBookings,
        totalRevenue
      }
    });
  } catch (error) {
    console.error('Get provider error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update provider status
exports.updateProviderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    await db.collection('providers').doc(id).update({
      status,
      statusReason: reason || '',
      updatedAt: new Date(),
      updatedBy: req.admin.id
    });

    // Disable/enable auth
    try {
      if (status === 'suspended') {
        await auth.updateUser(id, { disabled: true });
      } else if (status === 'active') {
        await auth.updateUser(id, { disabled: false });
      }
    } catch (authError) {
      console.log('Provider not found in Firebase Auth, updating Firestore only:', id);
    }

    res.json({
      success: true,
      message: `Provider ${status} successfully`
    });
  } catch (error) {
    console.error('Update provider status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete provider
exports.deleteProvider = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    console.log('Delete provider request:', { id, reason, adminId: req.admin.id });

    const updateData = {
      status: 'deleted',
      statusReason: reason || '',
      deletedAt: new Date(),
      deletedBy: req.admin.id
    };

    console.log('Updating provider with:', updateData);

    await db.collection('providers').doc(id).update(updateData);

    console.log('Provider deleted successfully:', id);

    try {
      await auth.updateUser(id, { disabled: true });
    } catch (authError) {
      console.log('Provider not found in Firebase Auth, updating Firestore only:', id);
    }

    res.json({
      success: true,
      message: 'Provider deleted successfully'
    });
  } catch (error) {
    console.error('Delete provider error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
