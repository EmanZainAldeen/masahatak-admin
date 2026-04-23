const TZ = process.env.BOOKING_TIMEZONE || 'Asia/Gaza';


function getDefaultDeps() {
  const { admin, db } = require('./firebaseAdmin');
  const { sendPushToUser } = require('./fcmService');
  return { admin, db, sendPushToUser };
}

function asMillis(value) {
  if (!value) return null;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.toDate === 'function') {
    const date = value.toDate();
    return Number.isFinite(date?.getTime?.()) ? date.getTime() : null;
  }
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function resolveStartAt(booking) {
  return asMillis(booking?.startDate ?? booking?.startTime);
}

function resolveEndAt(booking) {
  return asMillis(booking?.endDate ?? booking?.endTime);
}

function resolveParticipantIds(booking) {
  return [...new Set([
    booking?.userId,
    booking?.ownerId,
    booking?.adminId,
    booking?.space?.adminId,
  ].filter(Boolean))];
}

function resolveReminderWindowMs(reminderTiming) {
  if (reminderTiming === 1) return 60 * 60 * 1000;
  if (reminderTiming === 2) return 24 * 60 * 60 * 1000;
  return 30 * 60 * 1000;
}

function isSameDayInTimezone(aMs, bMs, timeZone = TZ) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(new Date(aMs)) === formatter.format(new Date(bMs));
}

function shouldSendReminder(booking, nowMs, timeZone = TZ) {
  if (!booking || booking.status !== 'confirmed' || booking.reminderSent) return false;

  const startAt = resolveStartAt(booking);
  if (!startAt) return false;

  const diff = startAt - nowMs;
  if (diff < 0) return false;

  const reminderTiming = Number.isInteger(booking.reminderTiming)
    ? booking.reminderTiming
    : 0;

  if (reminderTiming === 2) {
    return isSameDayInTimezone(startAt, nowMs, timeZone);
  }

  const windowMs = resolveReminderWindowMs(reminderTiming);
  return diff <= windowMs;
}

function normalizeEventType(eventType) {
  const map = {
    bookingApproved: 'bookingApproved',
    approved: 'bookingApproved',
    bookingRejected: 'bookingRejected',
    rejected: 'bookingRejected',
    reminder: 'reminder',
    bookingReminder: 'reminder',
    offerSuggestion: 'offerSuggestion',
    offer: 'offerSuggestion',
    tip: 'tip',
  };

  return map[eventType] || 'tip';
}

function shouldSendByPreferences(preferencesDoc, eventType) {
  if (!preferencesDoc?.exists) {
    return true;
  }

  const prefs = preferencesDoc.data() || {};
  if (prefs.enable_notifications === false) return false;

  const normalizedEvent = normalizeEventType(eventType);
  if (normalizedEvent === 'tip') return prefs.booking_notifications !== false;

  if (normalizedEvent === 'reminder') {
    return prefs.booking_notifications !== false && prefs.bookingReminder !== false;
  }

  if (normalizedEvent === 'bookingApproved') {
    return prefs.booking_notifications !== false && prefs.bookingApproved !== false;
  }

  if (normalizedEvent === 'bookingRejected') {
    return prefs.booking_notifications !== false && prefs.bookingRejected !== false;
  }

  if (normalizedEvent === 'offerSuggestion') {
    return prefs.offerSuggestion !== false;
  }

  return prefs.booking_notifications !== false;
}

function getReminderTiming(preferencesDoc) {
  if (!preferencesDoc?.exists) {
    return 0;
  }

  const value = preferencesDoc.data()?.reminderTiming;
  return Number.isInteger(value) && [0, 1, 2].includes(value) ? value : 0;
}

async function sendBookingNotification({
  booking,
  bookingId,
  userIds,
  eventType,
  title,
  body,
  deps,
}) {
  const normalizedEvent = normalizeEventType(eventType);
  const notificationsCollection = deps.db.collection('notifications');

  let sentCount = 0;
  let skippedDisabled = 0;
  let skippedNoTokens = 0;

  for (const uid of userIds) {
    try {
      const prefDoc = await deps.db
        .collection('users')
        .doc(uid)
        .collection('settings')
        .doc('notifications')
        .get();

      const allowPush = shouldSendByPreferences(prefDoc, normalizedEvent);

      await notificationsCollection.add({
        userId: uid,
        recipientType: 'user',
        bookingId,
        title,
        body,
        message: body,
        type: normalizedEvent,
        eventType: normalizedEvent,
        isRead: false,
        fcmRequested: allowPush,
        createdAt: deps.admin.firestore.FieldValue.serverTimestamp(),
      });

      if (!allowPush) {
        skippedDisabled += 1;
        continue;
      }

      const pushResult = await deps.sendPushToUser({
        uid,
        title,
        body,
        data: {
          type: 'booking',
          bookingId,
          eventType: normalizedEvent,
          status: booking.status,
        },
      });

      if (pushResult?.reason === 'NO_TOKENS' || pushResult?.sentCount === 0) {
        skippedNoTokens += 1;
        continue;
      }

      sentCount += 1;
    } catch (error) {
      deps.logger.warn('[bookingSyncCron] notification-user-error', {
        bookingId,
        uid,
        eventType: normalizedEvent,
        error: error.message,
      });
    }
  }

  return { sentCount, skippedDisabled, skippedNoTokens };
}

