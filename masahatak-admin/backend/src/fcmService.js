const { admin, db, messaging } = require('./firebaseAdmin');

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function getUserTokens(uid) {
  const usersDocRef = db.collection('users').doc(uid);
  const usersDocSnap = await usersDocRef.get();

  const userTokens = usersDocSnap.exists && Array.isArray(usersDocSnap.get('fcmTokens'))
    ? usersDocSnap.get('fcmTokens')
    : [];

  const userDevicesSnap = await db
    .collection('user_devices')
    .where('uid', '==', uid)
    .where('isActive', '==', true)
    .get();

  const deviceTokens = [];
  userDevicesSnap.forEach((doc) => {
    const token = doc.get('token');
    if (typeof token === 'string' && token.trim()) {
      deviceTokens.push(token);
    }
  });

  const allTokens = [...new Set([...userTokens, ...deviceTokens])].filter(Boolean);

  return {
    usersDocRef,
    allTokens,
  };
}

async function cleanupInvalidTokens(uid, usersDocRef, invalidTokens) {
  if (!invalidTokens.length) {
    return;
  }

  await usersDocRef.set(
    {
      fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens),
      fcmTokenUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const batch = db.batch();
  invalidTokens.forEach((token) => {
    const deviceDocRef = db.collection('user_devices').doc(`${uid}_${token}`);
    batch.set(
      deviceDocRef,
      {
        uid,
        token,
        isActive: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });

  await batch.commit();
}

async function sendPushToUser({ uid, title, body, data = {} }) {
  if (!uid || !title || !body) {
    throw new Error('uid, title, and body are required');
  }

  const { usersDocRef, allTokens } = await getUserTokens(uid);

  if (!allTokens.length) {
    return {
      success: false,
      reason: 'NO_TOKENS',
      sentCount: 0,
      failureCount: 0,
    };
  }

  const tokenChunks = chunkArray(allTokens, 500);
  let sentCount = 0;
  let failureCount = 0;
  const invalidTokens = [];

  for (const tokens of tokenChunks) {
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data || {}).map(([key, value]) => [key, String(value)])
      ),
    });

    sentCount += response.successCount;
    failureCount += response.failureCount;

    response.responses.forEach((result, idx) => {
      if (result.success) {
        return;
      }

      const errorCode = result.error?.code;
      if (errorCode === 'messaging/registration-token-not-registered') {
        invalidTokens.push(tokens[idx]);
      }
    });
  }

  await cleanupInvalidTokens(uid, usersDocRef, [...new Set(invalidTokens)]);

  return {
    success: sentCount > 0,
    sentCount,
    failureCount,
    invalidTokensRemoved: [...new Set(invalidTokens)].length,
  };
}

module.exports = {
  sendPushToUser,
};
