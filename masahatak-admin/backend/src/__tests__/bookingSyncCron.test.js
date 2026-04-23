const test = require('node:test');
const assert = require('node:assert/strict');

const {
  resolveStartAt,
  resolveEndAt,
  resolveParticipantIds,
  shouldSendReminder,
  shouldSendByPreferences,
  runBookingSyncTick,
} = require('../bookingSyncCron');

function ts(ms) {
  return { toMillis: () => ms };
}

function prefDoc(data, exists = true) {
  return {
    exists,
    data: () => data,
  };
}

function makeFakeDeps({ bookings = [], preferenceByUid = {}, pushByUid = {} }) {
  const updates = [];
  const notifications = [];
  const sentPushes = [];

  const bookingDocs = bookings.map((booking, idx) => ({
    id: booking.bookingId || `b-${idx}`,
    data: () => booking,
    ref: {
      update: async (payload) => {
        updates.push({ id: booking.bookingId || `b-${idx}`, payload });
      },
    },
  }));

  const fakeDb = {
    collection: (name) => {
      if (name === 'bookings') {
        return {
          where: () => ({
            get: async () => ({ docs: bookingDocs }),
          }),
        };
      }

      if (name === 'users') {
        return {
          doc: (uid) => ({
            collection: (sub) => {
              assert.equal(sub, 'settings');
              return {
                doc: (docId) => {
                  assert.equal(docId, 'notifications');
                  return {
                    get: async () => {
                      if (!(uid in preferenceByUid)) return prefDoc({}, false);
                      return prefDoc(preferenceByUid[uid], true);
                    },
                  };
                },
              };
            },
          }),
        };
      }

      if (name === 'notifications') {
        return {
          add: async (payload) => {
            notifications.push(payload);
          },
        };
      }

      throw new Error(`Unexpected collection: ${name}`);
    },
  };

  const fakeAdmin = {
    firestore: {
      FieldValue: {
        serverTimestamp: () => '__SERVER_TIMESTAMP__',
      },
    },
  };

  const fakeSendPushToUser = async ({ uid, title, body, data }) => {
    sentPushes.push({ uid, title, body, data });
    if (pushByUid[uid] === 'NO_TOKENS') {
      return { success: false, reason: 'NO_TOKENS', sentCount: 0 };
    }

    return { success: true, sentCount: 1 };
  };

  const fakeLogger = {
    info: () => {},
    warn: () => {},
    error: () => {},
  };

  return {
    deps: {
      db: fakeDb,
      admin: fakeAdmin,
      sendPushToUser: fakeSendPushToUser,
      logger: fakeLogger,
    },
    updates,
    notifications,
    sentPushes,
  };
}

test('resolveStartAt/resolveEndAt support startDate/endDate and legacy startTime/endTime', () => {
  assert.equal(resolveStartAt({ startDate: ts(1000) }), 1000);
  assert.equal(resolveStartAt({ startTime: ts(2000) }), 2000);
  assert.equal(resolveEndAt({ endDate: ts(3000) }), 3000);
  assert.equal(resolveEndAt({ endTime: ts(4000) }), 4000);
});

test('resolveParticipantIds returns unique ids with all fallbacks', () => {
  const ids = resolveParticipantIds({
    userId: 'u1',
    ownerId: 'u2',
    adminId: 'u2',
    space: { adminId: 'u3' },
  });

  assert.deepEqual(ids.sort(), ['u1', 'u2', 'u3']);
});

