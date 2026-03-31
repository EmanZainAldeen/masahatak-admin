const { db, COLLECTIONS } = require('../config/firebase');

// Get owner profile
exports.getOwnerProfile = async (req, res) => {
  try {
    const ownerDoc = await db.collection('providers').doc(req.params.ownerId).get();

    if (!ownerDoc.exists) {
      return res.status(404).json({ error: 'Owner not found' });
    }

    res.json({
      success: true,
      owner: {
        id: ownerDoc.id,
        ...ownerDoc.data()
      }
    });
  } catch (error) {
    console.error('Get owner profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update owner profile
exports.updateOwnerProfile = async (req, res) => {
  try {
    const { ownerId } = req.params;
    const { businessName, contactEmail, contactPhone, businessLicense } = req.body;

    const ownerDoc = await db.collection('providers').doc(ownerId).get();

    if (!ownerDoc.exists) {
      return res.status(404).json({ error: 'Owner not found' });
    }

    await db.collection('providers').doc(ownerId).update({
      businessName,
      contactEmail,
      contactPhone,
      businessLicense,
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Owner profile updated successfully'
    });
  } catch (error) {
    console.error('Update owner profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Create space (owner creates a new workspace)
exports.createSpace = async (req, res) => {
  try {
    const { name, city, location, amenities, pricing, images, description } = req.body;

    const spaceRef = await db.collection(COLLECTIONS.SPACES).add({
      spaceName: name,
      city,
      location,
      amenities: amenities || [],
      pricing,
      images: images || [],
      description,
      status: 'pending', // Admin approval required
      providerId: req.body.providerId,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.json({
      success: true,
      spaceId: spaceRef.id,
      message: 'Space created successfully, pending admin approval'
    });
  } catch (error) {
    console.error('Create space error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// List owner spaces
exports.listOwnerSpaces = async (req, res) => {
  try {
    const { ownerId } = req.params;
    const { page = 1, limit = 20, status } = req.query;

    // Get all workspaces for this owner
    const snapshot = await db.collection(COLLECTIONS.SPACES)
      .where('providerId', '==', ownerId)
      .get();

    let spaces = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filter by status on client side if needed
    if (status) {
      spaces = spaces.filter(space => space.status === status);
    }

    // Sort by createdAt on client side
    spaces.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
      return dateB - dateA;
    });

    const total = spaces.length;

    // Apply pagination on client side
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedSpaces = spaces.slice(startIndex, endIndex);

    res.json({
      success: true,
      spaces: paginatedSpaces,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('List owner spaces error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update space
exports.updateSpace = async (req, res) => {
  try {
    const { spaceId } = req.params;
    const spaceFields = req.body;

    const spaceDoc = await db.collection(COLLECTIONS.SPACES).doc(spaceId).get();

    if (!spaceDoc.exists) {
      return res.status(404).json({ error: 'Space not found' });
    }

    await db.collection(COLLECTIONS.SPACES).doc(spaceId).update({
      ...spaceFields,
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Space updated successfully'
    });
  } catch (error) {
    console.error('Update space error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete space
exports.deleteSpace = async (req, res) => {
  try {
    const { spaceId } = req.params;

    const spaceDoc = await db.collection(COLLECTIONS.SPACES).doc(spaceId).get();

    if (!spaceDoc.exists) {
      return res.status(404).json({ error: 'Space not found' });
    }

    await db.collection(COLLECTIONS.SPACES).doc(spaceId).delete();

    res.json({
      success: true,
      message: 'Space deleted successfully'
    });
  } catch (error) {
    console.error('Delete space error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Block dates for a space
exports.blockDates = async (req, res) => {
  try {
    const { spaceId } = req.params;
    const { startDate, endDate } = req.body;

    const spaceDoc = await db.collection(COLLECTIONS.SPACES).doc(spaceId).get();

    if (!spaceDoc.exists) {
      return res.status(404).json({ error: 'Space not found' });
    }

    const blockRef = await db.collection(COLLECTIONS.SPACES).doc(spaceId)
      .collection('blocks').add({
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        createdAt: new Date()
      });

    res.json({
      success: true,
      blockId: blockRef.id,
      message: 'Dates blocked successfully'
    });
  } catch (error) {
    console.error('Block dates error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Remove block
exports.removeBlock = async (req, res) => {
  try {
    const { spaceId, blockId } = req.params;

    await db.collection(COLLECTIONS.SPACES).doc(spaceId)
      .collection('blocks').doc(blockId).delete();

    res.json({
      success: true,
      message: 'Block removed successfully'
    });
  } catch (error) {
    console.error('Remove block error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// List owner bookings
exports.listOwnerBookings = async (req, res) => {
  try {
    const { ownerId } = req.params;
    const { page = 1, limit = 20, status } = req.query;

    // Get all bookings for this owner
    const snapshot = await db.collection('bookings')
      .where('providerId', '==', ownerId)
      .get();

    let bookings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filter by status on client side if needed
    if (status) {
      bookings = bookings.filter(booking => booking.status === status);
    }

    // Sort by createdAt on client side
    bookings.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
      return dateB - dateA;
    });

    const total = bookings.length;

    // Apply pagination on client side
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedBookings = bookings.slice(startIndex, endIndex);

    res.json({
      success: true,
      bookings: paginatedBookings,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('List owner bookings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// List assistants (sub_admins) linked to this owner's spaces
exports.listOwnerAssistants = async (req, res) => {
  try {
    const { ownerId } = req.params;

    // Get all spaces belonging to this owner
    const spacesSnap = await db.collection(COLLECTIONS.SPACES)
      .where('providerId', '==', ownerId)
      .get();

    // Also check createdBy field for admin-created spaces
    const spacesSnap2 = await db.collection(COLLECTIONS.SPACES)
      .where('adminId', '!=', null)
      .get();

    // Collect all adminIds from owner's spaces
    const adminIds = new Set();
    spacesSnap.docs.forEach(doc => {
      const adminId = doc.data().adminId;
      if (adminId) adminIds.add(adminId);
    });

    if (adminIds.size === 0) {
      return res.json({ success: true, assistants: [] });
    }

    // Fetch sub_admin users with those IDs
    const assistants = [];
    for (const uid of adminIds) {
      try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists && userDoc.data().role === 'sub_admin') {
          assistants.push({
            id: userDoc.id,
            fullName: userDoc.data().fullName || userDoc.data().full_name || 'Unknown',
            email: userDoc.data().email || '',
            status: userDoc.data().status || 'active',
          });
        }
      } catch (_) {}
    }

    res.json({ success: true, assistants });
  } catch (error) {
    console.error('List owner assistants error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
