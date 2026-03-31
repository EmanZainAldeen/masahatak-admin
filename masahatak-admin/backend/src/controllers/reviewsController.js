const { db, COLLECTIONS } = require('../config/firebase');

// Get all reviews
exports.getAllReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'all', rating, minRating, maxRating } = req.query;

    let query = db.collection('reviews');

    if (status !== 'all') {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();
    let reviews = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    if (status === 'all') {
      reviews = reviews.filter(review => review.status !== 'deleted');
    }


    if (rating && rating !== 'all') {
      reviews = reviews.filter(review => review.rating === parseInt(rating));
    }
    if (minRating) {
      reviews = reviews.filter(review => review.rating >= parseInt(minRating));
    }
    if (maxRating) {
      reviews = reviews.filter(review => review.rating <= parseInt(maxRating));
    }

    // Enrich with user and workspace data
    const enrichedReviews = await Promise.all(
      reviews.map(async (review) => {
        const [userDoc, workspaceDoc] = await Promise.all([
          db.collection('users').doc(review.userId).get(),
          db.collection(COLLECTIONS.SPACES).doc(review.workspaceId).get()
        ]);

        return {
          ...review,
          user: userDoc.exists ? {
            id: userDoc.id,
            fullName: userDoc.data().fullName,
            email: userDoc.data().email
          } : null,
          workspace: workspaceDoc.exists ? {
            id: workspaceDoc.id,
            spaceName: workspaceDoc.data().spaceName
          } : null
        };
      })
    );

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedReviews = enrichedReviews.slice(startIndex, endIndex);

    res.json({
      success: true,
      reviews: paginatedReviews,
      pagination: {
        total: enrichedReviews.length,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(enrichedReviews.length / limit)
      }
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete review (content moderation)
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await db.collection('reviews').doc(id).update({
      status: 'deleted',
      deletionReason: reason || 'Content violation',
      deletedAt: new Date(),
      deletedBy: req.admin.id
    });

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Flag review
exports.flagReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { flag, reason } = req.body;

    await db.collection('reviews').doc(id).update({
      flagged: flag,
      flagReason: reason || '',
      flaggedAt: flag ? new Date() : null,
      flaggedBy: flag ? req.admin.id : null
    });

    res.json({
      success: true,
      message: flag ? 'Review flagged successfully' : 'Review unflagged successfully'
    });
  } catch (error) {
    console.error('Flag review error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
