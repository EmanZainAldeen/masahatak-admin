const cron = require('node-cron');
const { admin, db } = require('./firebaseAdmin');
const { sendPushToUser } = require('./fcmService');

async function transitionConfirmedToActive(now) {
  const snap = await db
    .collection('bookings')
    .where('status', '==', 'confirmed')
    .where('startAt', '<=', now)
    .get();

  if (snap.empty) {
    return 0;
  }

  const batch = db.batch();
  const jobs = [];

  snap.forEach((doc) => {
    const booking = doc.data();
    batch.update(doc.ref, {
      status: 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (booking.userId) {
      jobs.push(
        sendPushToUser({
          uid: booking.userId,
          title: 'Booking Started',
          body: 'Your booking status is now active.',
          data: {
            bookingId: doc.id,
            status: 'active',
          },
        }).catch((error) => {
          console.error(`Push failed for booking ${doc.id}:`, error.message);
        })
      );
    }
  });

  await batch.commit();
  await Promise.all(jobs);

  return snap.size;
}

async function transitionActiveToCompleted(now) {
  const snap = await db
    .collection('bookings')
    .where('status', '==', 'active')
    .where('endAt', '<=', now)
    .get();

  if (snap.empty) {
    return 0;
  }

  const batch = db.batch();
  const jobs = [];

  snap.forEach((doc) => {
    const booking = doc.data();
    batch.update(doc.ref, {
      status: 'completed',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (booking.userId) {
      jobs.push(
        sendPushToUser({
          uid: booking.userId,
          title: 'Booking Completed',
          body: 'Your booking status is now completed.',
          data: {
            bookingId: doc.id,
            status: 'completed',
          },
        }).catch((error) => {
          console.error(`Push failed for booking ${doc.id}:`, error.message);
        })
      );
    }
  });

  await batch.commit();
  await Promise.all(jobs);

  return snap.size;
}

function startBookingSyncCron() {
  const task = cron.schedule('*/2 * * * *', async () => {
    const now = new Date();

    try {
      const activatedCount = await transitionConfirmedToActive(now);
      const completedCount = await transitionActiveToCompleted(now);

      if (activatedCount || completedCount) {
        console.log(
          `[bookingSyncCron] ${now.toISOString()} activated=${activatedCount} completed=${completedCount}`
        );
      }
    } catch (error) {
      console.error('[bookingSyncCron] error:', error);
    }
  });

  return task;
}

module.exports = {
  startBookingSyncCron,
};