async function runBookingSyncTick(deps = {}) {
  const runtime = {
    admin: deps.admin || getDefaultDeps().admin,
    db: deps.db || getDefaultDeps().db,
    sendPushToUser: deps.sendPushToUser || getDefaultDeps().sendPushToUser,
    logger: deps.logger || console,
    nowMs: deps.nowMs || Date.now(),
    timeZone: deps.timeZone || TZ,
  };

  const stats = {
    processed: 0,
    skipped: 0,
    transitioned: 0,
    remindersSent: 0,
    errors: 0,
    notificationsDisabled: 0,
    noTokens: 0,
  };

  const bookingSnap = await runtime.db
    .collection('bookings')
    .where('status', 'in', ['confirmed', 'active'])
    .get();

  for (const doc of bookingSnap.docs) {
    stats.processed += 1;
    const booking = doc.data() || {};
    const bookingId = booking.bookingId || doc.id;

    try {
      const startAt = resolveStartAt(booking);
      const endAt = resolveEndAt(booking);
      const participantIds = resolveParticipantIds(booking);

      if (!participantIds.length) {
        stats.skipped += 1;
        runtime.logger.warn('[bookingSyncCron] invalid-target-user', { bookingId });
        continue;
      }

      if (booking.status === 'confirmed') {
        if (!startAt) {
          stats.skipped += 1;
          runtime.logger.warn('[bookingSyncCron] invalid-booking-time', {
            bookingId,
            status: booking.status,
            startAt,
          });
          continue;
        }

        if (runtime.nowMs >= startAt) {
          await doc.ref.update({
            status: 'active',
            updatedAt: runtime.admin.firestore.FieldValue.serverTimestamp(),
          });

          stats.transitioned += 1;
          const notifyRes = await sendBookingNotification({
            booking: { ...booking, status: 'active' },
            bookingId,
            userIds: participantIds,
            eventType: 'tip',
            title: 'Booking Started',
            body: `Booking ${booking.spaceName || bookingId} is now active.`,
            deps: runtime,
          });
          stats.notificationsDisabled += notifyRes.skippedDisabled;
          stats.noTokens += notifyRes.skippedNoTokens;
        } else {
          const reminderTimingDocs = await Promise.all(
            participantIds.map((uid) => runtime.db
              .collection('users')
              .doc(uid)
              .collection('settings')
              .doc('notifications')
              .get()
              .catch(() => null))
          );

          const maxTiming = reminderTimingDocs.reduce((max, prefDoc) => {
            const timing = getReminderTiming(prefDoc);
            return Math.max(max, timing);
          }, 0);

          const reminderCandidate = { ...booking, reminderTiming: maxTiming };
          if (shouldSendReminder(reminderCandidate, runtime.nowMs, runtime.timeZone)) {
            const notifyRes = await sendBookingNotification({
              booking,
              bookingId,
              userIds: participantIds,
              eventType: 'reminder',
              title: 'Booking Reminder',
              body: `Reminder: your booking starts at ${new Date(startAt).toISOString()}.`,
              deps: runtime,
            });

            await doc.ref.update({
              reminderSent: true,
              reminderSentAt: runtime.admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: runtime.admin.firestore.FieldValue.serverTimestamp(),
            });

            stats.remindersSent += 1;
            stats.notificationsDisabled += notifyRes.skippedDisabled;
            stats.noTokens += notifyRes.skippedNoTokens;
          }
        }
      }

      if (booking.status === 'active') {
        if (!endAt) {
          stats.skipped += 1;
          runtime.logger.warn('[bookingSyncCron] invalid-booking-time', {
            bookingId,
            status: booking.status,
            endAt,
          });
          continue;
        }

        if (runtime.nowMs >= endAt) {
          await doc.ref.update({
            status: 'completed',
            updatedAt: runtime.admin.firestore.FieldValue.serverTimestamp(),
          });

          stats.transitioned += 1;
          const notifyRes = await sendBookingNotification({
            booking: { ...booking, status: 'completed' },
            bookingId,
            userIds: participantIds,
            eventType: 'tip',
            title: 'Booking Completed',
            body: `Booking ${booking.spaceName || bookingId} has been completed.`,
            deps: runtime,
          });
          stats.notificationsDisabled += notifyRes.skippedDisabled;
          stats.noTokens += notifyRes.skippedNoTokens;
        }
      }
    } catch (error) {
      stats.errors += 1;
      runtime.logger.error('[bookingSyncCron] booking-error', {
        bookingId,
        error: error.message,
      });
    }
  }

  runtime.logger.info('[bookingSyncCron] tick-summary', stats);
  return stats;
}

function startBookingSyncCron(deps = {}) {
  const cron = require('node-cron');
  return cron.schedule('*/2 * * * *', async () => {
    try {
      await runBookingSyncTick(deps);
    } catch (error) {
      const logger = deps.logger || console;
      logger.error('[bookingSyncCron] fatal-error', error);
    }
  });
}

module.exports = {
  asMillis,
  resolveStartAt,
  resolveEndAt,
  resolveParticipantIds,
  resolveReminderWindowMs,
  shouldSendReminder,
  shouldSendByPreferences,
  normalizeEventType,
  sendBookingNotification,
  runBookingSyncTick,
  startBookingSyncCron,
};
