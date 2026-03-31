const { db, COLLECTIONS } = require('../config/firebase');

// Get all bookings
exports.getAllBookings = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'all', startDate, endDate } = req.query;

    const snapshot = await db.collection('bookings').orderBy('createdAt', 'desc').get();
    let bookings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    if (status !== 'all') {
      bookings = bookings.filter(booking => booking.status === status);
    }


    if (startDate || endDate) {
      bookings = bookings.filter(booking => {
        const bookingDate = booking.startDate?.toDate?.() || new Date(booking.startDate);
        if (startDate && bookingDate < new Date(startDate)) return false;
        if (endDate && bookingDate > new Date(endDate)) return false;
        return true;
      });
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedBookings = bookings.slice(startIndex, endIndex);

    // Enrich with user and workspace data
    const enrichedBookings = await Promise.all(
      paginatedBookings.map(async (booking) => {
        const [userDoc, workspaceDoc] = await Promise.all([
          db.collection('users').doc(booking.userId).get(),
          db.collection(COLLECTIONS.SPACES).doc(booking.workspaceId).get()
        ]);

        return {
          ...booking,
          user: userDoc.exists ? {
            id: userDoc.id,
            fullName: userDoc.data().fullName,
            email: userDoc.data().email
          } : null,
          workspace: workspaceDoc.exists ? {
            id: workspaceDoc.id,
            spaceName: workspaceDoc.data().spaceName,
            location: workspaceDoc.data().location
          } : null
        };
      })
    );

    res.json({
      success: true,
      bookings: enrichedBookings,
      pagination: {
        total: bookings.length,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(bookings.length / limit)
      }
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get booking by ID
exports.getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    const bookingDoc = await db.collection('bookings').doc(id).get();

    if (!bookingDoc.exists) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingDoc.data();

    // Get related data
    const [userDoc, workspaceDoc, paymentDoc] = await Promise.all([
      db.collection('users').doc(booking.userId).get(),
      db.collection(COLLECTIONS.SPACES).doc(booking.workspaceId).get(),
      db.collection('payments').where('bookingId', '==', id).limit(1).get()
    ]);

    res.json({
      success: true,
      booking: {
        id: bookingDoc.id,
        ...booking,
        user: userDoc.exists ? {
          id: userDoc.id,
          ...userDoc.data()
        } : null,
        workspace: workspaceDoc.exists ? {
          id: workspaceDoc.id,
          ...workspaceDoc.data()
        } : null,
        payment: !paymentDoc.empty ? {
          id: paymentDoc.docs[0].id,
          ...paymentDoc.docs[0].data()
        } : null
      }
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Cancel booking
exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await db.collection('bookings').doc(id).update({
      status: 'cancelled',
      cancellationReason: reason || 'Cancelled by admin',
      cancelledBy: req.admin.id,
      cancelledAt: new Date()
    });

    res.json({
      success: true,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