test('shouldSendReminder honors boundaries and timing presets', () => {
  const now = Date.UTC(2026, 0, 1, 10, 0, 0);

  assert.equal(shouldSendReminder({ status: 'confirmed', reminderSent: false, reminderTiming: 0, startDate: ts(now + 30 * 60 * 1000) }, now), true);
  assert.equal(shouldSendReminder({ status: 'confirmed', reminderSent: false, reminderTiming: 0, startDate: ts(now + 30 * 60 * 1000 + 1) }, now), false);

  assert.equal(shouldSendReminder({ status: 'confirmed', reminderSent: false, reminderTiming: 1, startDate: ts(now + 59 * 60 * 1000) }, now), true);
  assert.equal(shouldSendReminder({ status: 'confirmed', reminderSent: false, reminderTiming: 1, startDate: ts(now + 61 * 60 * 1000) }, now), false);

  const sameDay = Date.UTC(2026, 0, 1, 19, 0, 0);
  const nextDay = Date.UTC(2026, 0, 2, 1, 0, 0);
  assert.equal(shouldSendReminder({ status: 'confirmed', reminderSent: false, reminderTiming: 2, startDate: ts(sameDay) }, now, 'UTC'), true);
  assert.equal(shouldSendReminder({ status: 'confirmed', reminderSent: false, reminderTiming: 2, startDate: ts(nextDay) }, now, 'UTC'), false);
});

test('preference gating disables explicit false flags and defaults true only when doc is missing', () => {
  assert.equal(shouldSendByPreferences(prefDoc({}, false), 'reminder'), true);
  assert.equal(shouldSendByPreferences(prefDoc({ enable_notifications: false }), 'reminder'), false);
  assert.equal(shouldSendByPreferences(prefDoc({ enable_notifications: true, booking_notifications: false }), 'reminder'), false);
  assert.equal(shouldSendByPreferences(prefDoc({ enable_notifications: true, booking_notifications: true, bookingReminder: false }), 'reminder'), false);
});

test('lifecycle transitions confirmed->active and active->completed', async () => {
  const now = Date.UTC(2026, 0, 1, 10, 0, 0);
  const { deps, updates } = makeFakeDeps({
    bookings: [
      { bookingId: 'b1', status: 'confirmed', startDate: ts(now - 1000), userId: 'u1', adminId: 'a1', spaceName: 'S1' },
      { bookingId: 'b2', status: 'active', endDate: ts(now - 1000), userId: 'u2', adminId: 'a2', spaceName: 'S2' },
    ],
  });

  const stats = await runBookingSyncTick({ ...deps, nowMs: now, timeZone: 'UTC' });

  assert.equal(stats.transitioned, 2);
  assert.equal(updates.some((u) => u.id === 'b1' && u.payload.status === 'active'), true);
  assert.equal(updates.some((u) => u.id === 'b2' && u.payload.status === 'completed'), true);
});

test('integration: reminder sends once, skips disabled user and no-token user', async () => {
  const now = Date.UTC(2026, 0, 1, 10, 0, 0);
  const { deps, updates, sentPushes, notifications } = makeFakeDeps({
    bookings: [
      {
        bookingId: 'b3',
        status: 'confirmed',
        startDate: ts(now + 20 * 60 * 1000),
        reminderSent: false,
        userId: 'u-enabled',
        adminId: 'u-disabled',
        space: { adminId: 'u-notokens' },
        spaceName: 'Meeting Room',
      },
    ],
    preferenceByUid: {
      'u-enabled': { enable_notifications: true, booking_notifications: true, bookingReminder: true, reminderTiming: 0 },
      'u-disabled': { enable_notifications: true, booking_notifications: true, bookingReminder: false, reminderTiming: 0 },
      'u-notokens': { enable_notifications: true, booking_notifications: true, bookingReminder: true, reminderTiming: 0 },
    },
    pushByUid: {
      'u-notokens': 'NO_TOKENS',
    },
  });

  const stats = await runBookingSyncTick({ ...deps, nowMs: now, timeZone: 'UTC' });

  assert.equal(stats.remindersSent, 1);
  assert.equal(updates.some((u) => u.id === 'b3' && u.payload.reminderSent === true), true);
  assert.equal(sentPushes.some((p) => p.uid === 'u-enabled'), true);
  assert.equal(sentPushes.some((p) => p.uid === 'u-disabled'), false);
  assert.equal(sentPushes.some((p) => p.uid === 'u-notokens'), true);
  assert.equal(notifications.length, 3);
});
