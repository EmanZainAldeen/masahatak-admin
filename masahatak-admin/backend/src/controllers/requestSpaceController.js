const { db } = require('../config/firebase');

const COLLECTION = 'spaceRequests'; // Flutter app saves here

// Get all space requests
exports.getAllRequests = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'all' } = req.query;

    const snapshot = await db.collection(COLLECTION).get();
    let requests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt || null,
    }));

    // Filter by status
    if (status !== 'all') {
      requests = requests.filter(r => (r.status || 'pending') === status);
    }

    // Sort newest first
    requests.sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const db2 = b.createdAt ? new Date(b.createdAt) : new Date(0);
      return db2 - da;
    });

    const total = requests.length;
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const paginated = requests.slice(startIndex, startIndex + parseInt(limit));

    res.json({
      success: true,
      requests: paginated,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get single request
exports.getRequestById = async (req, res) => {
  try {
    const doc = await db.collection(COLLECTION).doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Request not found' });
    res.json({ success: true, request: { id: doc.id, ...doc.data() } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Update request status (approve / reject)
exports.updateRequestStatus = async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const docRef = db.collection(COLLECTION).doc(req.params.id);
    await docRef.update({
      status,
      adminNote: adminNote || '',
      reviewedAt: new Date(),
      reviewedBy: req.admin?.id || 'admin',
    });

    res.json({ success: true, message: `Request ${status}` });
  } catch (error) {
    console.error('Update request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Approve request → create workspace in workspaces collection
exports.approveRequest = async (req, res) => {
  try {
    const doc = await db.collection(COLLECTION).doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Request not found' });

    const r = doc.data();

    // Map spaceRequests fields → workspaces fields
    const workspace = {
      spaceName: r.nameSpace || '',
      name: r.nameSpace || '',
      address: r.locationDes || '',
      description: r.descriptionSpace || '',
      basePriceValue: parseFloat(r.pricePerDay) || 0,
      basePriceUnit: 'day',
      totalSeats: parseInt(r.capacity) || 0,
      availableSeats: parseInt(r.capacity) || 0,
      workingHours: r.workingHours ? [{ day: 'all', hours: r.workingHours }] : [],
      amenities: [],
      images: [],
      hidden: false,
      status: 'active',
      contactName: r.contactName || '',
      phoneNo: r.phoneNo || '',
      whatsAppNo: r.whatsAppNo || '',
      sourceRequestId: doc.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req.admin?.id || 'admin',
    };

    const wsRef = await db.collection('workspaces').add(workspace);

    // Mark request as approved
    await db.collection(COLLECTION).doc(req.params.id).update({
      status: 'approved',
      approvedWorkspaceId: wsRef.id,
      reviewedAt: new Date(),
      reviewedBy: req.admin?.id || 'admin',
    });

    res.json({ success: true, workspaceId: wsRef.id });
  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete request
exports.deleteRequest = async (req, res) => {
  try {
    await db.collection(COLLECTION).doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
