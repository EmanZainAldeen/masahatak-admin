const { db, COLLECTIONS } = require('../config/firebase');

// Get all workspaces
exports.getAllWorkspaces = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'all' } = req.query;

    let query = db.collection(COLLECTIONS.SPACES);

    if (status !== 'all') {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.get();
    let workspaces = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedWorkspaces = workspaces.slice(startIndex, endIndex);

    res.json({
      success: true,
      workspaces: paginatedWorkspaces,
      pagination: {
        total: workspaces.length,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(workspaces.length / limit)
      }
    });
  } catch (error) {
    console.error('Get workspaces error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get workspace by ID
exports.getWorkspaceById = async (req, res) => {
  try {
    const { id } = req.params;

    const workspaceDoc = await db.collection(COLLECTIONS.SPACES).doc(id).get();

    if (!workspaceDoc.exists) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Get owner details
    let owner = null;
    if (workspaceDoc.data().ownerId) {
      try {
        const ownerDoc = await db.collection('providers').doc(workspaceDoc.data().ownerId).get();
        if (ownerDoc.exists) {
          owner = {
            id: ownerDoc.id,
            businessName: ownerDoc.data().businessName,
            email: ownerDoc.data().email
          };
        }
      } catch (ownerError) {
        console.log('Could not fetch owner:', ownerError.message);
      }
    }

    // Get recent bookings (without orderBy to avoid index requirement)
    let bookings = [];
    try {
      const bookingsSnapshot = await db.collection('bookings')
        .where('workspaceId', '==', id)
        .limit(10)
        .get();

      bookings = bookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort in memory by createdAt
      bookings.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
    } catch (bookingError) {
      console.log('Could not fetch bookings:', bookingError.message);
      bookings = [];
    }

    res.json({
      success: true,
      workspace: {
        id: workspaceDoc.id,
        ...workspaceDoc.data(),
        owner
      },
      recentBookings: bookings
    });
  } catch (error) {
    console.error('Get workspace error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Approve/reject workspace
exports.updateWorkspaceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    const updateData = {
      status,
      updatedAt: new Date(),
      reviewedBy: req.admin.id
    };

    // Store reason for rejection or other status changes
    if (rejectionReason) {
      updateData.statusReason = rejectionReason;
      // Keep rejectionReason for backwards compatibility
      updateData.rejectionReason = rejectionReason;
    }

    await db.collection(COLLECTIONS.SPACES).doc(id).update(updateData);

    res.json({
      success: true,
      message: `Workspace ${status} successfully`
    });
  } catch (error) {
    console.error('Update workspace status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Create workspace (admin-initiated)
exports.createWorkspace = async (req, res) => {
  try {
    const { spaceName, name, address, description, basePriceValue, basePriceUnit,
      location, lat, lng, workingHours, policySections, amenities, images,
      hidden, totalSeats, adminId, adminName } = req.body;

    const spName = spaceName || name || '';
    const seats = parseInt(totalSeats) || 0;
    const resolvedLocation = location || (lat != null && lng != null ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null);

    const data = {
      spaceName: spName,
      name: spName,
      address: address || '',
      description: description || '',
      basePriceValue: parseFloat(basePriceValue) || 0,
      basePriceUnit: basePriceUnit || 'day',
      location: resolvedLocation,
      workingHours: workingHours || [],
      policySections: policySections || [],
      amenities: amenities || [],
      images: images || [],
      hidden: hidden === true || hidden === 'true',
      totalSeats: seats,
      availableSeats: seats,
      adminId: adminId || null,
      adminName: adminName || null,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req.admin.id,
    };

    const docRef = await db.collection(COLLECTIONS.SPACES).add(data);

    if (adminId) {
      try {
        const adminDoc = await db.collection('users').doc(adminId).get();
        if (adminDoc.exists) {
          const ids = Array.from(new Set([...(adminDoc.data().assignedSpaceIds || []), docRef.id]));
          await db.collection('users').doc(adminId).update({ assignedSpaceIds: ids });
        }
      } catch (_) {}
    }

    res.json({ success: true, id: docRef.id });
  } catch (error) {
    console.error('Create workspace error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update workspace
exports.updateWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    const { spaceName, name, address, description, basePriceValue, basePriceUnit,
      location, lat, lng, workingHours, policySections, amenities, images,
      hidden, totalSeats, adminId, adminName } = req.body;

    const oldDoc = await db.collection(COLLECTIONS.SPACES).doc(id).get();
    const oldAdminId = oldDoc.exists ? oldDoc.data().adminId : null;
    const spName = spaceName || name || '';
    const resolvedLocation = location || (lat != null && lng != null ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null);

    const data = {
      spaceName: spName,
      name: spName,
      address: address || '',
      description: description || '',
      basePriceValue: parseFloat(basePriceValue) || 0,
      basePriceUnit: basePriceUnit || 'day',
      location: resolvedLocation,
      workingHours: workingHours || [],
      policySections: policySections || [],
      amenities: amenities || [],
      images: images || [],
      hidden: hidden === true || hidden === 'true',
      totalSeats: parseInt(totalSeats) || 0,
      adminId: adminId || null,
      adminName: adminName || null,
      updatedAt: new Date(),
    };

    await db.collection(COLLECTIONS.SPACES).doc(id).set(data, { merge: true });

    if (oldAdminId !== adminId) {
      if (oldAdminId) {
        try {
          const oldAdmin = await db.collection('users').doc(oldAdminId).get();
          if (oldAdmin.exists) {
            const ids = (oldAdmin.data().assignedSpaceIds || []).filter(s => s !== id);
            await db.collection('users').doc(oldAdminId).update({ assignedSpaceIds: ids });
          }
        } catch (_) {}
      }
      if (adminId) {
        try {
          const newAdmin = await db.collection('users').doc(adminId).get();
          if (newAdmin.exists) {
            const ids = Array.from(new Set([...(newAdmin.data().assignedSpaceIds || []), id]));
            await db.collection('users').doc(adminId).update({ assignedSpaceIds: ids });
          }
        } catch (_) {}
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update workspace error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get sub admins list for dropdown
exports.getSubAdmins = async (req, res) => {
  try {
    const snap = await db.collection('users').where('role', '==', 'sub_admin').get();
    const subAdmins = snap.docs.map(doc => ({
      id: doc.id,
      fullName: doc.data().fullName || doc.data().full_name || 'Unknown',
      email: doc.data().email || '',
    }));
    res.json({ success: true, subAdmins });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete workspace
exports.deleteWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Save audit record before deleting
    const wsDoc = await db.collection(COLLECTIONS.SPACES).doc(id).get();
    if (wsDoc.exists) {
      await db.collection('deleted_workspaces').doc(id).set({
        ...wsDoc.data(),
        status: 'deleted',
        statusReason: reason || '',
        deletedAt: new Date(),
        deletedBy: req.admin.id,
      });
    }

    // Actually delete the document so it disappears from the Flutter app
    await db.collection(COLLECTIONS.SPACES).doc(id).delete();

    res.json({ success: true, message: 'Workspace deleted successfully' });
  } catch (error) {
    console.error('Delete workspace error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
