const { db } = require('../config/firebase');

const COLLECTION = 'requestAddSpace';

// Get all space requests
exports.getAllRequests = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'all' } = req.query;

    let query = db.collection(COLLECTION).orderBy('createdAt', 'desc');

    if (status !== 'all') {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.get();
    let requests = snapshot.docs.map(doc => ({
      idRequset: doc.id,
      ...doc.data()
    }));

    const total = requests.length;
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const paginated = requests.slice(startIndex, startIndex + parseInt(limit));

    res.json({
      success: true,
      requests: paginated,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
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

    res.json({ success: true, request: { idRequset: doc.id, ...doc.data() } });
  } catch (error) {
    console.error('Get request error:', error);
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

    await db.collection(COLLECTION).doc(req.params.id).update({
      status,
      adminNote: adminNote || '',
      reviewedAt: new Date().toISOString(),
      reviewedBy: req.user?.userId || 'admin'
    });

    res.json({ success: true, message: `Request ${status}` });
  } catch (error) {
    console.error('Update request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete request
exports.deleteRequest = async (req, res) => {
  try {
    await db.collection(COLLECTION).doc(req.params.id).delete();
    res.json({ success: true, message: 'Request deleted' });
  } catch (error) {
    console.error('Delete request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
